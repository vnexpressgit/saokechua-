import { NextResponse } from 'next/server';
import { syncSepayTransactions } from '@/lib/sepayService';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await syncSepayTransactions();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Lỗi API sync SePay:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Lỗi không xác định khi đồng bộ SePay',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Cho phép trigger đồng bộ hoặc kiểm tra qua GET request
  return POST();
}
