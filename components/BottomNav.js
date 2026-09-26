'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, BarChart3, CalendarCheck } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-center bg-[#ffffff] border-t border-[#d6d6d6]">
      <div className="w-full max-w-md flex items-center justify-around py-2 px-3">
        {/* Tab 1: Sao kê */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-[8px] transition duration-100 ${
            pathname === '/'
              ? 'text-[#b13460] font-bold bg-[#fce6eb]'
              : 'text-[#5f5f5f] hover:text-[#202020] hover:bg-[#f3f3f3]'
          }`}
        >
          <Wallet className="w-4 h-4 stroke-[1.8]" />
          <span className="font-ui text-[11px] leading-tight">Sao kê</span>
        </Link>

        {/* Tab 2: Lịch việc (TickTick Planner) */}
        <Link
          href="/calendar"
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-[8px] transition duration-100 ${
            pathname === '/calendar'
              ? 'text-[#b13460] font-bold bg-[#fce6eb]'
              : 'text-[#5f5f5f] hover:text-[#202020] hover:bg-[#f3f3f3]'
          }`}
        >
          <CalendarCheck className="w-4 h-4 stroke-[1.8]" />
          <span className="font-ui text-[11px] leading-tight">Lịch việc</span>
        </Link>

        {/* Tab 3: Thống kê */}
        <Link
          href="/analytics"
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-[8px] transition duration-100 ${
            pathname === '/analytics'
              ? 'text-[#b13460] font-bold bg-[#fce6eb]'
              : 'text-[#5f5f5f] hover:text-[#202020] hover:bg-[#f3f3f3]'
          }`}
        >
          <BarChart3 className="w-4 h-4 stroke-[1.8]" />
          <span className="font-ui text-[11px] leading-tight">Thống kê</span>
        </Link>
      </div>
    </nav>
  );
}
