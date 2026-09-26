'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, BarChart3, CalendarCheck } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-center bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80">
      <div className="w-full max-w-md flex items-center justify-around py-2.5 px-4">
        {/* Tab 1: Trang chủ / Sao kê */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 transition ${
            pathname === '/'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px]">Sao kê</span>
        </Link>

        {/* Tab 2: Lịch việc & Nhắc hóa đơn (TickTick) */}
        <Link
          href="/calendar"
          className={`flex flex-col items-center gap-1 transition relative ${
            pathname === '/calendar'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarCheck className="w-5 h-5" />
          <span className="text-[10px]">Lịch việc</span>
        </Link>

        {/* Tab 3: Thống kê chi tiêu */}
        <Link
          href="/analytics"
          className={`flex flex-col items-center gap-1 transition ${
            pathname === '/analytics'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px]">Thống kê</span>
        </Link>
      </div>
    </nav>
  );
}

