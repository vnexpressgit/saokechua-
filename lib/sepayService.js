import { supabase } from './supabaseClient.js';
import {
  smartCategorizeTransaction,
  normalizeSePayDateForDb,
  formatSePayDateTime,
  cleanBankingPrefix,
} from './aiCategorizer.js';

export { formatSePayDateTime, normalizeSePayDateForDb, smartCategorizeTransaction };

/**
 * Hàm phân loại thông minh (Auto-Categorization)
 * @param {string} content - Nội dung giao dịch
 * @param {string} type - 'IN' | 'OUT'
 * @param {Array} categories - Danh sách danh mục từ Supabase
 * @returns {Promise<string|null>} - ID của danh mục phù hợp nhất
 */
export async function autoCategorizeTransaction(content, type, categories = []) {
  const result = await smartCategorizeTransaction(content, type, categories);
  return result.categoryId;
}

/**
 * Đồng bộ toàn bộ giao dịch từ SePay API vào Supabase
 * Đảm bảo CHỐNG NHÂN BẢN TUYỆT ĐỐI (Strict Deduplication & Reconciliation)
 * Dữ liệu trong database sẽ khớp chính xác 1-1 với API SePay trả ra.
 * @returns {Promise<{success: boolean, added: number, updated: number, deletedDuplicates: number, total: number, message: string}>}
 */
