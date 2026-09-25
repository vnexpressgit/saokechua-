'use client';

import { useState, useEffect, useMemo } from 'react';
import BottomNav from '@/components/BottomNav';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Calendar,
  Tag,
  FileText,
  X,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  Landmark
} from 'lucide-react';

// Dữ liệu mẫu hiển thị khi chưa cấu hình hoặc đang kết nối Supabase
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
    amount: 25000000,
    type: 'IN',
    content: 'CTY ABC CHUYEN LUONG THANG 09/2026',
    category_id: 2,
    note: 'Lương chính thức',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    categories: { id: 2, name: 'Lương & Thưởng', color: '#10b981' },
  },
  {
    id: 2,
    amount: 45000,
    type: 'OUT',
    content: 'HIGHLANDS COFFEE - QR MBBANK 0987654321',
    category_id: 1,
    note: 'Cà phê sáng cùng đồng nghiệp',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    categories: { id: 1, name: 'Ăn uống & Cà phê', color: '#f59e0b' },
  },
  {
    id: 3,
    amount: 1500000,
    type: 'OUT',
    content: 'EVN HANOI TIEN DIEN KY 08/2026',
    category_id: 3,
    note: 'Tiền điện sinh hoạt gia đình',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    categories: { id: 3, name: 'Hóa đơn & Tiện ích', color: '#8b5cf6' },
  },
  {
    id: 4,
    amount: 75000,
    type: 'OUT',
    content: 'BE GROUP - CUOC XE 4 CHO TU NHA DEN CONG TY',
    category_id: 4,
    note: 'Đi làm trời mưa',
    created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
    categories: { id: 4, name: 'Di chuyển & Xăng xe', color: '#3b82f6' },
  },
  {
    id: 5,
    amount: 3000000,
    type: 'IN',
    content: 'NGUYEN VAN B CHUYEN TIEN DUA ANH FREELANCE',
    category_id: 2,
    note: 'Dự án sao kê tự động',
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    categories: { id: 2, name: 'Lương & Thưởng', color: '#10b981' },
  },
];

