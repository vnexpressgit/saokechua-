'use client';

import { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import {
  ChevronLeft,
  ChevronRight,
  PieChart as PieIcon,
  Calendar,
  Layers,
  ArrowLeft,
  TrendingDown,
} from 'lucide-react';

// Bảng màu chuẩn mực nghiêm cẩn của VnExpress Design System
const VNEXPRESS_PALETTE = [
  '#b13460', // Accent Rest (Hồng cánh sen trầm)
  '#466fa1', // Support Rest (Xanh thép báo chí)
  '#ee853b', // Warning (Cam đất)
  '#24a148', // Positive (Xanh lục)
  '#0590de', // Info (Xanh lam)
  '#5f5f5f', // Neutral Strong (Xám đậm)
  '#7f7f7f', // Neutral Subdued (Xám nhạt)
];

const FALLBACK_CATEGORIES = [
  { id: 1, name: 'Ăn uống & Cà phê', color: '#b13460' },
  { id: 2, name: 'Lương & Thưởng', color: '#24a148' },
  { id: 3, name: 'Hóa đơn & Tiện ích', color: '#466fa1' },
  { id: 4, name: 'Di chuyển & Xăng xe', color: '#5f5f5f' },
  { id: 5, name: 'Mua sắm & Gia dụng', color: '#ee853b' },
  { id: 6, name: 'Đầu tư & Tiết kiệm', color: '#0590de' },
  { id: 7, name: 'Chưa phân loại', color: '#7f7f7f' },
];

const FALLBACK_TRANSACTIONS = [
  {
    id: 1,
    amount: 45000,
    type: 'OUT',
    category_id: 1,
    transaction_date: '2026-09-24T08:30:00Z',
    categories: { id: 1, name: 'Ăn uống & Cà phê', color: '#b13460' },
  },
  {
    id: 2,
    amount: 1500000,
    type: 'OUT',
    category_id: 3,
    transaction_date: '2026-09-23T10:00:00Z',
    categories: { id: 3, name: 'Hóa đơn & Tiện ích', color: '#466fa1' },
  },
  {
    id: 3,
    amount: 75000,
    type: 'OUT',
    category_id: 4,
    transaction_date: '2026-09-24T18:20:00Z',
    categories: { id: 4, name: 'Di chuyển & Xăng xe', color: '#5f5f5f' },
  },
];

// Hook tránh hydration mismatch khi render Recharts
const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

// Tooltip chuẩn VnExpress: nền Surface 000 (#ffffff), viền Border Subdued (#d6d6d6)
function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const formatVND = (num) =>
      new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(num || 0);

    return (
      <div className="bg-[#ffffff] border border-[#d6d6d6] rounded-[4px] p-2 text-xs">
        <p className="font-ui text-[12px] font-bold text-[#202020] mb-0.5">
          {data.name}
        </p>
        <p className="font-mono text-[13px] font-bold text-[#da1e28]">
          {formatVND(data.amount)}
        </p>
        <p className="font-mono text-[11px] text-[#7f7f7f] mt-0.5">
          {data.percentage}% • {data.count} giao dịch
        </p>
      </div>
    );
  }
  return null;
}