export async function syncSepayTransactions() {
  const token = process.env.SEPAY_API_TOKEN;
  if (!token) {
    throw new Error('Chưa cấu hình biến môi trường SEPAY_API_TOKEN trong hệ thống.');
  }

  // 1. Gọi SePay v2 Transactions API
  const sepayRes = await fetch('https://userapi.sepay.vn/v2/transactions?page=1&per_page=50', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!sepayRes.ok) {
    const errorText = await sepayRes.text();
    throw new Error(`Lỗi kết nối SePay API (${sepayRes.status}): ${errorText}`);
  }

  const sepayData = await sepayRes.json();
  const rawTransactions = sepayData.data || [];

  if (rawTransactions.length === 0) {
    return {
      success: true,
      added: 0,
      updated: 0,
      deletedDuplicates: 0,
      total: 0,
      message: 'Không tìm thấy giao dịch nào từ SePay.',
    };
  }

  // 2. Lấy danh sách categories từ Supabase để tự động phân loại
  const { data: categories } = await supabase.from('categories').select('*');

  // 3. Lấy TOÀN BỘ giao dịch hiện tại trong database để đối soát (Reconcile)
  const { data: allDbRows } = await supabase.from('transactions').select('*');
  const dbRows = allDbRows || [];

  const matchedDbIds = new Set();
  const duplicateDbIdsToDelete = [];
  const itemsToInsert = [];
  let updatedCount = 0;

  // 4. So khớp từng giao dịch từ SePay API với DB
  for (const raw of rawTransactions) {
    const isIncome = raw.transfer_type === 'in';
    const amount = isIncome ? Number(raw.amount_in || 0) : Number(raw.amount_out || 0);
    const txType = isIncome ? 'IN' : 'OUT';
    const sepayUuid = String(raw.id);
    const refNum = raw.reference_number ? String(raw.reference_number) : null;
    const rawContentCore = cleanBankingPrefix(raw.transaction_content || '');
    const rawDateClean = formatSePayDateTime(raw.transaction_date);

    // Tìm các bản ghi trong DB khớp với giao dịch SePay này
    const matches = dbRows.filter((row) => {
      // Đã khớp ở lượt trước thì bỏ qua
      if (matchedDbIds.has(row.id)) return false;

      // Tiêu chí 1: Khớp theo SePay UUID hoặc reference_number
      if (row.sepay_id === sepayUuid || row.code === sepayUuid) return true;
      if (refNum && (row.code === refNum || (row.note && row.note.includes(refNum)))) return true;

      // Tiêu chí 2: Khớp theo bộ nhận diện thực tế (amount + type + transaction_date + nội dung)
      const sameAmount = Number(row.amount || 0) === amount;
      const sameType = row.type === txType;
      const sameDate = formatSePayDateTime(row.transaction_date) === rawDateClean;
      const rowContentCore = cleanBankingPrefix(row.content || '');
      const sameContent =
        rowContentCore === rawContentCore ||
        (row.content && raw.transaction_content && row.content.trim() === raw.transaction_content.trim());

      return sameAmount && sameType && sameDate && sameContent;
    });

    if (matches.length > 0) {
      // Bản ghi chính (giữ lại)
      const primary = matches[0];
      matchedDbIds.add(primary.id);

      // Nếu có các bản ghi trùng lặp thừa (do Webhook hoặc lần import trước) -> Đưa vào danh sách xóa
      if (matches.length > 1) {
        for (let i = 1; i < matches.length; i++) {
          duplicateDbIdsToDelete.push(matches[i].id);
          matchedDbIds.add(matches[i].id);
        }
      }

      // Đảm bảo bản ghi chính có chuẩn code = sepayUuid và đúng ngày SePay
      const formattedDateForDb = normalizeSePayDateForDb(raw.transaction_date);
      if (primary.code !== sepayUuid || !primary.sepay_id) {
        await supabase
          .from('transactions')
          .update({
            code: sepayUuid,
            sepay_id: sepayUuid,
            transaction_date: formattedDateForDb,
          })
          .eq('id', primary.id);
        updatedCount++;
      }
    } else {
      // Giao dịch hoàn toàn mới từ SePay chưa có trong DB -> Thêm mới
      itemsToInsert.push(raw);
    }
  }

  // 5. Xóa triệt để các bản ghi nhân bản thừa trong DB (nếu có)
  if (duplicateDbIdsToDelete.length > 0) {
    console.log('Dọn dẹp các bản ghi nhân bản thừa:', duplicateDbIdsToDelete);
    await supabase.from('transactions').delete().in('id', duplicateDbIdsToDelete);
  }

  // 6. Thêm các giao dịch mới cần insert
  let insertedCount = 0;
  if (itemsToInsert.length > 0) {
    const newTransactions = await Promise.all(
      itemsToInsert.map(async (item) => {
        const isIncome = item.transfer_type === 'in';
        const amount = isIncome ? Number(item.amount_in || 0) : Number(item.amount_out || 0);
        const txType = isIncome ? 'IN' : 'OUT';

        // Phân loại thông minh qua AI Categorizer
        const aiAnalysis = await smartCategorizeTransaction(
          item.transaction_content,
          txType,
          categories
        );

        // Chuẩn hóa thời gian theo chuẩn SePay
        const formattedDateForDb = normalizeSePayDateForDb(item.transaction_date);

        return {
          gateway: item.bank_brand_name || 'Bank',
          transaction_date: formattedDateForDb,
          account_number: item.account_number,
          amount: amount,
          type: txType,
          content: item.transaction_content || 'Giao dịch ngân hàng',
          code: String(item.id),
          sepay_id: String(item.id),
          category_id: aiAnalysis.categoryId,
          note: `AI: ${aiAnalysis.inferredText} [${aiAnalysis.categoryName}] • SePay (${item.bank_brand_name || 'Ngân hàng'}) - Ref: ${item.reference_number || 'N/A'}`,
        };
      })
    );

    const { data: inserted, error: insertError } = await supabase
      .from('transactions')
      .insert(newTransactions)
      .select();

    if (insertError) {
      throw new Error(`Lỗi lưu giao dịch vào Supabase: ${insertError.message}`);
    }
    insertedCount = inserted ? inserted.length : newTransactions.length;
  }

  return {
    success: true,
    added: insertedCount,
    updated: updatedCount,
    deletedDuplicates: duplicateDbIdsToDelete.length,
    total: rawTransactions.length,
    message: `Đã đối soát xong! Khớp chính xác ${rawTransactions.length} giao dịch từ SePay API (Thêm mới: ${insertedCount}, Cập nhật: ${updatedCount}, Dọn sạch nhân bản: ${duplicateDbIdsToDelete.length}).`,
  };
}
