import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { autoCategorizeTransaction } from '@/lib/sepayService';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('Nhận SePay Webhook:', body);

    if (!body || (!body.id && !body.referenceCode && !body.content)) {
      return NextResponse.json({ success: false, message: 'Dữ liệu payload không hợp lệ' }, { status: 400 });
    }

    const sepayId = String(body.id || body.referenceCode || Date.now());
    const isIncome = (body.transferType || '').toLowerCase() === 'in';
    const amount = Number(body.transferAmount || body.amount || 0);
    const txType = isIncome ? 'IN' : 'OUT';
    const content = body.content || body.description || 'Giao dịch ngân hàng';

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

    // 2. Lấy danh mục để tự động phân loại
    const { data: categories } = await supabase.from('categories').select('*');
    const categoryId = autoCategorizeTransaction(content, txType, categories);

    // 3. Chèn giao dịch mới
    const { error: insertError } = await supabase.from('transactions').insert({
      gateway: body.gateway || 'Bank',
      transaction_date: body.transactionDate || new Date().toISOString(),
      account_number: body.accountNumber || null,
      amount: amount,
      type: txType,
      content: content,
      code: sepayId,
      category_id: categoryId,
      note: `Webhook SePay (${body.gateway || 'Ngân hàng'}) - Ref: ${body.referenceCode || 'N/A'}`,
    });

    if (insertError) {
      console.error('Lỗi insert Supabase từ Webhook:', insertError);
      return NextResponse.json({ success: false, message: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Giao dịch mới đã được lưu thành công từ Webhook!',
    });
  } catch (error) {
    console.error('Lỗi xử lý SePay Webhook:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
