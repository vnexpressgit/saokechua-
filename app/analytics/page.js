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

// Dữ liệu mẫu ban đầu cho Analytics khi chưa kết nối Supabase hoặc demo
const FALLBACK_CATEGORIES = [
  { id: 1, name: 'Ăn uống & Cà phê', color: '#f59e0b' },
  { id: 2, name: 'Lương & Thưởng', color: '#10b981' },
  { id: 3, name: 'Hóa đơn & Tiện ích', color: '#8b5cf6' },
  { id: 4, name: 'Di chuyển & Xăng xe', color: '#3b82f6' },
  { id: 5, name: 'Mua sắm & Gia dụng', color: '#ec4899' },
  { id: 6, name: 'Đầu tư & Tiết kiệm', color: '#06b6d4' },
  { id: 7, name: 'Chưa phân loại', color: '#64748b' },
];

const FALLBACK_TRANSACTIONS = [
  {
    id: 1,
    amount: 45000,
    type: 'OUT',
    category_id: 1,
    transaction_date: '2026-09-24T08:30:00Z',
    categories: { id: 1, name: 'Ăn uống & Cà phê', color: '#f59e0b' },
  },
  {
    id: 2,
    amount: 1500000,
    type: 'OUT',
    category_id: 3,
    transaction_date: '2026-09-23T10:00:00Z',
    categories: { id: 3, name: 'Hóa đơn & Tiện ích', color: '#8b5cf6' },
  },
  {
    id: 3,
    amount: 75000,
    type: 'OUT',
    category_id: 4,
    transaction_date: '2026-09-24T18:20:00Z',
    categories: { id: 4, name: 'Di chuyển & Xăng xe', color: '#3b82f6' },
  },
  {
    id: 4,
    amount: 250000,
    type: 'OUT',
    category_id: 1,
    transaction_date: '2026-09-18T12:15:00Z',
    categories: { id: 1, name: 'Ăn uống & Cà phê', color: '#f59e0b' },
  },
  {
    id: 5,
    amount: 420000,
    type: 'OUT',
    category_id: 5,
    transaction_date: '2026-09-15T15:45:00Z',
    categories: { id: 5, name: 'Mua sắm & Gia dụng', color: '#ec4899' },
  },
  {
    id: 6,
    amount: 60000,
    type: 'OUT',
    category_id: 4,
    transaction_date: '2026-09-10T09:00:00Z',
    categories: { id: 4, name: 'Di chuyển & Xăng xe', color: '#3b82f6' },
  },
];

// Bảng màu dự phòng nếu category chưa có màu
const PALETTE = [
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#3b82f6',
  '#06b6d4',
  '#10b981',
  '#f97316',
  '#64748b',
];

// Format tiền tệ VND
const formatVND = (num) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(num || 0);
};

// Chuẩn React 19: Hook phát hiện mounted không gây cascading render
const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

// Khai báo CustomTooltip bên ngoài component render để tối ưu bộ nhớ & tránh lỗi React 19
function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700/80 px-3 py-2 rounded-xl shadow-2xl text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-white">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <span>{data.name}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3 text-slate-300">
          <span>Số tiền:</span>
          <span className="font-bold text-rose-400 font-mono">
            {formatVND(data.amount)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
          <span>Tỷ trọng:</span>
          <span className="font-semibold text-emerald-400">
            {data.percentage}%
          </span>
        </div>
      </div>
    );
  }
  return null;
}

