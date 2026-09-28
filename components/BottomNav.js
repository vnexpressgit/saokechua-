'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, BarChart3, CalendarCheck, QrCode, Camera } from 'lucide-react';

/**
 * BottomNav
 * Props:
 *   onOpenQr  : () => void  — mở modal QR scanner
 *   onOpenOcr : () => void  — mở modal OCR upload
 */
export default function BottomNav({ onOpenQr, onOpenOcr }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-center bg-[#ffffff] border-t border-[#d6d6d6]">
      <div className="w-full max-w-md flex items-end justify-around pb-2 pt-1 px-2">

        {/* Tab 1: Sao kê */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-[8px] transition duration-100 ${
            pathname === '/'
              ? 'text-[#b13460] font-bold bg-[#fce6eb]'
              : 'text-[#5f5f5f] hover:text-[#202020] hover:bg-[#f3f3f3]'
          }`}
        >
          <Wallet className="w-5 h-5 stroke-[1.8]" />
          <span className="font-ui text-[10px] leading-tight">Sao kê</span>
        </Link>

        {/* Tab 2: Lịch việc */}
        <Link
          href="/calendar"
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-[8px] transition duration-100 ${
            pathname === '/calendar'
              ? 'text-[#b13460] font-bold bg-[#fce6eb]'
              : 'text-[#5f5f5f] hover:text-[#202020] hover:bg-[#f3f3f3]'
          }`}
        >
          <CalendarCheck className="w-5 h-5 stroke-[1.8]" />
          <span className="font-ui text-[10px] leading-tight">Lịch việc</span>
        </Link>

        {/* ── NÚT QR - FAB TRUNG TÂM ── */}
        <div className="flex flex-col items-center relative -mt-4">
          <button
            onClick={onOpenQr}
            className="w-14 h-14 rounded-full bg-[#b13460] hover:bg-[#a02e55] active:bg-[#8f274a] text-white flex items-center justify-center transition-all duration-150 border-4 border-[#ffffff] active:scale-95"
            style={{
              boxShadow: '0 2px 12px rgba(177,52,96,0.35) !important',
            }}
            aria-label="Quét mã QR chuyển khoản"
          >
            <QrCode className="w-6 h-6 stroke-[2]" />
          </button>
          <span className="font-ui text-[10px] text-[#b13460] font-bold mt-0.5 leading-tight">
            Quét QR
          </span>
        </div>

        {/* Tab 4: OCR Camera */}
        <button
          onClick={onOpenOcr}
          className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-[8px] transition duration-100 text-[#5f5f5f] hover:text-[#202020] hover:bg-[#f3f3f3]"
          aria-label="Nhập giao dịch bằng ảnh"
        >
          <Camera className="w-5 h-5 stroke-[1.8]" />
          <span className="font-ui text-[10px] leading-tight">Chụp ảnh</span>
        </button>

        {/* Tab 5: Thống kê */}
        <Link
          href="/analytics"
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-[8px] transition duration-100 ${
            pathname === '/analytics'
              ? 'text-[#b13460] font-bold bg-[#fce6eb]'
              : 'text-[#5f5f5f] hover:text-[#202020] hover:bg-[#f3f3f3]'
          }`}
        >
          <BarChart3 className="w-5 h-5 stroke-[1.8]" />
          <span className="font-ui text-[10px] leading-tight">Thống kê</span>
        </Link>

      </div>
    </nav>
  );
}
