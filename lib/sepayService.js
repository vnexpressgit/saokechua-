import { supabase } from './supabaseClient';
import {
  smartCategorizeTransaction,
  normalizeSePayDateForDb,
  formatSePayDateTime,
} from './aiCategorizer';

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
 * Đồng bộ toàn bộ giao dịch mới nhất từ SePay API vào Supabase
 * @returns {Promise<{success: boolean, added: number, total: number, message: string}>}
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
      total: 0,
      message: 'Không tìm thấy giao dịch nào từ SePay.',
    };
  }

  // 2. Lấy danh sách categories từ Supabase để tự động phân loại
  const { data: categories } = await supabase.from('categories').select('*');

  // 3. Lấy danh sách các giao dịch đã tồn tại để tránh trùng lặp (Idempotency)
  const incomingIds = rawTransactions.map((t) => t.id);
  const { data: existingRows } = await supabase
    .from('transactions')
    .select('code')
    .in('code', incomingIds);

  const existingCodeSet = new Set((existingRows || []).map((r) => r.code));

  // 4. Lọc các giao dịch chưa từng lưu & phân loại AI
  const uninsertedItems = rawTransactions.filter((item) => !existingCodeSet.has(item.id));

  if (uninsertedItems.length === 0) {
    return {
      success: true,
      added: 0,
      total: rawTransactions.length,
      message: 'Tất cả giao dịch từ SePay đã được đồng bộ trước đó.',
    };
  }

  const newTransactionsToInsert = await Promise.all(
    uninsertedItems.map(async (item) => {
      const isIncome = item.transfer_type === 'in';
      const amount = isIncome ? Number(item.amount_in || 0) : Number(item.amount_out || 0);
      const txType = isIncome ? 'IN' : 'OUT';

      // Phân loại thông minh qua LLM & Compound Rule Engine
      const aiAnalysis = await smartCategorizeTransaction(
        item.transaction_content,
        txType,
        categories
      );

      // Chuẩn hóa thời gian lấy đúng theo format SePay trả ra (UTC+7)
      const formattedDateForDb = normalizeSePayDateForDb(item.transaction_date);

      return {
        gateway: item.bank_brand_name || 'Bank',
        transaction_date: formattedDateForDb,
        account_number: item.account_number,
        amount: amount,
        type: txType,
        content: item.transaction_content || 'Giao dịch ngân hàng',
        code: item.id, // Lưu SePay Transaction UUID để bảo đảm Idempotency
        category_id: aiAnalysis.categoryId,
        note: `AI: ${aiAnalysis.inferredText} [${aiAnalysis.categoryName}] • SePay (${item.bank_brand_name || 'Ngân hàng'}) - Ref: ${item.reference_number || 'N/A'}`,
      };
    })
  );

  // 5. Thêm các giao dịch mới vào Supabase
  const { data: inserted, error: insertError } = await supabase
    .from('transactions')
    .insert(newTransactionsToInsert)
    .select();

  if (insertError) {
    throw new Error(`Lỗi lưu giao dịch vào Supabase: ${insertError.message}`);
  }

  return {
    success: true,
    added: inserted ? inserted.length : newTransactionsToInsert.length,
    total: rawTransactions.length,
    message: `Đã đồng bộ thành công ${inserted ? inserted.length : newTransactionsToInsert.length} giao dịch thật từ SePay!`,
  };
}
