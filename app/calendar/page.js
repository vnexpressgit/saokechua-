'use client';

import { useState, useEffect, useMemo } from 'react';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabaseClient';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
  Flag,
  Trash2,
  Banknote,
  Clock,
  Sparkles,
  CalendarCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';

// Dữ liệu việc mẫu chuẩn phong cách TickTick tài chính
const INITIAL_DEMO_TASKS = [
  {
    id: 'task-1',
    title: 'Thanh toán tiền điện sinh hoạt EVN',
    amount: 1250000,
    due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Ngày mai
    priority: 'high', // 'high' | 'medium' | 'low' | 'none'
    is_completed: false,
    note: 'Kỳ tháng 9 - Đóng qua app ngân hàng trước ngày 28',
  },
  {
    id: 'task-2',
    title: 'Đáo hạn thẻ tín dụng TPBank EVO',
    amount: 5400000,
    due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    priority: 'high',
    is_completed: false,
    note: 'Thanh toán toàn bộ để không bị tính lãi',
  },
  {
    id: 'task-3',
    title: 'Đóng cước Internet FPT cáp quang',
    amount: 275000,
    due_date: new Date().toISOString().split('T')[0], // Hôm nay
    priority: 'medium',
    is_completed: false,
    note: 'Gói cáp quang gia đình',
  },
  {
    id: 'task-4',
    title: 'Nộp tiền bảo hiểm nhân thọ quý 3',
    amount: 3200000,
    due_date: new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0],
    priority: 'medium',
    is_completed: false,
    note: 'Chuyển khoản theo số hợp đồng',
  },
  {
    id: 'task-5',
    title: 'Mua gói dịch vụ Cloud lưu trữ',
    amount: 69000,
    due_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    priority: 'low',
    is_completed: true,
    note: 'Gia hạn Google One',
  },
];

