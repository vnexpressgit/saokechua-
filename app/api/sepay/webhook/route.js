import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import {
  smartCategorizeTransaction,
  normalizeSePayDateForDb,
} from '@/lib/aiCategorizer';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('Nhận SePay Webhook:', body);

    if (!body || (!body.id && !body.referenceCode && !body.content)) {
      return NextResponse.json({ success: false, message: 'Dữ liệu payload không hợp lệ' }, { status: 400 });
    }

    const sepayId = String(body.id || body.referenceCode || Date.now());
    const isIncome = (body.transferType || body.transfer_type || '').toLowerCase() === 'in';
    const amount = Number(body.transferAmount || body.amount || body.amount_in || body.amount_out || 0);
    const txType = isIncome ? 'IN' : 'OUT';
    const content = body.content || body.description || body.transaction_content || 'Giao dịch ngân hàng';

    // 1. Kiểm tra chống trùng lặp theo code/sepayId
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('code', sepayId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Giao dịch đã tồn tại trong hệ thống (Duplicate ignored).',
      });
    }

    // 2. Lấy danh mục để tự động phân loại bằng AI Model / Compound Word Engine
    const { data: categories } = await supabase.from('categories').select('*');
    const aiAnalysis = await smartCategorizeTransaction(content, txType, categories || []);

    // 3. Chuẩn hóa định dạng thời gian đúng theo format SePay trả ra (UTC+7)
    const rawDate = body.transactionDate || body.transaction_date;
    const formattedDateForDb = normalizeSePayDateForDb(rawDate);

    // 4. Chèn giao dịch mới
    const { error: insertError } = await supabase.from('transactions').insert({
      gateway: body.gateway || body.bank_brand_name || 'Bank',
      transaction_date: formattedDateForDb,
      account_number: body.accountNumber || body.account_number || null,
      amount: amount,
      type: txType,
      content: content,
      code: sepayId,
      category_id: aiAnalysis.categoryId,
      note: `AI: ${aiAnalysis.inferredText} [${aiAnalysis.categoryName}] • Webhook SePay (${body.gateway || body.bank_brand_name || 'Ngân hàng'}) - Ref: ${body.referenceCode || body.reference_number || 'N/A'}`,
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