export default function AnalyticsPage() {
  const mounted = useMounted();
  const [transactions, setTransactions] = useState(FALLBACK_TRANSACTIONS);
  const [, setCategories] = useState(FALLBACK_CATEGORIES);

  // Bộ chọn Tháng & Năm
  const [selectedMonth, setSelectedMonth] = useState(9); // Tháng 9
  const [selectedYear, setSelectedYear] = useState(2026); // Năm 2026

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

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
    // Gọi tải dữ liệu sau khi component mount
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // Điều hướng chuyển tháng trước / sau
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

  // Tính toán dữ liệu thống kê theo tháng đã chọn
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
      const catColor = tx.categories?.color || '#64748b';

      if (!groupMap[catId]) {
        groupMap[catId] = {
          id: catId,
          name: catName,
          color: catColor,
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
        color: item.color || PALETTE[index % PALETTE.length],
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
    <div className="flex flex-col min-h-screen pb-20 selection:bg-emerald-500 selection:text-white">
      {/* 1. Header & Bộ Chọn Tháng/Năm */}
      <header className="px-4 pt-5 pb-4 bg-slate-950 sticky top-0 z-30 border-b border-slate-900 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Phân Tích Chi Tiêu
              </span>
              <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Biểu Đồ Danh Mục</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
            <Calendar className="w-3 h-3 text-emerald-400" />
            <span>Tháng {selectedMonth}/{selectedYear}</span>
          </div>
        </div>

        {/* Bộ điều khiển chọn Tháng/Năm */}
        <div className="flex items-center justify-between p-2 bg-slate-900/90 rounded-2xl border border-slate-800/80">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white active:scale-95 transition"
            title="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-950 text-xs font-semibold text-white px-2.5 py-1.5 rounded-xl border border-slate-700/80 focus:outline-none focus:border-emerald-500 cursor-pointer"
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
              className="bg-slate-950 text-xs font-semibold text-white px-2.5 py-1.5 rounded-xl border border-slate-700/80 focus:outline-none focus:border-emerald-500 cursor-pointer"
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
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white active:scale-95 transition"
            title="Tháng sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. KHU VỰC BIỂU ĐỒ TRÒN (DOUGHNUT CHART) */}
      <section className="px-4 pt-4">
        <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              <span>Cơ cấu chi tiêu</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {categoryCount} danh mục
            </span>
          </div>

          {/* Biểu đồ Doughnut */}
          <div className="relative h-60 w-full flex items-center justify-center">
            {mounted && chartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomTooltip />} />
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={92}
                      paddingAngle={3}
                      dataKey="amount"
                      stroke="#0f172a"
                      strokeWidth={2}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Nhãn tâm biểu đồ */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                    Tổng chi tháng
                  </span>
                  <span className="text-sm font-extrabold text-white mt-0.5 max-w-[130px] truncate">
                    {formatVND(totalExpense)}
                  </span>
                  <span className="text-[10px] text-rose-400 font-medium flex items-center gap-0.5 mt-0.5">
                    <TrendingDown className="w-2.5 h-2.5" />
                    Đã xuất quỹ
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs flex flex-col items-center justify-center">
                <Layers className="w-8 h-8 text-slate-600 mb-2 stroke-[1.5]" />
                <p>Không có dữ liệu chi tiêu trong Tháng {selectedMonth}/{selectedYear}</p>
                <span className="text-[10px] text-slate-600 mt-1">
                  Hãy thử chọn tháng khác hoặc thêm giao dịch mới
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. DANH SÁCH LIỆT KÊ CHI TIẾT THEO DANH MỤC */}
      <section className="px-4 mt-5 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Chi tiết danh mục ({chartData.length})
          </h2>
          <span className="text-[11px] text-slate-500">
            Sắp xếp theo số tiền chi
          </span>
        </div>

        <div className="space-y-2.5">
          {chartData.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm transition hover:border-slate-700"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <h3 className="text-xs font-semibold text-white leading-none">
                      {item.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {item.count} giao dịch
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-extrabold text-rose-400 font-mono block">
                    - {formatVND(item.amount)}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-400 block mt-0.5">
                    {item.percentage}%
                  </span>
                </div>
              </div>

              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden mt-2 border border-slate-800/50">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}

          {chartData.length === 0 && (
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-slate-500 text-xs">
              Chưa có khoản chi nào được ghi nhận cho thời gian này.
            </div>
          )}
        </div>
      </section>

      {/* 4. Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