export default function AnalyticsPage() {
  const mounted = useMounted();
  const [transactions, setTransactions] = useState(FALLBACK_TRANSACTIONS);
  const [, setCategories] = useState(FALLBACK_CATEGORIES);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(num || 0);
  };

  const fetchData = useCallback(async () => {
    const isReady = isSupabaseConfigured();
    if (!isReady) return;

    try {
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .order('id', { ascending: true });

      if (catData && catData.length > 0) {
        setCategories(catData);
      }

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          type,
          category_id,
          transaction_date,
          created_at,
          categories (
            id,
            name,
            color
          )
        `)
        .eq('type', 'OUT')
        .order('transaction_date', { ascending: false });

      if (!txError && txData) {
        setTransactions(txData);
      }
    } catch (err) {
      console.error('Lỗi khi fetch Supabase Analytics:', err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const { chartData, totalExpense, categoryCount } = useMemo(() => {
    const filtered = transactions.filter((tx) => {
      if (tx.type !== 'OUT') return false;
      const dateStr = tx.transaction_date || tx.created_at;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return (
        d.getMonth() + 1 === Number(selectedMonth) &&
        d.getFullYear() === Number(selectedYear)
      );
    });

    const total = filtered.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const groupMap = {};
    filtered.forEach((tx) => {
      const catId = tx.category_id || tx.categories?.id || 'unassigned';
      const catName = tx.categories?.name || 'Chưa phân loại';

      if (!groupMap[catId]) {
        groupMap[catId] = {
          id: catId,
          name: catName,
          amount: 0,
          count: 0,
        };
      }
      groupMap[catId].amount += Number(tx.amount || 0);
      groupMap[catId].count += 1;
    });

    const list = Object.values(groupMap).map((item, index) => {
      const percent = total > 0 ? (item.amount / total) * 100 : 0;
      return {
        ...item,
        color: VNEXPRESS_PALETTE[index % VNEXPRESS_PALETTE.length],
        percentage: Number(percent.toFixed(1)),
      };
    });

    list.sort((a, b) => b.amount - a.amount);

    return {
      chartData: list,
      totalExpense: total,
      categoryCount: list.length,
    };
  }, [transactions, selectedMonth, selectedYear]);

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-[#ffffff] text-[#202020]">
      {/* Đường viền nhận diện thương hiệu VnExpress Accent (#b13460) */}
      <div className="h-[3px] bg-[#b13460] w-full" />

      {/* 1. Header & Bộ Chọn Tháng/Năm */}
      <header className="px-4 pt-3.5 pb-3 bg-[#ffffff] sticky top-0 z-30 border-b border-[#d6d6d6]">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="h-8 w-8 rounded-[8px] bg-[#f3f3f3] hover:bg-[#ececec] border border-[#d6d6d6] text-[#5f5f5f] hover:text-[#202020] flex items-center justify-center state-layer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <span className="font-ui text-[11px] font-bold text-[#b13460]">
                VnExpress
              </span>
              <h1 className="font-serif text-[18px] font-bold text-[#202020] leading-tight">
                Phân tích chi tiêu
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-[#f3f3f3] border border-[#d6d6d6] text-[11px] font-ui text-[#5f5f5f]">
            <Calendar className="w-3 h-3 text-[#b13460]" />
            <span className="font-mono font-medium">
              T{selectedMonth < 10 ? `0${selectedMonth}` : selectedMonth}/{selectedYear}
            </span>
          </div>
        </div>

        {/* Bộ điều khiển chọn Tháng/Năm */}
        <div className="flex items-center justify-between p-1.5 bg-[#fcfaf6] rounded-[4px] border border-[#d6d6d6]">
          <button
            onClick={handlePrevMonth}
            className="h-8 w-8 rounded-[8px] bg-[#f3f3f3] hover:bg-[#ececec] border border-[#d6d6d6] text-[#5f5f5f] hover:text-[#202020] flex items-center justify-center state-layer"
            title="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-8 bg-[#ffffff] font-ui text-[12px] font-medium text-[#202020] px-2.5 rounded-[4px] border border-[#9f9f9f] focus:border-[#0590de] cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m < 10 ? `0${m}` : m}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-8 bg-[#ffffff] font-ui text-[12px] font-medium text-[#202020] px-2.5 rounded-[4px] border border-[#9f9f9f] focus:border-[#0590de] cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  Năm {yr}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleNextMonth}
            className="h-8 w-8 rounded-[8px] bg-[#f3f3f3] hover:bg-[#ececec] border border-[#d6d6d6] text-[#5f5f5f] hover:text-[#202020] flex items-center justify-center state-layer"
            title="Tháng sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. KHU VỰC BIỂU ĐỒ TRÒN (SURFACE PAPER #fcfaf6) */}
      <section className="px-4 pt-3.5">
        <div className="rounded-[4px] p-4 bg-[#fcfaf6] border border-[#d6d6d6]">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-[rgba(0,0,0,0.06)]">
            <span className="font-ui text-[13px] font-bold text-[#202020] flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-[#b13460]" />
              <span>Cơ cấu chi tiêu</span>
            </span>
            <span className="font-ui text-[11px] text-[#7f7f7f]">
              {categoryCount} danh mục
            </span>
          </div>

          {/* Biểu đồ Doughnut */}
          <div className="relative h-56 w-full flex items-center justify-center">
            {mounted && chartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomTooltip />} />
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={88}
                      paddingAngle={2}
                      dataKey="amount"
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className="transition-opacity duration-100 hover:opacity-85 cursor-pointer"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Tâm biểu đồ */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="font-ui text-[10px] text-[#5f5f5f]">
                    Tổng chi tháng
                  </span>
                  <span className="font-mono text-[14px] font-bold text-[#da1e28] mt-0.5 max-w-[130px] truncate">
                    {formatVND(totalExpense)}
                  </span>
                  <span className="font-ui text-[9px] text-[#7f7f7f] flex items-center gap-0.5 mt-0.5">
                    <TrendingDown className="w-2.5 h-2.5 text-[#da1e28]" />
                    Đã thanh toán
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-[#7f7f7f] text-xs flex flex-col items-center justify-center">
                <Layers className="w-8 h-8 text-[#9f9f9f] mb-2 stroke-[1.5]" />
                <p className="font-ui">Chưa có chi tiêu trong Tháng {selectedMonth}/{selectedYear}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. DANH SÁCH CHI TIẾT THEO DANH MỤC (DENSE & FLAT) */}
      <section className="px-4 mt-4 flex-1">
        <div className="flex items-center justify-between mb-2 pb-1 border-b border-[rgba(0,0,0,0.06)]">
          <h2 className="font-ui text-[12px] font-bold text-[#202020]">
            Chi tiết danh mục ({chartData.length})
          </h2>
          <span className="font-ui text-[11px] text-[#7f7f7f]">
            Sắp xếp theo số tiền
          </span>
        </div>

        <div className="space-y-2">
          {chartData.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-[4px] bg-[#ffffff] border border-[#d6d6d6]"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <h3 className="font-ui text-[13px] font-bold text-[#202020] leading-none">
                      {item.name}
                    </h3>
                    <span className="font-sans text-[10px] text-[#7f7f7f] mt-0.5 block">
                      {item.count} giao dịch
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-[13px] font-bold text-[#da1e28] block leading-none">
                    {formatVND(item.amount)}
                  </span>
                  <span className="font-mono text-[10px] text-[#7f7f7f] mt-0.5 block">
                    {item.percentage}%
                  </span>
                </div>
              </div>

              {/* Thanh tỷ trọng phẳng (Hairline 3px) */}
              <div className="w-full h-1 bg-[#f3f3f3] rounded-[2px] overflow-hidden mt-1">
                <div
                  className="h-full"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. THANH ĐIỀU HƯỚNG DƯỚI */}
      <BottomNav />
    </div>
  );
}
