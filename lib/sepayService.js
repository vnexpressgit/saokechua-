import { supabase } from './supabaseClient';

/**
 * Hàm phân loại thông minh (Auto-Categorization) dựa vào nội dung chuyển khoản
 * @param {string} content - Nội dung giao dịch
 * @param {string} type - 'IN' | 'OUT'
 * @param {Array} categories - Danh sách danh mục từ Supabase
 * @returns {string|null} - ID của danh mục phù hợp nhất
 */
export function autoCategorizeTransaction(content, type, categories = []) {
  if (!content || !categories || categories.length === 0) return null;

  const text = content.toLowerCase();
  const catMap = {};
  categories.forEach((cat) => {
    catMap[cat.name] = cat.id;
  });

  // Nếu là tiền vào (IN)
  if (type === 'IN') {
    if (
      text.includes('luong') ||
      text.includes('thuong') ||
      text.includes('salary') ||
      text.includes('cty') ||
      text.includes('cong ty')
    ) {
      return catMap['Lương & Thưởng'] || catMap['Khác'] || categories[0]?.id;
    }
    if (text.includes('lai') || text.includes('tra lai') || text.includes('tiet kiem')) {
      return catMap['Khác'] || categories[0]?.id;
    }
  }

  // 1. Cà phê, đồ uống, trà sữa
  if (
    text.includes('coffee') ||
    text.includes('cafe') ||
    text.includes('highlands') ||
    text.includes('phuc long') ||
    text.includes('starbucks') ||
    text.includes('tra sua') ||
    text.includes('tocotoco') ||
    text.includes('mixue') ||
    text.includes('the coffee house') ||
    text.includes('tra dao')
  ) {
    return catMap['Cà phê & Bánh'] || catMap['Ăn uống'] || catMap['Khác'];
  }

  // 2. Ăn uống, nhà hàng, quán ăn, món ăn
  if (
    text.includes('an ') ||
    text.includes('food') ||
    text.includes('com ') ||
    text.includes('pho ') ||
    text.includes('bun ') ||
    text.includes('mycju') ||
    text.includes('my cay') ||
    text.includes('khoaitrung') ||
    text.includes('banh mi') ||
    text.includes('lau ') ||
    text.includes('bbq') ||
    text.includes('buffet') ||
    text.includes('pizza') ||
    text.includes('kfc') ||
    text.includes('lotteria') ||
    text.includes('quan an') ||
    text.includes('nha hang') ||
    text.includes('shopeefood') ||
    text.includes('baemin')
  ) {
    return catMap['Ăn uống'] || catMap['Khác'];
  }

  // 3. Di chuyển, xe cộ, xăng xe
  if (
    text.includes('grab') ||
    text.includes('be group') ||
    text.includes('be ') ||
    text.includes('xanh sm') ||
    text.includes('gojek') ||
    text.includes('taxi') ||
    text.includes('xang') ||
    text.includes('petrolimex') ||
    text.includes('gui xe') ||
    text.includes('ve cau duong') ||
    text.includes('epass') ||
    text.includes('etc')
  ) {
    return catMap['Di chuyển'] || catMap['Khác'];
  }

  // 4. Mua sắm, tạp hóa, siêu thị
  if (
    text.includes('shopee') ||
    text.includes('lazada') ||
    text.includes('tiki') ||
    text.includes('tiktok') ||
    text.includes('sieu thi') ||
    text.includes('winmart') ||
    text.includes('circle k') ||
    text.includes('gs25') ||
    text.includes('seven') ||
    text.includes('7-eleven') ||
    text.includes('coopmart') ||
    text.includes('bach hoa') ||
    text.includes('mua ')
  ) {
    return catMap['Mua sắm'] || catMap['Khác'];
  }

  // 5. Hóa đơn, điện nước, internet
  if (
    text.includes('dien') ||
    text.includes('evn') ||
    text.includes('nuoc') ||
    text.includes('internet') ||
    text.includes('viettel') ||
    text.includes('fpt') ||
    text.includes('vnpt') ||
    text.includes('truyen hinh') ||
    text.includes('chung cu') ||
    text.includes('phi quan ly') ||
    text.includes('tien nha')
  ) {
    return catMap['Hóa đơn & Tiện ích'] || catMap['Khác'];
  }

  // 6. Giải trí, phim ảnh, streaming
  if (
    text.includes('cgv') ||
    text.includes('lotte') ||
    text.includes('cinema') ||
    text.includes('netflix') ||
    text.includes('spotify') ||
    text.includes('youtube') ||
    text.includes('steam') ||
    text.includes('game')
  ) {
    return catMap['Giải trí'] || catMap['Khác'];
  }

  // Mặc định: Trả về danh mục 'Khác' nếu có
  return catMap['Khác'] || categories[0]?.id || null;
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
  // Lưu ý: Dùng cột 'code' để lưu mã SePay ID (UUID v2)
  const incomingIds = rawTransactions.map((t) => t.id);
  const { data: existingRows } = await supabase
    .from('transactions')
    .select('code')
    .in('code', incomingIds);

  const existingCodeSet = new Set((existingRows || []).map((r) => r.code));

  // 4. Lọc các giao dịch chưa từng lưu
  const newTransactionsToInsert = rawTransactions
    .filter((item) => !existingCodeSet.has(item.id))
    .map((item) => {
      const isIncome = item.transfer_type === 'in';
      const amount = isIncome ? Number(item.amount_in || 0) : Number(item.amount_out || 0);
      const txType = isIncome ? 'IN' : 'OUT';
      const categoryId = autoCategorizeTransaction(item.transaction_content, txType, categories);

      return {
        gateway: item.bank_brand_name || 'Bank',
        transaction_date: item.transaction_date,
        account_number: item.account_number,
        amount: amount,
        type: txType,
        content: item.transaction_content || 'Giao dịch ngân hàng',
        code: item.id, // Lưu SePay Transaction UUID để bảo đảm Idempotency
        category_id: categoryId,
        note: `Tự động từ SePay (${item.bank_brand_name || 'Ngân hàng'}) - Ref: ${item.reference_number || 'N/A'}`,
      };
    });

  if (newTransactionsToInsert.length === 0) {
    return {
      success: true,
      added: 0,
      total: rawTransactions.length,
      message: 'Tất cả giao dịch từ SePay đã được đồng bộ trước đó.',
    };
  }

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