export default function HomeTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingSepay, setIsSyncingSepay] = useState(false);
  const [syncToast, setSyncToast] = useState(null);

  // Filter & Search
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'IN' | 'OUT'

  // Modal / Bottom Drawer State
  const [selectedTx, setSelectedTx] = useState(null);
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Format VND
  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(num || 0);
  };

  // Format Ngày Giờ
  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} • ${day}/${month}/${year}`;
  };

  // Tải dữ liệu từ Supabase
  const fetchData = async () => {
    const isReady = isSupabaseConfigured();
    setConfigured(isReady);

    if (!isReady) {
      setTransactions(FALLBACK_TRANSACTIONS);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // 1. Lấy danh sách danh mục
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (!catError && catData && catData.length > 0) {
        setCategories(catData);
      }

      // 2. Lấy danh sách giao dịch kèm join categories
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          type,
          content,
          category_id,
          note,
          gateway,
          code,
          transaction_date,
          created_at,
          categories (
            id,
            name,
            color
          )
        `)
        .order('transaction_date', { ascending: false, nullsFirst: false });

      if (!txError && txData) {
        setTransactions(txData);
      } else if (txError) {
        console.warn('Lỗi truy vấn bảng transactions:', txError.message);
        setTransactions(FALLBACK_TRANSACTIONS);
      }
    } catch (err) {
      console.error('Lỗi khi fetch Supabase:', err);
      setTransactions(FALLBACK_TRANSACTIONS);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Đồng bộ giao dịch thật từ SePay API
  const handleSyncSepay = async () => {
    try {
      setIsSyncingSepay(true);
      const res = await fetch('/api/sepay/sync', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setSyncToast({
          message: data.added > 0
            ? `Thành công: Đã nạp ${data.added} giao dịch mới từ ngân hàng!`
            : 'Đã đồng bộ: Tất cả giao dịch SePay đã cập nhật mới nhất.',
          type: 'success',
        });
        await fetchData();
      } else {
        setSyncToast({
          message: data.message || 'Lỗi khi đồng bộ SePay',
          type: 'error',
        });
      }
    } catch (err) {
      setSyncToast({
        message: 'Lỗi kết nối tới dịch vụ đồng bộ SePay',
        type: 'error',
      });
    } finally {
      setIsSyncingSepay(false);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Tính toán số liệu thống kê tháng hiện tại
  const stats = useMemo(() => {
    const currentMonth = 8; // Tháng 9 (0-indexed)
    const currentYear = 2026;

    const monthlyTxs = transactions.filter((t) => {
      const dateStr = t.transaction_date || t.created_at;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = monthlyTxs
      .filter((t) => t.type === 'IN')
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const expense = monthlyTxs
      .filter((t) => t.type === 'OUT')
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    return {
      totalIncome: income,
      totalExpense: expense,
      netBalance: income - expense,
      monthName: `Tháng ${currentMonth + 1}/${currentYear}`,
    };
  }, [transactions]);

  // Lọc giao dịch hiển thị
  const filteredTransactions = useMemo(() => {
    if (filterType === 'ALL') return transactions;
    return transactions.filter((t) => t.type === filterType);
  }, [transactions, filterType]);

  // Mở Drawer chỉnh sửa
  const handleOpenEdit = (tx) => {
    setSelectedTx(tx);
    setEditCategoryId(tx.category_id || (tx.categories?.id ?? ''));
    setEditNote(tx.note || '');
    setSaveSuccess(false);
  };

  // Đóng Drawer
  const handleCloseEdit = () => {
    if (isSaving) return;
    setSelectedTx(null);
    setSaveSuccess(false);
  };

  // Lưu thay đổi lên Supabase
  const handleSaveUpdate = async (e) => {
    e.preventDefault();
    if (!selectedTx) return;

    setIsSaving(true);
    const chosenCatId = editCategoryId ? String(editCategoryId) : null;
    const chosenCategory = categories.find((c) => String(c.id) === String(chosenCatId));

    try {
      if (configured) {
        const { error } = await supabase
          .from('transactions')
          .update({
            category_id: chosenCatId,
            note: editNote.trim(),
          })
          .eq('id', selectedTx.id);

        if (error) {
          throw error;
        }
      }

      // Cập nhật State tức thì (Optimistic UI Update)
      setTransactions((prev) =>
        prev.map((item) => {
          if (item.id === selectedTx.id) {
            return {
              ...item,
              category_id: chosenCatId,
              note: editNote.trim(),
              categories: chosenCategory
                ? {
                    id: chosenCategory.id,
                    name: chosenCategory.name,
                    color: chosenCategory.color,
                  }
                : item.categories,
            };
          }
          return item;
        })
      );

      setSaveSuccess(true);
      setTimeout(() => {
        handleCloseEdit();
      }, 700);
    } catch (err) {
      console.error('Lỗi khi cập nhật giao dịch:', err);
      alert('Không thể lưu thay đổi. Vui lòng kiểm tra kết nối Supabase!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-16 selection:bg-emerald-500 selection:text-white">
      {/* 1. HEADER: Thống kê nhanh tháng hiện tại */}
      <header className="px-4 pt-5 pb-4 bg-slate-950 sticky top-0 z-30 border-b border-slate-900 shadow-md">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Sao Kê Thu Chi
              </span>
              <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>{stats.monthName}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  ({transactions.length} GD)
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Nút Đồng bộ SePay ngân hàng thật */}
            <button
              onClick={handleSyncSepay}
              disabled={isSyncingSepay}
              title="Đồng bộ giao dịch thật từ SePay"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] font-semibold shadow-md active:scale-95 transition disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncingSepay ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">Đồng bộ</span> SePay
            </button>

            <button
              onClick={() => {
                setIsRefreshing(true);
                fetchData();
              }}
              title="Làm mới Supabase"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 active:scale-95 transition"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`}
              />
            </button>

            {/* Trạng thái Supabase */}
            <div
              className={`px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1 ${
                configured
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {configured ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Demo</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Thẻ Thống Kê Nhanh (Tổng Thu - Tổng Chi - Dư Còn Lại) */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900/90 rounded-2xl border border-slate-800/80 shadow-inner">
          {/* Tổng thu */}
          <div className="flex flex-col items-center justify-center p-1.5 text-center">
            <span className="text-[10px] font-medium text-slate-400 flex items-center gap-0.5">
              <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
              Tổng thu
            </span>
            <span className="text-xs font-bold text-emerald-400 mt-1 truncate max-w-full">
              {formatVND(stats.totalIncome)}
            </span>
          </div>

          {/* Tổng chi */}
          <div className="flex flex-col items-center justify-center p-1.5 text-center border-x border-slate-800/80">
            <span className="text-[10px] font-medium text-slate-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3 text-rose-400" />
              Tổng chi
            </span>
            <span className="text-xs font-bold text-rose-400 mt-1 truncate max-w-full">
              {formatVND(stats.totalExpense)}
            </span>
          </div>

          {/* Dư còn lại */}
          <div className="flex flex-col items-center justify-center p-1.5 text-center">
            <span className="text-[10px] font-medium text-slate-400">
              Dư còn lại
            </span>
            <span
              className={`text-xs font-bold mt-1 truncate max-w-full ${
                stats.netBalance >= 0 ? 'text-emerald-300' : 'text-rose-400'
              }`}
            >
              {formatVND(stats.netBalance)}
            </span>
          </div>
        </div>
      </header>

      {/* Thông báo trạng thái đồng bộ SePay (Toast) */}
      {syncToast && (
        <div className="px-4 pt-2">
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 border shadow-lg animate-in fade-in slide-in-from-top duration-200 ${
              syncToast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
            }`}
          >
            {syncToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="flex-1 font-medium">{syncToast.message}</span>
            <button
              onClick={() => setSyncToast(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. THANH BỘ LỌC GIAO DỊCH */}
      <section className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-300">
            Lịch sử giao dịch
          </span>
          <span className="text-[11px] text-slate-500">
            ({filteredTransactions.length})
          </span>
        </div>

        <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[11px]">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1 rounded-lg transition ${
              filterType === 'ALL'
                ? 'bg-slate-800 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilterType('IN')}
            className={`px-2.5 py-1 rounded-lg transition ${
              filterType === 'IN'
                ? 'bg-emerald-950 text-emerald-400 font-medium shadow-sm border border-emerald-500/30'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            Thu (+IN)
          </button>
          <button
            onClick={() => setFilterType('OUT')}
            className={`px-2.5 py-1 rounded-lg transition ${
              filterType === 'OUT'
                ? 'bg-rose-950 text-rose-400 font-medium shadow-sm border border-rose-500/30'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            Chi (-OUT)
          </button>
        </div>
      </section>

      {/* 3. DANH SÁCH GIAO DỊCH DẠNG CARD CUỘN DỌC */}
      <main className="px-4 py-2 flex-1 space-y-2.5 overflow-y-auto no-scrollbar">
        {loading ? (
          // Skeleton Loader tinh tế trong lúc đợi Supabase trả dữ liệu
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60 animate-pulse"
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="w-24 h-4 bg-slate-800 rounded-full" />
                  <div className="w-20 h-4 bg-slate-800 rounded-lg" />
                </div>
                <div className="w-3/4 h-3 bg-slate-800/70 rounded mb-3" />
                <div className="flex justify-between items-center pt-2 border-t border-slate-800/30">
                  <div className="w-16 h-2.5 bg-slate-800/50 rounded" />
                  <div className="w-20 h-2.5 bg-slate-800/50 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isIncome = tx.type === 'IN';
            const catName = tx.categories?.name || 'Chưa phân loại';
            const catColor = tx.categories?.color || '#64748b';

            return (
              <div
                key={tx.id}
                onClick={() => handleOpenEdit(tx)}
                className="group p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition active:scale-[0.98] cursor-pointer shadow-sm relative overflow-hidden"
              >
                {/* Vạch màu định danh loại giao dịch bên trái */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    isIncome ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />

                {/* Dòng 1: Badge Danh mục & Số tiền */}
                <div className="flex items-center justify-between gap-2 pl-1 mb-1.5">
                  {/* Badge Danh mục kèm màu động */}
                  <div className="flex items-center gap-1.5">
                    <div
                      style={{
                        backgroundColor: `${catColor}18`,
                        borderColor: `${catColor}40`,
                        color: catColor,
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tracking-tight"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: catColor }}
                      />
                      <span>{catName}</span>
                    </div>

                    {/* Badge Ngân hàng SePay (nếu có) */}
                    {tx.gateway && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Landmark className="w-2.5 h-2.5" />
                        <span>{tx.gateway}</span>
                      </div>
                    )}
                  </div>

                  {/* Số tiền định dạng VND: Đỏ nếu OUT, Xanh nếu IN */}
                  <span
                    className={`text-sm font-extrabold tracking-tight ${
                      isIncome ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isIncome ? '+' : '-'} {formatVND(tx.amount)}
                  </span>
                </div>

                {/* Dòng 2: Nội dung chuyển khoản gốc (content) */}
                <div className="pl-1 mb-2">
                  <p className="text-xs font-medium text-slate-200 line-clamp-2 leading-relaxed font-mono">
                    {tx.content || 'Không có nội dung'}
                  </p>
                </div>

                {/* Dòng 3: Ghi chú (nếu có) + Ngày giờ giao dịch */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pl-1 pt-1.5 border-t border-slate-800/50">
                  <div className="flex items-center gap-1 truncate max-w-[65%]">
                    {tx.note ? (
                      <span className="text-slate-300 italic truncate flex items-center gap-1">
                        <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                        {tx.note}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">
                        Chạm để thêm ghi chú...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0 font-medium">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{formatDateTime(tx.transaction_date || tx.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {!loading && filteredTransactions.length === 0 && (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
            <Layers className="w-8 h-8 text-slate-600 mb-2 stroke-[1.5]" />
            <p>Không có giao dịch nào phù hợp.</p>
          </div>
        )}
      </main>

      {/* 4. MODAL / BOTTOM DRAWER CHỈNH SỬA GIAO DỊCH */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center p-0 transition-opacity">
          {/* Backdrop click to dismiss */}
          <div
            className="absolute inset-0"
            onClick={handleCloseEdit}
          />

          {/* Drawer Container */}
          <div className="relative w-full max-w-md bg-slate-900 rounded-t-3xl border-t border-x border-slate-800 p-5 shadow-2xl z-10 animate-in slide-in-from-bottom duration-200">
            {/* Thanh kéo nhỏ (Handle bar) */}
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-4" />

            {/* Header Drawer */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Chỉnh sửa giao dịch
                </span>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span
                    className={
                      selectedTx.type === 'IN'
                        ? 'text-emerald-400 font-mono'
                        : 'text-rose-400 font-mono'
                    }
                  >
                    {selectedTx.type === 'IN' ? '+' : '-'} {formatVND(selectedTx.amount)}
                  </span>
                  <span className="text-xs text-slate-400 font-normal">
                    ({selectedTx.type === 'IN' ? 'Thu' : 'Chi'})
                  </span>
                </h3>
              </div>

              <button
                onClick={handleCloseEdit}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thông tin sao kê gốc */}
            <div className="my-3.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-1">
                Nội dung chuyển khoản gốc (Sao kê)
              </span>
              <p className="text-xs text-slate-200 font-mono leading-relaxed break-words">
                {selectedTx.content}
              </p>
              <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDateTime(selectedTx.created_at)}</span>
              </div>
            </div>

            {/* Form cập nhật Danh mục & Ghi chú */}
            <form onSubmit={handleSaveUpdate} className="space-y-3.5">
              {/* 1. Chọn lại Danh mục */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Danh mục giao dịch</span>
                </label>
                <div className="relative">
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-white focus:outline-none focus:border-emerald-500 transition appearance-none cursor-pointer"
                  >
                    <option value="">-- Chưa phân loại --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3 rotate-90 pointer-events-none" />
                </div>
              </div>

              {/* 2. Nhập / Sửa Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Ghi chú riêng</span>
                </label>
                <textarea
                  rows={2}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Thêm ghi chú để dễ dàng tìm kiếm hoặc theo dõi..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-white focus:outline-none focus:border-emerald-500 transition resize-none placeholder:text-slate-500"
                />
              </div>

              {/* Nút Lưu thay đổi */}
              <button
                type="submit"
                disabled={isSaving}
                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-[0.98] ${
                  saveSuccess
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                } ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang cập nhật Supabase...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Đã lưu thành công!</span>
                  </>
                ) : (
                  <>
                    <span>Lưu Thay Đổi</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
}
