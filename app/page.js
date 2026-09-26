'use client';

import { useState, useEffect, useMemo } from 'react';
import BottomNav from '@/components/BottomNav';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Calendar,
  FileText,
  X,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Landmark,
  Layers
} from 'lucide-react';

// Dữ liệu mẫu chuẩn phong cách biên tập VnExpress khi chưa kết nối
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
    amount: 25000000,
    type: 'IN',
    content: 'CTY ABC CHUYEN LUONG THANG 09/2026',
    category_id: 2,
    note: 'Lương chính thức',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    categories: { id: 2, name: 'Lương & Thưởng', color: '#24a148' },
  },
  {
    id: 2,
    amount: 45000,
    type: 'OUT',
    content: 'HIGHLANDS COFFEE - QR MBBANK 0987654321',
    category_id: 1,
    note: 'Cà phê sáng cùng đồng nghiệp',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    categories: { id: 1, name: 'Ăn uống & Cà phê', color: '#b13460' },
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

  // Bộ lọc
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'IN' | 'OUT'

  // Modal / Drawer chỉnh sửa
  const [selectedTx, setSelectedTx] = useState(null);
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Format tiền tệ VND (Font số: Roboto Mono)
  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(num || 0);
  };

  // Format ngày giờ chuẩn báo chí
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
      // 1. Lấy danh mục
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (!catError && catData && catData.length > 0) {
        setCategories(catData);
      }

      // 2. Lấy danh sách giao dịch
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
            ? `Đã đồng bộ ${data.added} giao dịch mới từ ngân hàng!`
            : 'Tất cả giao dịch từ SePay đã được cập nhật mới nhất.',
          type: 'positive',
        });
        await fetchData();
      } else {
        setSyncToast({
          message: data.message || 'Lỗi kết nối tới hệ thống SePay',
          type: 'negative',
        });
      }
    } catch (err) {
      setSyncToast({
        message: 'Lỗi đường truyền tới dịch vụ đồng bộ SePay',
        type: 'negative',
      });
    } finally {
      setIsSyncingSepay(false);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Tính toán số liệu thống kê tháng
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

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

  // Lưu cập nhật
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

        if (error) throw error;
      }

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
      alert('Không thể lưu thay đổi. Vui lòng thử lại!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-[#ffffff] text-[#202020]">
      {/* Đường viền nhận diện thương hiệu VnExpress Accent (#b13460) ở đỉnh đầu */}
      <div className="h-[3px] bg-[#b13460] w-full" />

      {/* 1. HEADER: Thanh tiêu đề chuẩn tòa soạn báo chí */}
      <header className="px-4 pt-3.5 pb-3 bg-[#ffffff] sticky top-0 z-30 border-b border-[#d6d6d6]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-ui text-[11px] font-bold text-[#b13460] tracking-normal">
                VnExpress
              </span>
              <span className="text-[#9f9f9f] text-[10px]">•</span>
              <span className="font-ui text-[11px] text-[#5f5f5f]">
                Tài chính & Sao kê
              </span>
            </div>
            <h1 className="font-serif text-[18px] font-bold text-[#202020] leading-tight">
              {stats.monthName}
              <span className="font-ui text-[12px] font-normal text-[#7f7f7f] ml-1.5">
                ({transactions.length} giao dịch)
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút Đồng bộ SePay (Accent Rest #b13460) */}
            <button
              onClick={handleSyncSepay}
              disabled={isSyncingSepay}
              title="Đồng bộ giao dịch ngân hàng từ SePay"
              className="h-8 px-3 rounded-[8px] bg-[#b13460] hover:bg-[#a02e55] active:bg-[#8f274a] text-[#ffffff] font-ui text-[13px] font-bold flex items-center gap-1.5 state-layer disabled:opacity-30"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncingSepay ? 'animate-spin' : ''}`}
              />
              <span>Đồng bộ SePay</span>
            </button>

            {/* Nút Làm mới (Contained Button #f3f3f3) */}
            <button
              onClick={() => {
                setIsRefreshing(true);
                fetchData();
              }}
              title="Làm mới dữ liệu"
              className="h-8 w-8 rounded-[8px] bg-[#f3f3f3] hover:bg-[#ececec] border border-[#d6d6d6] text-[#5f5f5f] flex items-center justify-center state-layer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#b13460]' : ''}`}
              />
            </button>

            {/* Trạng thái kết nối */}
            <div
              className={`h-6 px-2 rounded-[4px] font-ui text-[11px] font-medium flex items-center gap-1 border ${
                configured
                  ? 'bg-[#d5eddc] text-[#24a148] border-[#24a148]'
                  : 'bg-[#fce8da] text-[#ee853b] border-[#ee853b]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  configured ? 'bg-[#24a148]' : 'bg-[#ee853b]'
                }`}
              />
              <span>{configured ? 'Trực tuyến' : 'Cục bộ'}</span>
            </div>
          </div>
        </div>

        {/* Thẻ Thống Kê Dòng Tiền (Surface Paper: #fcfaf6 - Báo giấy ấm) */}
        <div className="grid grid-cols-3 bg-[#fcfaf6] rounded-[4px] border border-[#d6d6d6] p-2.5">
          {/* Tổng thu */}
          <div className="flex flex-col items-center justify-center text-center px-1">
            <span className="font-ui text-[11px] font-medium text-[#5f5f5f] flex items-center gap-1">
              <ArrowDownLeft className="w-3 h-3 text-[#24a148]" />
              Tổng thu
            </span>
            <span className="font-mono text-[13px] font-bold text-[#24a148] mt-0.5 truncate max-w-full">
              {formatVND(stats.totalIncome)}
            </span>
          </div>

          {/* Tổng chi (Divider 1px ngăn cách) */}
          <div className="flex flex-col items-center justify-center text-center px-1 border-x border-[#d6d6d6]">
            <span className="font-ui text-[11px] font-medium text-[#5f5f5f] flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-[#da1e28]" />
              Tổng chi
            </span>
            <span className="font-mono text-[13px] font-bold text-[#da1e28] mt-0.5 truncate max-w-full">
              {formatVND(stats.totalExpense)}
            </span>
          </div>

          {/* Dư còn lại */}
          <div className="flex flex-col items-center justify-center text-center px-1">
            <span className="font-ui text-[11px] font-medium text-[#5f5f5f]">
              Dư còn lại
            </span>
            <span
              className={`font-mono text-[13px] font-bold mt-0.5 truncate max-w-full ${
                stats.netBalance >= 0 ? 'text-[#202020]' : 'text-[#da1e28]'
              }`}
            >
              {formatVND(stats.netBalance)}
            </span>
          </div>
        </div>
      </header>

      {/* Thông báo AlertToast chuẩn VnExpress (Trái: viền 2px semantic) */}
      {syncToast && (
        <div className="px-4 pt-2.5">
          <div
            className={`p-3 rounded-[4px] text-xs flex items-center gap-2 border-l-2 transition-all duration-100 ${
              syncToast.type === 'positive'
                ? 'bg-[#d5eddc] border-[#24a148] text-[#202020]'
                : 'bg-[#f8d4d6] border-[#da1e28] text-[#202020]'
            }`}
          >
            {syncToast.type === 'positive' ? (
              <CheckCircle2 className="w-4 h-4 text-[#24a148] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#da1e28] shrink-0" />
            )}
            <span className="font-sans flex-1 text-[13px] leading-snug">
              {syncToast.message}
            </span>
            <button
              onClick={() => setSyncToast(null)}
              className="text-[#7f7f7f] hover:text-[#000000]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. THANH BỘ LỌC VÀ TIÊU ĐỀ MỤC */}
      <section className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-1.5">
          <h2 className="font-ui text-[13px] font-bold text-[#202020]">
            Lịch sử giao dịch
          </h2>
          <span className="font-mono text-[11px] text-[#7f7f7f]">
            ({filteredTransactions.length})
          </span>
        </div>

        {/* Tab Filter Pills (radius 8px) */}
        <div className="flex items-center bg-[#f3f3f3] p-0.5 rounded-[8px] border border-[#d6d6d6]">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1 rounded-[6px] font-ui text-[12px] transition duration-100 ${
              filterType === 'ALL'
                ? 'bg-[#ffffff] text-[#202020] font-bold border border-[#9f9f9f]'
                : 'text-[#5f5f5f] hover:text-[#202020]'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilterType('IN')}
            className={`px-2.5 py-1 rounded-[6px] font-ui text-[12px] transition duration-100 ${
              filterType === 'IN'
                ? 'bg-[#d5eddc] text-[#24a148] font-bold border border-[#24a148]'
                : 'text-[#5f5f5f] hover:text-[#24a148]'
            }`}
          >
            Tiền vào
          </button>
          <button
            onClick={() => setFilterType('OUT')}
            className={`px-2.5 py-1 rounded-[6px] font-ui text-[12px] transition duration-100 ${
              filterType === 'OUT'
                ? 'bg-[#f8d4d6] text-[#da1e28] font-bold border border-[#da1e28]'
                : 'text-[#5f5f5f] hover:text-[#da1e28]'
            }`}
          >
            Tiền ra
          </button>
        </div>
      </section>

      {/* 3. DANH SÁCH GIAO DỊCH DẠNG THẺ BÁO CHÍ (DENSE & FLAT) */}
      <main className="px-4 py-2.5 flex-1 space-y-2 overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-[4px] bg-[#fafafa] border border-[#d6d6d6] animate-pulse"
              />
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-16 text-center text-[#7f7f7f] text-xs flex flex-col items-center justify-center">
            <Layers className="w-8 h-8 text-[#9f9f9f] mb-2 stroke-[1.5]" />
            <p className="font-ui">Chưa có giao dịch phù hợp trong bộ lọc này.</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isIncome = tx.type === 'IN';
            const catName = tx.categories?.name || 'Chưa phân loại';

            return (
              <div
                key={tx.id}
                onClick={() => handleOpenEdit(tx)}
                className="group p-3 rounded-[4px] bg-[#ffffff] hover:bg-[#fafafa] border border-[#d6d6d6] hover:border-[#9f9f9f] transition duration-100 cursor-pointer relative overflow-hidden"
              >
                {/* Vạch màu nhận diện dòng tiền: 2px hairline bên trái */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                    isIncome ? 'bg-[#24a148]' : 'bg-[#da1e28]'
                  }`}
                />

                {/* Dòng 1: Danh mục, Ngân hàng & Số tiền */}
                <div className="flex items-center justify-between gap-2 pl-1 mb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Badge danh mục */}
                    <span className="font-ui text-[11px] font-medium text-[#5f5f5f] bg-[#f3f3f3] border border-[#d6d6d6] px-2 py-0.5 rounded-[2px]">
                      {catName}
                    </span>

                    {/* Badge ngân hàng SePay */}
                    {tx.gateway && (
                      <span className="font-ui text-[10px] font-medium text-[#365983] bg-[#eaf0f8] border border-[#466fa1] px-1.5 py-0.5 rounded-[2px] flex items-center gap-1">
                        <Landmark className="w-2.5 h-2.5" />
                        {tx.gateway}
                      </span>
                    )}
                  </div>

                  {/* Số tiền định dạng font-mono chuẩn báo cáo */}
                  <span
                    className={`font-mono text-[14px] font-bold tracking-tight ${
                      isIncome ? 'text-[#24a148]' : 'text-[#da1e28]'
                    }`}
                  >
                    {isIncome ? '+' : '-'} {formatVND(tx.amount)}
                  </span>
                </div>

                {/* Dòng 2: Nội dung giao dịch (Font Arial, text-regular) */}
                <div className="pl-1 mb-1.5">
                  <p className="font-sans text-[13px] text-[#202020] leading-snug line-clamp-2">
                    {tx.content || 'Giao dịch ngân hàng'}
                  </p>
                </div>

                {/* Dòng 3: Ghi chú & Ngày giờ (Hairline divider ngăn cách) */}
                <div className="flex items-center justify-between text-[11px] text-[#7f7f7f] pl-1 pt-1.5 border-t border-[rgba(0,0,0,0.06)]">
                  <div className="flex items-center gap-1 truncate max-w-[65%]">
                    {tx.note ? (
                      <span className="font-sans text-[#5f5f5f] italic truncate flex items-center gap-1">
                        <FileText className="w-3 h-3 text-[#7f7f7f] shrink-0" />
                        {tx.note}
                      </span>
                    ) : (
                      <span className="font-sans text-[#9f9f9f] italic">
                        Chạm để thêm ghi chú...
                      </span>
                    )}
                  </div>

                  <div className="font-mono text-[10px] text-[#7f7f7f] shrink-0 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#9f9f9f]" />
                    <span>{formatDateTime(tx.transaction_date || tx.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* 4. MODAL CHỈNH SỬA GIAO DỊCH (CHUẨN FORM VNEXPRESS) */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0"
            onClick={handleCloseEdit}
          />

          <div className="relative w-full max-w-md bg-[#ffffff] rounded-t-[8px] sm:rounded-[4px] border border-[#d6d6d6] p-4 z-10 space-y-3.5 animate-in slide-in-from-bottom duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-2 border-b border-[#d6d6d6]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#b13460]" />
                <h3 className="font-serif text-[16px] font-bold text-[#202020]">
                  Cập nhật giao dịch
                </h3>
              </div>
              <button
                onClick={handleCloseEdit}
                className="text-[#7f7f7f] hover:text-[#000000] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chi tiết nội dung giao dịch gốc */}
            <div className="p-3 bg-[#fafafa] rounded-[4px] border border-[#d6d6d6] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-ui text-[11px] text-[#7f7f7f]">Số tiền:</span>
                <span
                  className={`font-mono text-[14px] font-bold ${
                    selectedTx.type === 'IN' ? 'text-[#24a148]' : 'text-[#da1e28]'
                  }`}
                >
                  {selectedTx.type === 'IN' ? '+' : '-'} {formatVND(selectedTx.amount)}
                </span>
              </div>
              <div className="font-sans text-[12px] text-[#202020] leading-snug">
                {selectedTx.content}
              </div>
            </div>

            <form onSubmit={handleSaveUpdate} className="space-y-3">
              {/* Chọn danh mục */}
              <div>
                <label className="font-ui text-[12px] font-medium text-[#5f5f5f] mb-1 block">
                  Danh mục phân loại
                </label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full h-10 bg-[#fafafa] border border-[#9f9f9f] rounded-[4px] px-3 font-sans text-[13px] text-[#202020] focus:border-[#0590de]"
                >
                  <option value="">Chưa phân loại</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="font-ui text-[12px] font-medium text-[#5f5f5f] mb-1 block">
                  Ghi chú giao dịch
                </label>
                <input
                  type="text"
                  placeholder="Nhập ghi chú chi tiết..."
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full h-10 bg-[#fafafa] border border-[#9f9f9f] rounded-[4px] px-3 font-sans text-[13px] text-[#202020] focus:border-[#0590de]"
                />
              </div>

              {/* Thông báo thành công */}
              {saveSuccess && (
                <div className="p-2 rounded-[4px] bg-[#d5eddc] border-l-2 border-[#24a148] text-[#24a148] font-ui text-[12px] flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Đã cập nhật thành công!</span>
                </div>
              )}

              {/* Nút hành động */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="flex-1 h-10 rounded-[8px] bg-[#f3f3f3] hover:bg-[#ececec] border border-[#d6d6d6] text-[#5f5f5f] font-ui text-[13px] font-medium state-layer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 h-10 rounded-[8px] bg-[#b13460] hover:bg-[#a02e55] active:bg-[#8f274a] text-[#ffffff] font-ui text-[13px] font-bold state-layer disabled:opacity-30"
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. THANH ĐIỀU HƯỚNG DƯỚI */}
      <BottomNav />
    </div>
  );
}
