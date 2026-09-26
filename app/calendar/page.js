'use client';

import { useState, useEffect, useMemo } from 'react';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabaseClient';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Flag,
  Trash2,
  Banknote,
  Clock,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

// Dữ liệu mẫu chuẩn phong cách biên tập VnExpress
const INITIAL_DEMO_TASKS = [
  {
    id: 'task-1',
    title: 'Thanh toán tiền điện sinh hoạt EVN',
    amount: 1250000,
    due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    priority: 'high',
    is_completed: false,
    note: 'Kỳ tháng 9 - Đóng qua ngân hàng trước ngày 28',
  },
  {
    id: 'task-2',
    title: 'Đáo hạn thẻ tín dụng TPBank EVO',
    amount: 5400000,
    due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    priority: 'high',
    is_completed: false,
    note: 'Thanh toán toàn bộ để không bị tính lãi phát sinh',
  },
  {
    id: 'task-3',
    title: 'Đóng cước Internet FPT cáp quang',
    amount: 275000,
    due_date: new Date().toISOString().split('T')[0],
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
    title: 'Mua gói dịch vụ đám mây lưu trữ',
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
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
  const [isMonthExpanded, setIsMonthExpanded] = useState(true);

  // Bộ lọc
  const [filterView, setFilterView] = useState('ALL'); // 'ALL' | 'DATE' | 'TODAY' | 'UPCOMING' | 'COMPLETED'

  // Modal tạo việc
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newPriority, setNewPriority] = useState('medium');
  const [newNote, setNewNote] = useState('');

  // 1. Tải danh sách công việc
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

  const saveTasksState = (updatedList) => {
    setTasks(updatedList);
    try {
      localStorage.setItem('sepay_financial_tasks', JSON.stringify(updatedList));
    } catch (e) {
      console.warn('Lỗi lưu cache task:', e);
    }
  };

  // Toggle hoàn thành
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
      // Ignored
    }
  };

  // Xóa công việc
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

  // Thêm công việc mới
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

    setNewTitle('');
    setNewAmount('');
    setNewNote('');
    setShowAddForm(false);

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

  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(num || 0);
  };

  // Lưới lịch tháng
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const days = [];

    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDate - i);
      days.push({
        date: d.toISOString().split('T')[0],
        dayNumber: d.getDate(),
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d.toISOString().split('T')[0],
        dayNumber: i,
        isCurrentMonth: true,
      });
    }

    const remainingDays = 42 - days.length;
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
    return [...tasks].sort((a, b) => {
      if (a.is_completed === b.is_completed) {
        return a.due_date.localeCompare(b.due_date);
      }
      return a.is_completed ? 1 : -1;
    });
  }, [tasks, filterView, selectedDate, todayStr]);

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
    <div className="flex flex-col min-h-screen pb-20 bg-[#ffffff] text-[#202020]">
      {/* Đường viền nhận diện thương hiệu VnExpress Accent (#b13460) */}
      <div className="h-[3px] bg-[#b13460] w-full" />

      {/* 1. HEADER: Lịch kế hoạch chi trả */}
      <header className="px-4 pt-3.5 pb-3 bg-[#ffffff] sticky top-0 z-30 border-b border-[#d6d6d6]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-ui text-[11px] font-bold text-[#b13460]">
                VnExpress
              </span>
              <span className="text-[#9f9f9f] text-[10px]">•</span>
              <span className="font-ui text-[11px] text-[#5f5f5f]">
                Lịch việc & Hóa đơn
              </span>
            </div>
            <h1 className="font-serif text-[18px] font-bold text-[#202020] leading-tight">
              Tháng {currentMonthDate.getMonth() + 1}/{currentMonthDate.getFullYear()}
              <span className="font-ui text-[12px] font-normal text-[#7f7f7f] ml-1.5">
                ({taskStats.completedCount}/{taskStats.totalCount} hoàn thành)
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleGoToday}
              className="h-8 px-2.5 rounded-[8px] bg-[#f3f3f3] hover:bg-[#ececec] border border-[#d6d6d6] text-[#5f5f5f] hover:text-[#202020] font-ui text-[12px] state-layer"
            >
              Hôm nay
            </button>
            <div className="flex items-center bg-[#f3f3f3] rounded-[8px] border border-[#d6d6d6] h-8">
              <button
                onClick={handlePrevMonth}
                className="w-7 h-full flex items-center justify-center text-[#5f5f5f] hover:text-[#202020] state-layer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-3 bg-[#d6d6d6]" />
              <button
                onClick={handleNextMonth}
                className="w-7 h-full flex items-center justify-center text-[#5f5f5f] hover:text-[#202020] state-layer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => setIsMonthExpanded(!isMonthExpanded)}
              className="h-8 w-8 rounded-[8px] bg-[#f3f3f3] hover:bg-[#ececec] border border-[#d6d6d6] text-[#5f5f5f] flex items-center justify-center state-layer"
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

        {/* 2. LƯỚI LỊCH THÁNG (SURFACE PAPER #fcfaf6) */}
        {isMonthExpanded && (
          <div className="bg-[#fcfaf6] p-3 rounded-[4px] border border-[#d6d6d6] mb-2.5 animate-in fade-in duration-100">
            {/* Hàng thứ trong tuần */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1 pb-1 border-b border-[rgba(0,0,0,0.06)]">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((w, idx) => (
                <span
                  key={w}
                  className={`font-ui text-[10px] font-bold ${
                    idx >= 5 ? 'text-[#da1e28]' : 'text-[#5f5f5f]'
                  }`}
                >
                  {w}
                </span>
              ))}
            </div>

            {/* Các ngày */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((item) => {
                const isSelected = item.date === selectedDate;
                const isToday = item.date === todayStr;
                const dayTasks = taskDateMap[item.date] || [];
                const hasHighPriority = dayTasks.some(
                  (t) => !t.is_completed && t.priority === 'high'
                );
                const hasUncompleted = dayTasks.some((t) => !t.is_completed);

                return (
                  <button
                    key={item.date}
                    onClick={() => {
                      setSelectedDate(item.date);
                      setFilterView('DATE');
                    }}
                    className={`h-8 rounded-[4px] flex flex-col items-center justify-center relative transition duration-100 ${
                      isSelected
                        ? 'bg-[#b13460] text-[#ffffff] font-bold'
                        : isToday
                        ? 'bg-[#fce6eb] text-[#b13460] font-bold border border-[#b13460]'
                        : item.isCurrentMonth
                        ? 'text-[#202020] hover:bg-[#ececec]'
                        : 'text-[#9f9f9f] hover:bg-[#ececec]'
                    }`}
                  >
                    <span className="font-mono text-[11px] leading-none">
                      {item.dayNumber}
                    </span>

                    {/* Chấm chỉ báo */}
                    {dayTasks.length > 0 && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <span
                          className={`w-1 h-1 rounded-full ${
                            isSelected
                              ? 'bg-[#ffffff]'
                              : hasHighPriority
                              ? 'bg-[#da1e28]'
                              : hasUncompleted
                              ? 'bg-[#ee853b]'
                              : 'bg-[#24a148]'
                          }`}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. TIẾN ĐỘ TÀI CHÍNH (SURFACE 100) */}
        <div className="bg-[#fafafa] p-2.5 rounded-[4px] border border-[#d6d6d6] flex items-center justify-between gap-3 text-xs">
          <div className="flex-1">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-ui text-[#5f5f5f]">Hóa đơn cần thanh toán:</span>
              <span className="font-mono font-bold text-[#da1e28]">
                {formatVND(taskStats.pendingAmount)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#ececec] rounded-[2px] overflow-hidden">
              <div
                className="h-full bg-[#b13460] transition-all duration-200"
                style={{ width: `${taskStats.percent}%` }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="font-mono text-[13px] font-bold text-[#b13460]">
              {taskStats.percent}%
            </span>
            <p className="font-ui text-[9px] text-[#7f7f7f]">Đã giải quyết</p>
          </div>
        </div>
      </header>

      {/* 4. THANH BỘ LỌC TABS CHUẨN VNEXPRESS */}
      <section className="px-4 pt-3 pb-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs border-b border-[rgba(0,0,0,0.06)]">
        <button
          onClick={() => setFilterView('ALL')}
          className={`h-8 px-3 rounded-[8px] font-ui text-[12px] whitespace-nowrap transition duration-100 ${
            filterView === 'ALL'
              ? 'bg-[#ffffff] text-[#202020] font-bold border border-[#9f9f9f]'
              : 'bg-[#f3f3f3] text-[#5f5f5f] hover:text-[#202020]'
          }`}
        >
          Tất cả ({tasks.length})
        </button>
        <button
          onClick={() => setFilterView('DATE')}
          className={`h-8 px-3 rounded-[8px] font-ui text-[12px] whitespace-nowrap transition duration-100 ${
            filterView === 'DATE'
              ? 'bg-[#ffffff] text-[#202020] font-bold border border-[#9f9f9f]'
              : 'bg-[#f3f3f3] text-[#5f5f5f] hover:text-[#202020]'
          }`}
        >
          Ngày {selectedDate.split('-')[2]}/{selectedDate.split('-')[1]} (
          {taskDateMap[selectedDate]?.length || 0})
        </button>
        <button
          onClick={() => setFilterView('TODAY')}
          className={`h-8 px-3 rounded-[8px] font-ui text-[12px] whitespace-nowrap transition duration-100 ${
            filterView === 'TODAY'
              ? 'bg-[#ffffff] text-[#202020] font-bold border border-[#9f9f9f]'
              : 'bg-[#f3f3f3] text-[#5f5f5f] hover:text-[#202020]'
          }`}
        >
          Hôm nay
        </button>
        <button
          onClick={() => setFilterView('UPCOMING')}
          className={`h-8 px-3 rounded-[8px] font-ui text-[12px] whitespace-nowrap transition duration-100 ${
            filterView === 'UPCOMING'
              ? 'bg-[#ffffff] text-[#202020] font-bold border border-[#9f9f9f]'
              : 'bg-[#f3f3f3] text-[#5f5f5f] hover:text-[#202020]'
          }`}
        >
          Chờ nộp
        </button>
        <button
          onClick={() => setFilterView('COMPLETED')}
          className={`h-8 px-3 rounded-[8px] font-ui text-[12px] whitespace-nowrap transition duration-100 ${
            filterView === 'COMPLETED'
              ? 'bg-[#ffffff] text-[#202020] font-bold border border-[#9f9f9f]'
              : 'bg-[#f3f3f3] text-[#5f5f5f] hover:text-[#202020]'
          }`}
        >
          Đã xong
        </button>
      </section>

      {/* 5. DANH SÁCH CÔNG VIỆC CHECKLIST */}
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
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-[#7f7f7f] text-xs flex flex-col items-center justify-center">
            <CalendarCheck className="w-8 h-8 text-[#9f9f9f] mb-2 stroke-[1.5]" />
            <p className="font-ui">Không có công việc nào trong danh mục này.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isOverdue = !task.is_completed && task.due_date < todayStr;
            const isToday = task.due_date === todayStr;

            const priorityColor =
              task.priority === 'high'
                ? 'border-[#da1e28] text-[#da1e28]'
                : task.priority === 'medium'
                ? 'border-[#ee853b] text-[#ee853b]'
                : task.priority === 'low'
                ? 'border-[#466fa1] text-[#466fa1]'
                : 'border-[#9f9f9f] text-[#7f7f7f]';

            return (
              <div
                key={task.id}
                onClick={() => handleToggleComplete(task.id)}
                className={`p-3 rounded-[4px] border transition duration-100 cursor-pointer flex items-start gap-2.5 ${
                  task.is_completed
                    ? 'bg-[#fafafa] border-[#d6d6d6] opacity-60'
                    : 'bg-[#ffffff] hover:bg-[#fafafa] border-[#d6d6d6] hover:border-[#9f9f9f]'
                }`}
              >
                {/* Checkbox tròn TickTick */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleComplete(task.id);
                  }}
                  className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center transition shrink-0 ${
                    task.is_completed
                      ? 'bg-[#24a148] border-[#24a148] text-[#ffffff]'
                      : `bg-transparent ${priorityColor}`
                  }`}
                >
                  {task.is_completed && <CheckCircle2 className="w-3.5 h-3.5 fill-current" />}
                </button>

                {/* Nội dung việc */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h3
                      className={`font-ui text-[13px] font-bold truncate ${
                        task.is_completed
                          ? 'line-through text-[#7f7f7f]'
                          : 'text-[#202020]'
                      }`}
                    >
                      {task.title}
                    </h3>

                    {task.amount > 0 && (
                      <span
                        className={`font-mono text-[13px] font-bold shrink-0 flex items-center gap-1 ${
                          task.is_completed ? 'text-[#7f7f7f]' : 'text-[#da1e28]'
                        }`}
                      >
                        <Banknote className="w-3 h-3 text-[#da1e28]" />
                        {formatVND(task.amount)}
                      </span>
                    )}
                  </div>

                  {task.note && (
                    <p className="font-sans text-[12px] text-[#5f5f5f] mb-1 truncate">
                      {task.note}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono flex items-center gap-1 ${
                          isOverdue
                            ? 'text-[#da1e28] font-bold'
                            : isToday
                            ? 'text-[#ee853b] font-bold'
                            : 'text-[#7f7f7f]'
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {isOverdue
                          ? `Quá hạn: ${task.due_date}`
                          : isToday
                          ? 'Hôm nay'
                          : `Hạn: ${task.due_date}`}
                      </span>

                      <span className={`font-ui flex items-center gap-0.5 ${priorityColor}`}>
                        <Flag className="w-2.5 h-2.5" />
                        <span className="capitalize text-[9px]">{task.priority}</span>
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteTask(task.id, e)}
                      title="Xóa công việc"
                      className="text-[#9f9f9f] hover:text-[#da1e28] p-0.5 rounded transition"
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

      {/* 6. NÚT TẠO VIỆC NHANH (Accent Rest #b13460, Height 36px, Radius 8px) */}
      <div className="fixed bottom-16 right-4 z-30 max-w-md">
        <button
          onClick={() => {
            setNewDueDate(selectedDate || todayStr);
            setShowAddForm(true);
          }}
          className="h-9 px-3.5 rounded-[8px] bg-[#b13460] hover:bg-[#a02e55] active:bg-[#8f274a] text-[#ffffff] font-ui text-[13px] font-bold flex items-center gap-1.5 state-layer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Thêm việc</span>
        </button>
      </div>

      {/* 7. MODAL THÊM CÔNG VIỆC MỚI */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 animate-in fade-in duration-100">
          <div className="w-full max-w-md bg-[#ffffff] border border-[#d6d6d6] rounded-t-[8px] sm:rounded-[4px] p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#d6d6d6]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#b13460]" />
                <h3 className="font-serif text-[16px] font-bold text-[#202020]">
                  Thêm việc cần chi / Hóa đơn
                </h3>
              </div>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-[#7f7f7f] hover:text-[#000000] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="font-ui text-[12px] font-medium text-[#5f5f5f] mb-1 block">
                  Tên công việc / Hóa đơn *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Đóng tiền điện EVN, Đáo hạn thẻ tín dụng..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-10 bg-[#fafafa] border border-[#9f9f9f] rounded-[4px] px-3 font-sans text-[13px] text-[#202020] focus:border-[#0590de]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-ui text-[12px] font-medium text-[#5f5f5f] mb-1 block">
                    Số tiền dự kiến (₫)
                  </label>
                  <input
                    type="number"
                    placeholder="VD: 500000"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full h-10 bg-[#fafafa] border border-[#9f9f9f] rounded-[4px] px-3 font-mono text-[13px] text-[#202020] focus:border-[#0590de]"
                  />
                </div>
                <div>
                  <label className="font-ui text-[12px] font-medium text-[#5f5f5f] mb-1 block">
                    Ngày hết hạn *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full h-10 bg-[#fafafa] border border-[#9f9f9f] rounded-[4px] px-3 font-mono text-[13px] text-[#202020] focus:border-[#0590de]"
                  />
                </div>
              </div>

              <div>
                <label className="font-ui text-[12px] font-medium text-[#5f5f5f] mb-1 block">
                  Mức độ ưu tiên
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'high', label: 'Cao (Đỏ)', color: 'text-[#da1e28]' },
                    { id: 'medium', label: 'Vừa (Cam)', color: 'text-[#ee853b]' },
                    { id: 'low', label: 'Thấp (Xanh)', color: 'text-[#466fa1]' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewPriority(p.id)}
                      className={`h-9 rounded-[8px] font-ui text-[12px] font-bold border transition duration-100 ${
                        newPriority === p.id
                          ? 'bg-[#ffffff] border-[#b13460] text-[#b13460]'
                          : 'bg-[#f3f3f3] border-[#d6d6d6] text-[#5f5f5f]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-ui text-[12px] font-medium text-[#5f5f5f] mb-1 block">
                  Ghi chú thêm
                </label>
                <input
                  type="text"
                  placeholder="Ghi chú số hợp đồng, tài khoản..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full h-10 bg-[#fafafa] border border-[#9f9f9f] rounded-[4px] px-3 font-sans text-[13px] text-[#202020] focus:border-[#0590de]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 h-10 rounded-[8px] bg-[#f3f3f3] hover:bg-[#ececec] border border-[#d6d6d6] text-[#5f5f5f] font-ui text-[13px] font-medium state-layer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-[8px] bg-[#b13460] hover:bg-[#a02e55] active:bg-[#8f274a] text-[#ffffff] font-ui text-[13px] font-bold state-layer"
                >
                  Tạo nhắc nhở
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. THANH ĐIỀU HƯỚNG DƯỚI */}
      <BottomNav />
    </div>
  );
}