export default function CalendarPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Điều hướng lịch
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
  const [isMonthExpanded, setIsMonthExpanded] = useState(true); // Toggle xem cả tháng hoặc 1 tuần

  // Bộ lọc danh sách (Smart Filter)
  const [filterView, setFilterView] = useState('ALL'); // 'ALL' | 'DATE' | 'TODAY' | 'UPCOMING' | 'COMPLETED'

  // Modal / Form Thêm nhanh
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newPriority, setNewPriority] = useState('medium');
  const [newNote, setNewNote] = useState('');

  // 1. Tải danh sách Task (ưu tiên Supabase -> fallback localStorage)
  useEffect(() => {
    async function loadTasks() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('due_date', { ascending: true });

        if (!error && data && data.length > 0) {
          setTasks(data);
        } else {
          // Lấy từ LocalStorage nếu bảng chưa có
          const cached = localStorage.getItem('sepay_financial_tasks');
          if (cached) {
            setTasks(JSON.parse(cached));
          } else {
            setTasks(INITIAL_DEMO_TASKS);
            localStorage.setItem('sepay_financial_tasks', JSON.stringify(INITIAL_DEMO_TASKS));
          }
        }
      } catch (err) {
        console.warn('Fallback to LocalStorage tasks:', err);
        const cached = localStorage.getItem('sepay_financial_tasks');
        if (cached) {
          setTasks(JSON.parse(cached));
        } else {
          setTasks(INITIAL_DEMO_TASKS);
        }
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  // Lưu vào localStorage dự phòng mỗi khi tasks thay đổi
  const saveTasksState = (updatedList) => {
    setTasks(updatedList);
    try {
      localStorage.setItem('sepay_financial_tasks', JSON.stringify(updatedList));
    } catch (e) {
      console.warn('Lỗi lưu cache task:', e);
    }
  };

  // Toggle hoàn thành (TickTick Checkbox)
  const handleToggleComplete = async (taskId) => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, is_completed: !t.is_completed } : t
    );
    saveTasksState(updated);

    try {
      const target = updated.find((t) => t.id === taskId);
      await supabase
        .from('tasks')
        .update({ is_completed: target.is_completed })
        .eq('id', taskId);
    } catch (e) {
      // Ignored if DB table not set up yet
    }
  };

  // Xóa task
  const handleDeleteTask = async (taskId, e) => {
    e.stopPropagation();
    const updated = tasks.filter((t) => t.id !== taskId);
    saveTasksState(updated);

    try {
      await supabase.from('tasks').delete().eq('id', taskId);
    } catch (e) {
      // Ignored
    }
  };

  // Thêm task mới
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask = {
      id: 'task-' + Date.now(),
      title: newTitle.trim(),
      amount: newAmount ? Number(newAmount.replace(/[^0-9]/g, '')) : 0,
      due_date: newDueDate,
      priority: newPriority,
      is_completed: false,
      note: newNote.trim() || null,
      created_at: new Date().toISOString(),
    };

    const updated = [newTask, ...tasks];
    saveTasksState(updated);

    // Reset Form
    setNewTitle('');
    setNewAmount('');
    setNewNote('');
    setShowAddForm(false);

    // Sync Supabase nếu khả dụng
    try {
      await supabase.from('tasks').insert({
        title: newTask.title,
        amount: newTask.amount,
        due_date: newTask.due_date,
        priority: newTask.priority,
        is_completed: false,
        note: newTask.note,
      });
    } catch (e) {
      // Ignored
    }
  };

  // Format tiền tệ VND
  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(num || 0);
  };

  // Xây dựng lưới Lịch (Calendar Grid)
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Bắt đầu từ Thứ 2 (Monday = 1, Sunday = 0)
    let startDayOfWeek = firstDayOfMonth.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const days = [];

    // Ngày của tháng trước để lấp đầy hàng đầu
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDate - i);
      days.push({
        date: d.toISOString().split('T')[0],
        dayNumber: d.getDate(),
        isCurrentMonth: false,
      });
    }

    // Các ngày của tháng hiện tại
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d.toISOString().split('T')[0],
        dayNumber: i,
        isCurrentMonth: true,
      });
    }

    // Lấp đầy cuối tuần
    const remainingDays = 42 - days.length; // 6 hàng x 7 ngày
    for (let i = 1; i <= (remainingDays >= 7 ? remainingDays - 7 : remainingDays); i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d.toISOString().split('T')[0],
        dayNumber: d.getDate(),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentMonthDate]);

  // Map ngày -> các task trong ngày
  const taskDateMap = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!map[t.due_date]) {
        map[t.due_date] = [];
      }
      map[t.due_date].push(t);
    });
    return map;
  }, [tasks]);

  // Lọc danh sách công việc theo bộ lọc
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const filteredTasks = useMemo(() => {
    if (filterView === 'DATE') {
      return tasks.filter((t) => t.due_date === selectedDate);
    }
    if (filterView === 'TODAY') {
      return tasks.filter((t) => t.due_date === todayStr);
    }
    if (filterView === 'UPCOMING') {
      return tasks.filter((t) => !t.is_completed && t.due_date >= todayStr);
    }
    if (filterView === 'COMPLETED') {
      return tasks.filter((t) => t.is_completed);
    }
    // Mặc định 'ALL': Ưu tiên các việc chưa xong lên trước
    return [...tasks].sort((a, b) => {
      if (a.is_completed === b.is_completed) {
        return a.due_date.localeCompare(b.due_date);
      }
      return a.is_completed ? 1 : -1;
    });
  }, [tasks, filterView, selectedDate, todayStr]);

  // Thống kê tiến độ tài chính
  const taskStats = useMemo(() => {
    const totalCount = tasks.length;
    const completedCount = tasks.filter((t) => t.is_completed).length;
    const totalAmount = tasks.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const paidAmount = tasks
      .filter((t) => t.is_completed)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const pendingAmount = totalAmount - paidAmount;

    return {
      totalCount,
      completedCount,
      percent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      totalAmount,
      paidAmount,
      pendingAmount,
    };
  }, [tasks]);

  // Chuyển tháng
  const handlePrevMonth = () => {
    setCurrentMonthDate(
      new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1)
    );
  };
  const handleNextMonth = () => {
    setCurrentMonthDate(
      new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1)
    );
  };
  const handleGoToday = () => {
    const now = new Date();
    setCurrentMonthDate(now);
    setSelectedDate(now.toISOString().split('T')[0]);
    setFilterView('DATE');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 pb-24">
      {/* 1. HEADER TICKTICK STYLE */}
      <header className="px-4 pt-4 pb-3 bg-slate-950 sticky top-0 z-30 border-b border-slate-900 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                TickTick Planner
              </span>
              <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>
                  Tháng {currentMonthDate.getMonth() + 1}/{currentMonthDate.getFullYear()}
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  ({taskStats.completedCount}/{taskStats.totalCount} việc)
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleGoToday}
              className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-medium text-slate-300 hover:text-white hover:border-slate-700 active:scale-95 transition"
            >
              Hôm nay
            </button>
            <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 p-0.5">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-400 hover:text-white active:scale-90 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 text-slate-400 hover:text-white active:scale-90 transition"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => setIsMonthExpanded(!isMonthExpanded)}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
              title={isMonthExpanded ? 'Thu gọn lịch' : 'Mở rộng lịch'}
            >
              {isMonthExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* 2. MINI-CALENDAR GRID (LƯỚI LỊCH THÁNG) */}
        {isMonthExpanded && (
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80 shadow-inner mb-2 animate-in fade-in duration-200">
            {/* Header các ngày trong tuần */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((w, idx) => (
                <span
                  key={w}
                  className={`text-[10px] font-semibold ${
                    idx >= 5 ? 'text-rose-400/80' : 'text-slate-400'
                  }`}
                >
                  {w}
                </span>
              ))}
            </div>

            {/* Các ô ngày trong tháng */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((item) => {
                const isSelected = item.date === selectedDate;
                const isToday = item.date === todayStr;
                const dayTasks = taskDateMap[item.date] || [];
                const hasUncompleted = dayTasks.some((t) => !t.is_completed);
                const hasHighPriority = dayTasks.some(
                  (t) => !t.is_completed && t.priority === 'high'
                );

                return (
                  <button
                    key={item.date}
                    onClick={() => {
                      setSelectedDate(item.date);
                      setFilterView('DATE');
                    }}
                    className={`h-9 rounded-xl flex flex-col items-center justify-center relative transition active:scale-95 ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                        : isToday
                        ? 'bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/40'
                        : item.isCurrentMonth
                        ? 'text-slate-200 hover:bg-slate-800/70'
                        : 'text-slate-600 hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="text-xs leading-none">{item.dayNumber}</span>

                    {/* Dấu chấm chỉ báo công việc (Task Dot Indicator) */}
                    {dayTasks.length > 0 && (
                      <div className="flex items-center gap-0.5 mt-1">
                        <span
                          className={`w-1 h-1 rounded-full ${
                            isSelected
                              ? 'bg-white'
                              : hasHighPriority
                              ? 'bg-rose-500 animate-pulse'
                              : hasUncompleted
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                        />
                        {dayTasks.length > 1 && (
                          <span
                            className={`text-[8px] leading-none ${
                              isSelected ? 'text-white' : 'text-slate-400'
                            }`}
                          >
                            {dayTasks.length}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. THANH TIẾN ĐỘ TÀI CHÍNH (CASHFLOW TASK PROGRESS) */}
        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60 flex items-center justify-between gap-3 text-xs">
          <div className="flex-1">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400 font-medium">Hóa đơn cần thanh toán:</span>
              <span className="font-bold text-rose-400">
                {formatVND(taskStats.pendingAmount)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${taskStats.percent}%` }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-extrabold text-emerald-400">
              {taskStats.percent}%
            </span>
            <p className="text-[9px] text-slate-400">Hoàn thành</p>
          </div>
        </div>
      </header>

      {/* 4. SMART FILTERS TICKTICK */}
      <section className="px-4 pt-3 pb-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
        <button
          onClick={() => setFilterView('ALL')}
          className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition font-medium ${
            filterView === 'ALL'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
          }`}
        >
          Tất cả ({tasks.length})
        </button>
        <button
          onClick={() => setFilterView('DATE')}
          className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition font-medium ${
            filterView === 'DATE'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
          }`}
        >
          Ngày {selectedDate.split('-')[2]}/{selectedDate.split('-')[1]} (
          {taskDateMap[selectedDate]?.length || 0})
        </button>
        <button
          onClick={() => setFilterView('TODAY')}
          className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition font-medium ${
            filterView === 'TODAY'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
          }`}
        >
          Hôm nay
        </button>
        <button
          onClick={() => setFilterView('UPCOMING')}
          className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition font-medium ${
            filterView === 'UPCOMING'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
          }`}
        >
          Chờ nộp
        </button>
        <button
          onClick={() => setFilterView('COMPLETED')}
          className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition font-medium ${
            filterView === 'COMPLETED'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
          }`}
        >
          Đã xong
        </button>
      </section>

      {/* 5. DANH SÁCH TASK CHECKLIST (CHUẨN TICKTICK) */}
      <main className="px-4 py-2 flex-1 space-y-2.5 overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-2xl bg-slate-900/50 border border-slate-800/60 animate-pulse"
              />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
            <CalendarCheck className="w-9 h-9 text-slate-700 mb-2 stroke-[1.5]" />
            <p className="font-medium text-slate-400">Không có công việc nào trong danh mục này.</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Bấm nút &quot;+ Thêm việc&quot; bên dưới để tạo nhắc nhở mới.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isOverdue = !task.is_completed && task.due_date < todayStr;
            const isToday = task.due_date === todayStr;

            // Màu viền priority TickTick
            const priorityBorder =
              task.priority === 'high'
                ? 'border-rose-500 text-rose-400'
                : task.priority === 'medium'
                ? 'border-amber-400 text-amber-400'
                : task.priority === 'low'
                ? 'border-blue-400 text-blue-400'
                : 'border-slate-500 text-slate-400';

            return (
              <div
                key={task.id}
                onClick={() => handleToggleComplete(task.id)}
                className={`group p-3.5 rounded-2xl border transition active:scale-[0.98] cursor-pointer shadow-sm relative overflow-hidden flex items-start gap-3 ${
                  task.is_completed
                    ? 'bg-slate-950/60 border-slate-900 text-slate-500 opacity-60'
                    : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800/80 text-slate-200'
                }`}
              >
                {/* Checkbox tròn TickTick */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleComplete(task.id);
                  }}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition shrink-0 ${
                    task.is_completed
                      ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-sm'
                      : `bg-transparent hover:bg-slate-800 ${priorityBorder}`
                  }`}
                >
                  {task.is_completed && <CheckCircle2 className="w-3.5 h-3.5 fill-current" />}
                </button>

                {/* Nội dung Task */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3
                      className={`text-xs font-semibold tracking-tight truncate ${
                        task.is_completed ? 'line-through text-slate-500' : 'text-slate-100'
                      }`}
                    >
                      {task.title}
                    </h3>

                    {/* Số tiền dự kiến */}
                    {task.amount > 0 && (
                      <span
                        className={`text-xs font-bold tracking-tight shrink-0 flex items-center gap-1 ${
                          task.is_completed ? 'text-slate-500' : 'text-rose-400'
                        }`}
                      >
                        <Banknote className="w-3 h-3 text-rose-400/80" />
                        {formatVND(task.amount)}
                      </span>
                    )}
                  </div>

                  {/* Note nếu có */}
                  {task.note && (
                    <p className="text-[11px] text-slate-400 mb-1.5 truncate">{task.note}</p>
                  )}

                  {/* Metadata (Hạn chót & Priority) */}
                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/40">
                    <div className="flex items-center gap-2">
                      {/* Ngày hạn */}
                      <span
                        className={`flex items-center gap-1 font-medium ${
                          isOverdue
                            ? 'text-rose-400 font-bold'
                            : isToday
                            ? 'text-amber-400 font-bold'
                            : 'text-slate-400'
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {isOverdue
                          ? `Quá hạn (${task.due_date})`
                          : isToday
                          ? 'Hôm nay'
                          : `Hạn: ${task.due_date}`}
                      </span>

                      {/* Cờ Priority */}
                      <span className={`flex items-center gap-0.5 ${priorityBorder}`}>
                        <Flag className="w-2.5 h-2.5" />
                        <span className="capitalize text-[9px]">{task.priority}</span>
                      </span>
                    </div>

                    {/* Nút xóa */}
                    <button
                      onClick={(e) => handleDeleteTask(task.id, e)}
                      title="Xóa công việc"
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* 6. NÚT NỔI THÊM VIỆC (QUICK ADD BUTTON) */}
      <div className="fixed bottom-20 right-4 z-40 max-w-md">
        <button
          onClick={() => {
            setNewDueDate(selectedDate || todayStr);
            setShowAddForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-xl active:scale-95 transition"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Thêm việc</span>
        </button>
      </div>

      {/* 7. MODAL THÊM CÔNG VIỆC MỚI (TICKTICK QUICK ADD MODAL) */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold text-white">Thêm việc cần chi / Hạn nộp</h2>
              </div>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              {/* Tiêu đề việc */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">
                  Tên công việc / Hóa đơn *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Đóng tiền mạng FPT, Đáo hạn thẻ tín dụng..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              {/* Số tiền dự kiến & Ngày hạn */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 mb-1 block">
                    Số tiền dự kiến (₫)
                  </label>
                  <input
                    type="number"
                    placeholder="VD: 500000"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 mb-1 block">
                    Ngày hết hạn *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Mức độ ưu tiên (Priority) */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">
                  Mức độ ưu tiên
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'high', label: '🔴 Cao', color: 'border-rose-500' },
                    { id: 'medium', label: '🟡 Vừa', color: 'border-amber-400' },
                    { id: 'low', label: '🔵 Thấp', color: 'border-blue-400' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewPriority(p.id)}
                      className={`py-1.5 rounded-xl text-xs font-semibold border transition ${
                        newPriority === p.id
                          ? 'bg-slate-800 border-blue-500 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">
                  Ghi chú thêm
                </label>
                <input
                  type="text"
                  placeholder="Ghi chú tài khoản, số hợp đồng..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Nút Submit */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30"
                >
                  Tạo nhắc nhở
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. THANH ĐIỀU HƯỚNG DƯỚI (BOTTOM NAV) */}
      <BottomNav />
    </div>
  );
}
