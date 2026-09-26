import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import {
  smartCategorizeTransaction,
  normalizeSePayDateForDb,
  formatSePayDateTime,
  cleanBankingPrefix,
} from '@/lib/aiCategorizer';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('Nhận SePay Webhook:', body);

    if (!body || (!body.id && !body.referenceCode && !body.content)) {
      return NextResponse.json({ success: false, message: 'Dữ liệu payload không hợp lệ' }, { status: 400 });
    }

    const sepayId = String(body.id || '');
    const referenceCode = String(body.referenceCode || body.reference_number || '');
    const isIncome = (body.transferType || body.transfer_type || '').toLowerCase() === 'in';
    const amount = Number(body.transferAmount || body.amount || body.amount_in || body.amount_out || 0);
    const txType = isIncome ? 'IN' : 'OUT';
    const content = body.content || body.description || body.transaction_content || 'Giao dịch ngân hàng';
    const rawDate = body.transactionDate || body.transaction_date;
    const cleanDate = formatSePayDateTime(rawDate);
    const contentCore = cleanBankingPrefix(content);

    // 1. Kiểm tra chống trùng lặp đa tiêu chí (Deduplication Check)
    const { data: existingRows } = await supabase.from('transactions').select('*');
    const isDuplicate = (existingRows || []).some((row) => {
      // Tiêu chí 1: Khớp mã SePay hoặc mã tham chiếu ngân hàng
      if (sepayId && (row.sepay_id === sepayId || row.code === sepayId)) return true;
      if (referenceCode && (row.code === referenceCode || (row.note && row.note.includes(referenceCode)))) return true;

      // Tiêu chí 2: Khớp bộ nhận diện thực tế (amount + type + transaction_date + content core)
      const sameAmount = Number(row.amount || 0) === amount;
      const sameType = row.type === txType;
      const sameDate = formatSePayDateTime(row.transaction_date) === cleanDate;
      const rowCore = cleanBankingPrefix(row.content || '');
      const sameContent = rowCore === contentCore || (row.content && row.content.trim() === content.trim());

      return sameAmount && sameType && sameDate && sameContent;
    });

    if (isDuplicate) {
      console.log('Phát hiện giao dịch đã tồn tại trong DB, bỏ qua để tránh nhân bản:', { sepayId, referenceCode, amount, content });
      return NextResponse.json({
        success: true,
        message: 'Giao dịch đã tồn tại trong hệ thống (Đã chống nhân bản thành công).',
      });
    }

    // 2. Lấy danh mục để tự động phân loại bằng AI Model / Compound Word Engine
    const { data: categories } = await supabase.from('categories').select('*');
    const aiAnalysis = await smartCategorizeTransaction(content, txType, categories || []);

    // 3. Chuẩn hóa định dạng thời gian đúng theo format SePay trả ra (UTC+7)
    const formattedDateForDb = normalizeSePayDateForDb(rawDate);

    // 4. Chèn giao dịch mới với mã nhận diện duy nhất
    const primaryCode = referenceCode || sepayId || `WEBHOOK_${Date.now()}`;
    const { error: insertError } = await supabase.from('transactions').insert({
      gateway: body.gateway || body.bank_brand_name || 'Bank',
      transaction_date: formattedDateForDb,
      account_number: body.accountNumber || body.account_number || null,
      amount: amount,
      type: txType,
      content: content,
      code: primaryCode,
      sepay_id: sepayId || primaryCode,
      category_id: aiAnalysis.categoryId,
      note: `AI: ${aiAnalysis.inferredText} [${aiAnalysis.categoryName}] • Webhook SePay (${body.gateway || body.bank_brand_name || 'Ngân hàng'}) - Ref: ${referenceCode || 'N/A'}`,
    });

    if (insertError) {
      console.error('Lỗi insert Supabase từ Webhook:', insertError);
      return NextResponse.json({ success: false, message: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Giao dịch mới đã được lưu thành công! Phân loại: ${aiAnalysis.categoryName} (${aiAnalysis.inferredText})`,
    });
  } catch (error) {
    console.error('Lỗi xử lý SePay Webhook:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
