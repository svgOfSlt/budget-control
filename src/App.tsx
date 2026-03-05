import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Plus, X, Pencil, AlertOctagon, Calendar, Trash2, LayoutList, PieChart, Clock, Sparkles } from 'lucide-react';

interface Transaction {
  id: number;
  date: string;
  time?: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category?: string;
  balanceAfter: number;
  isWarning?: boolean;
}

// Новый интерфейс для ожидаемых событий
interface PlannedEvent {
  id: number;
  date: string;
  time?: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
}

const CATEGORIES = [
  { name: 'Продукты', color: 'bg-orange-500', lightColor: 'bg-orange-100', text: 'text-orange-700', icon: '🛒', type: 'expense' },
  { name: 'Связь', color: 'bg-blue-500', lightColor: 'bg-blue-100', text: 'text-blue-700', icon: '📱', type: 'expense' },
  { name: 'Жилье', color: 'bg-purple-500', lightColor: 'bg-purple-100', text: 'text-purple-700', icon: '🏠', type: 'expense' },
  { name: 'Услуги', color: 'bg-slate-500', lightColor: 'bg-slate-200', text: 'text-slate-700', icon: '🛠', type: 'expense' },
  { name: 'Зарплата', color: 'bg-emerald-500', lightColor: 'bg-emerald-100', text: 'text-emerald-700', icon: '💰', type: 'income' },
];

const QUOTES = [
  "«Планировать — значит приносить будущее в настоящее» \n— Алан Лакейн",
  "«Тот, кто не планирует свое будущее, не может иметь его» \n— Джон Галсуорси",
  "«Будущее принадлежит тем, кто готовится к нему сегодня» \n— Малкольм Икс",
  "«План — это мост между твоей мечтой и реальностью»",
  "«Лучший способ предсказать будущее — создать его» \n— Питер Друкер"
];

const getTodayStr = () => new Date().toISOString().split('T')[0];
const formatDateRU = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
};

export default function App() {
  // --- STATE ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('budget-data');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [plannedEvents, setPlannedEvents] = useState<PlannedEvent[]>(() => {
    const saved = localStorage.getItem('budget-planned-events');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Модалки
  const [toast, setToast] = useState<{show: boolean, text: string} | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isEventsListOpen, setIsEventsListOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [executingPlanId, setExecutingPlanId] = useState<number | null>(null);
  
  // Поля форм
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [entryDate, setEntryDate] = useState(getTodayStr());
  const [entryTime, setEntryTime] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [isManualWarning, setIsManualWarning] = useState(false);

  // Цитата для пустого экрана
  const [randomQuote, setRandomQuote] = useState(QUOTES[0]);

  // --- EFFECTS ---
  const showToast = (text: string) => {
    setToast({ show: true, text });
    setTimeout(() => setToast(null), 3000);
  };
  
  useEffect(() => {
    localStorage.setItem('budget-data', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('budget-planned-events', JSON.stringify(plannedEvents));
  }, [plannedEvents]);

  useEffect(() => {
    if (isEventsListOpen) {
      setRandomQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    }
  }, [isEventsListOpen]);

  const currentMonthName = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(new Date());
  const todayStr = getTodayStr();

  // --- LOGIC ---
  const recalculateAndSet = (list: Transaction[]) => {
    const sorted = [...list].sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return `${a.date}T${timeA}`.localeCompare(`${b.date}T${timeB}`);
    });

    let runningBalance = 0;
    const recalculated = sorted.map(tx => {
      runningBalance = tx.type === 'income' ? runningBalance + tx.amount : runningBalance - tx.amount;
      return { ...tx, balanceAfter: runningBalance };
    });
    setTransactions(recalculated);
  };

  // Закрытие основной модалки с очисткой
  const closeModal = () => {
    setIsModalOpen(false);
    setExecutingPlanId(null);
  };

  const openAddModal = () => {
    setEditingId(null); setExecutingPlanId(null); setAmount(''); setDesc(''); setCategory(undefined);
    setEntryDate(getTodayStr()); setEntryTime(''); setIsManualWarning(false); setIsModalOpen(true);
  };

  const openEditModal = (item: Transaction) => {
    setEditingId(item.id); setExecutingPlanId(null); setAmount(String(item.amount)); setDesc(item.description);
    setType(item.type); setEntryDate(item.date); setEntryTime(item.time || ''); setCategory(item.category);
    setIsManualWarning(!!item.isWarning); setIsModalOpen(true);
  };

  // Превращение плана в реальную транзакцию
  const prepareExecutePlan = (plan: PlannedEvent) => {
    setEditingId(null);
    setExecutingPlanId(plan.id);
    setAmount(String(plan.amount));
    setDesc(plan.title);
    setType(plan.type);
    setEntryDate(plan.date);
    setEntryTime(plan.time || '');
    setCategory(undefined);
    setIsModalOpen(true);
    setIsEventsListOpen(false);
  };

  const saveEntry = () => {
    const numAmt = Number(amount);
    if (!numAmt || (!desc && !category) || !entryDate) return;
    const newTx: Transaction = {
      id: editingId || Date.now(),
      date: entryDate,
      time: entryTime || undefined,
      amount: numAmt,
      type,
      description: desc || category || '',
      category,
      balanceAfter: 0,
      isWarning: isManualWarning
    };
    
    // Если мы проводили план, удаляем его из списка планов
    if (executingPlanId) {
      setPlannedEvents(prev => prev.filter(p => p.id !== executingPlanId));
    }
    
    recalculateAndSet([...transactions.filter(t => t.id !== editingId), newTx]);
    closeModal();
  };

  const savePlan = () => {
    const numAmt = Number(amount);
    if (!numAmt || !desc || !entryDate) return;
    const newPlan: PlannedEvent = {
      id: Date.now(),
      date: entryDate,
      time: entryTime || undefined,
      title: desc,
      amount: numAmt,
      type
    };
    setPlannedEvents([...plannedEvents, newPlan]);
    setIsPlanModalOpen(false);
  };

  const deleteEntry = () => {
    if (editingId) recalculateAndSet(transactions.filter(t => t.id !== editingId));
    closeModal();
  };

  const deletePlan = (id: number) => {
    setPlannedEvents(plannedEvents.filter(p => p.id !== id));
  };

  // СКЛЕЙКА ТРАНЗАКЦИЙ И ПЛАНОВ ДЛЯ ТАЙМЛАЙНА
  type TimelineItem = (Transaction & { _type: 'tx' }) | (PlannedEvent & { _type: 'plan' });

  const groupedTimeline = useMemo(() => {
    const groups: Record<string, { items: any[], finalDayBalance: number }> = {};
    let runningBalance = 0;

    // 1. Прогоняем реальные транзакции
    const sortedTxs = [...transactions].sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`));
    sortedTxs.forEach(tx => {
      runningBalance = tx.type === 'income' ? runningBalance + tx.amount : runningBalance - tx.amount;
      if (!groups[tx.date]) groups[tx.date] = { items: [], finalDayBalance: 0 };
      groups[tx.date].items.push({ ...tx, balanceAfter: runningBalance, _type: 'tx' });
      groups[tx.date].finalDayBalance = runningBalance;
    });

    // 2. Добавляем планы
    plannedEvents.forEach(plan => {
      if (!groups[plan.date]) groups[plan.date] = { items: [], finalDayBalance: 0 };
      groups[plan.date].items.push({ ...plan, _type: 'plan' });
    });

    // 3. Сортируем дни и исправляем балансы для дней "только с планами"
    const sortedDates = Object.keys(groups).sort();
    let lastKnownBalance = 0;
    
    return sortedDates.map(date => {
      const group = groups[date];
      if (group.items.some(i => i._type === 'tx')) {
        lastKnownBalance = group.finalDayBalance;
      } else {
        group.finalDayBalance = lastKnownBalance; // Протягиваем баланс из прошлого
      }

      // Сортируем внутри дня по времени
      group.items.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

      return { date, items: group.items, finalDayBalance: group.finalDayBalance };
    });
  }, [transactions, plannedEvents]);

  // СТАТИСТИКА (Только по реальным транзакциям)
  const statsData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const totalExp = expenses.reduce((sum, t) => sum + t.amount, 0);
    const catMap: Record<string, number> = {};
    expenses.forEach(t => { if (t.category) catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
    const categories = Object.entries(catMap).map(([name, val]) => ({ name, val, percent: (val / totalExp) * 100 })).sort((a, b) => b.val - a.val);
    const chartPoints = transactions.slice(-10).map(t => t.balanceAfter);
    const maxB = Math.max(...chartPoints, 1);
    const minB = Math.min(...chartPoints, 0);
    return { totalExp, categories, chartPoints, maxB, minB };
  }, [transactions]);

  return (
    <div className="min-h-screen pb-28 font-sans text-slate-900 relative bg-gradient-to-br from-blue-100 via-slate-50 to-purple-100 overflow-x-hidden">
      
      <header className="pt-10 pb-8 flex justify-center sticky top-0 z-50">
        <div className="bg-slate-900/80 backdrop-blur-xl text-white px-8 py-2 rounded-full font-bold shadow-[0_0_20px_rgba(15,23,42,0.2)] uppercase tracking-tighter text-sm border border-slate-700/50">
          {currentMonthName}
        </div>
      </header>

      <main className="relative max-w-md mx-auto px-4 z-10">
        {groupedTimeline.length > 0 ? (
          <div className="relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-6 bg-slate-200/50 backdrop-blur-md border border-white/50 -translate-x-1/2 rounded-full shadow-inner z-0" />
            
            <div className="relative z-10 space-y-12">
              {groupedTimeline.map((group) => {
                const isTodayGroup = group.date === todayStr;
                const isPastGroup = group.date < todayStr;
                
                // Pale rose для будущего!
                let dateTextColor = "text-rose-400 drop-shadow-[0_0_4px_rgba(251,113,133,0.4)]"; 
                let dateTextStr = formatDateRU(group.date);

                if (isTodayGroup) {
                  dateTextColor = "text-blue-500 drop-shadow-[0_0_4px_rgba(59,130,246,0.4)]";
                  dateTextStr = "сегодня";
                } else if (isPastGroup) {
                  dateTextColor = "text-slate-400";
                }

                return (
                <div key={group.date}>
                  <div className="sticky top-24 z-30 flex justify-center mb-6">
                    <div className="bg-white/70 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-white/80 px-6 py-2 rounded-2xl flex flex-col items-center">
                      <span className="font-black text-xl text-slate-800 leading-none">
                        {group.finalDayBalance.toLocaleString()} ₽
                      </span>
                      <span className={`text-[10px] font-black uppercase mt-1 tracking-wider ${dateTextColor}`}>
                        {dateTextStr}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {group.items.map((item) => {
                      
                      // РЕНДЕР: ОЖИДАЕМОЕ СОБЫТИЕ (ПЛАН)
                      if (item._type === 'plan') {
                        return (
                          <div key={`plan-${item.id}`} onClick={() => prepareExecutePlan(item)} className="relative z-20 w-full px-2 cursor-pointer active:scale-95 transition-all">
                            <div className="w-full bg-slate-100/70 backdrop-blur-xl border-2 border-dashed border-slate-300/80 rounded-[28px] p-4 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden">
                              <div className="absolute inset-0 bg-white/40" />
                              <div className="relative z-10">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 flex items-center justify-center gap-1"><Sparkles size={10}/> План</span>
                                <h3 className="text-lg font-black text-slate-700 leading-tight mb-1">{item.title}</h3>
                                <div className="flex justify-center items-center gap-2 text-sm font-bold">
                                  <span className={item.type === 'expense' ? 'text-red-400' : 'text-emerald-400'}>
                                    {item.type === 'expense' ? '−' : '+'}{item.amount.toLocaleString()} ₽
                                  </span>
                                  {item.time && <span className="text-slate-400 opacity-80">в {item.time}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // РЕНДЕР: ОБЫЧНАЯ ТРАНЗАКЦИЯ
                      const isCritical = item.balanceAfter < 4000;
                      const isToday = item.date === todayStr;
                      
                      return (
                        <div key={`tx-${item.id}`} className={`flex items-center relative z-10 ${item.type === 'expense' ? 'flex-row-reverse' : 'flex-row'}`}>
                          
                          <div onClick={() => openEditModal(item)} className="w-[42%] cursor-pointer active:scale-95 transition-all">
                            <div className={`p-3 rounded-2xl border backdrop-blur-xl transition-all relative overflow-hidden 
                              ${isToday ? 'bg-white/80 border-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-white/50 border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.05)]'}`}>
                              
                              {isCritical && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
                              
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-[10px] font-bold uppercase flex items-center gap-1 ${isToday ? 'text-blue-500' : 'text-slate-500'}`}>
                                  {isToday ? 'Сегодня' : formatDateRU(item.date)}
                                  {item.time && <span className="opacity-70 lowercase">в {item.time}</span>}
                                </span>
                                <Pencil size={10} className="text-slate-400" />
                              </div>
                              
                              <p className="text-xs font-bold truncate leading-tight mb-1">{item.description}</p>
                              <p className={`text-lg font-black leading-none ${item.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                                {item.type === 'expense' ? '−' : '+'}{item.amount.toLocaleString()}
                              </p>
                              
                              {item.category && (
                                <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${CATEGORIES.find(c => c.name === item.category)?.lightColor} ${CATEGORIES.find(c => c.name === item.category)?.text} border-current opacity-90 uppercase tracking-tighter`}>
                                  {CATEGORIES.find(c => c.name === item.category)?.icon} {item.category}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="w-[16%] flex justify-center relative items-center">
                            <div className="absolute -top-6 flex gap-1 z-20">
                              {item.isWarning && <AlertTriangle className="text-orange-500 w-5 h-5 animate-pulse drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />}
                              {isCritical && <AlertOctagon className="text-red-600 w-5 h-5 animate-bounce drop-shadow-[0_0_8px_rgba(220,38,38,0.6)]" />}
                            </div>
                            <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-md z-10 ${item.type === 'expense' ? 'bg-red-500' : 'bg-emerald-500'} ${isToday ? 'shadow-[0_0_12px_rgba(59,130,246,0.8)]' : ''}`} />
                          </div>
                          <div className="w-[42%]" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )})}
            </div>
          </div>
        ) : (
          <div className="pt-20 text-center flex flex-col items-center">
             <LayoutList size={48} className="text-slate-400/50 mb-4" />
             <p className="text-slate-500 font-bold">Начните историю своего бюджета</p>
          </div>
        )}
      </main>

      {/* ОБНОВЛЕННЫЙ НИЖНИЙ БАР */}
      <div className="fixed bottom-8 left-0 right-0 px-8 flex justify-between items-center max-w-md mx-auto z-50">
        <button onClick={() => setIsStatsOpen(true)} className="w-14 h-14 bg-white/80 backdrop-blur-xl border border-white/50 text-slate-800 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex items-center justify-center active:scale-90 transition-all">
          <PieChart size={26} strokeWidth={2.5} />
        </button>
        
        {/* Кнопка по центру */}
        <button onClick={openAddModal} className="absolute left-1/2 -translate-x-1/2 w-16 h-16 bg-slate-900 text-white rounded-[24px] shadow-[0_0_30px_rgba(15,23,42,0.4)] border border-slate-700/50 flex items-center justify-center active:scale-90 transition-all">
          <Plus size={32} />
        </button>

        {/* Новая кнопка Планов справа */}
        <button onClick={() => setIsEventsListOpen(true)} className="w-14 h-14 bg-white/80 backdrop-blur-xl border border-white/50 text-slate-800 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex items-center justify-center active:scale-90 transition-all">
          <Sparkles size={26} strokeWidth={2.5} />
        </button>
      </div>

      {/* МОДАЛКА 1: СПИСОК ПЛАНОВ */}
      {isEventsListOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-end justify-center p-4">
          <div className="bg-white/90 backdrop-blur-2xl border border-white/50 w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-10 h-[70vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="font-bold text-2xl flex items-center gap-2"><Sparkles className="text-blue-500" size={24}/> События</h2>
              <button onClick={() => setIsEventsListOpen(false)} className="p-2 bg-slate-100/80 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto pb-4 space-y-3 pr-1">
              {plannedEvents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-60">
                   <p className="italic font-medium text-slate-600 mb-4 whitespace-pre-line leading-relaxed text-sm">
                     {randomQuote}
                   </p>
                </div>
              ) : (
                plannedEvents.sort((a,b) => a.date.localeCompare(b.date)).map(plan => (
                  <div key={plan.id} className="bg-white border border-slate-100 shadow-sm p-4 rounded-2xl flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-800 leading-tight mb-1">{plan.title}</h4>
                      <div className="flex gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                        <span>{formatDateRU(plan.date)}</span>
                        {plan.time && <span>• {plan.time}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-black ${plan.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                        {plan.type === 'expense' ? '−' : '+'}{plan.amount} ₽
                      </span>
                      <button onClick={() => deletePlan(plan.id)} className="p-1.5 bg-red-50 text-red-500 rounded-lg active:scale-90"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <button onClick={() => { setAmount(''); setDesc(''); setEntryDate(getTodayStr()); setEntryTime(''); setIsPlanModalOpen(true); }} className="w-full shrink-0 py-4 bg-slate-900 text-white rounded-xl font-bold shadow-[0_4px_20px_rgba(15,23,42,0.4)] active:scale-95 transition-all mt-4">
              + Запланировать
            </button>
          </div>
        </div>
      )}

      {/* МОДАЛКА 2: СОЗДАНИЕ ПЛАНА (открывается поверх списка) */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[70] flex items-end justify-center p-4">
          <div className="bg-white/95 backdrop-blur-3xl border border-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-xl">Новое событие</h2>
              <button onClick={() => setIsPlanModalOpen(false)} className="p-2 bg-slate-100/80 rounded-full"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex bg-slate-100/80 p-1 rounded-xl">
                <button onClick={() => setType('expense')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'expense' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Списать</button>
                <button onClick={() => setType('income')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'income' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Получить</button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-12 h-12 bg-slate-100/80 rounded-xl flex items-center justify-center shrink-0">
                  <Calendar size={20}/>
                  <input type="date" value={entryDate} onChange={e => {
                    const val = e.target.value;
                    if (val < getTodayStr()) { setEntryDate(getTodayStr()); showToast("Прошлые дни только в Основном меню"); }
                    else setEntryDate(val);
                  }} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <div className="flex-1 bg-white/60 p-3 rounded-xl border border-white font-bold text-center flex justify-center items-center gap-2">
                  <span>{formatDateRU(entryDate)}</span>
                </div>
                <div className="relative w-12 h-12 bg-slate-100/80 rounded-xl flex items-center justify-center shrink-0">
                  <Clock size={20}/>
                  <input type="time" value={entryTime} onChange={e => setEntryTime(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
              <input placeholder="Что планируете?" value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-4 bg-white/60 backdrop-blur-md rounded-xl border border-white font-medium outline-blue-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" />
              <input placeholder="Ожидаемая сумма" type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-4 bg-white/60 backdrop-blur-md rounded-xl border border-white font-black text-xl outline-blue-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" />
              
              <button onClick={savePlan} className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold shadow-[0_4px_20px_rgba(59,130,246,0.4)] active:scale-95 transition-all">
                Сохранить план
              </button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА АНАЛИТИКИ (старая) */}
      {isStatsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-end justify-center p-4">
          <div className="bg-white/90 backdrop-blur-2xl border border-white/50 w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-2xl">Аналитика</h2>
              <button onClick={() => setIsStatsOpen(false)} className="p-2 bg-slate-100/80 rounded-full"><X size={20} /></button>
            </div>
            <div className="bg-slate-900 rounded-3xl p-4 mb-6 relative h-32 flex items-end overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
               <span className="absolute top-3 left-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Пульс баланса</span>
               <svg className="w-full h-16 overflow-visible" viewBox="0 0 100 40">
                <defs>
                  <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path 
                  d={`M ${statsData.chartPoints.map((p, i) => `${(i * 100) / 9},${40 - ((p - statsData.minB) / (statsData.maxB - statsData.minB || 1)) * 35}`).join(' L ')}`} 
                  fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonGlow)" 
                />
              </svg>
            </div>
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
              {statsData.categories.map(cat => {
                const conf = CATEGORIES.find(c => c.name === cat.name);
                return (
                  <div key={cat.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-tighter text-slate-700"><span>{conf?.icon} {cat.name}</span><span>{cat.val.toLocaleString()} ₽</span></div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]"><div className={`h-full ${conf?.color} transition-all duration-1000`} style={{ width: `${cat.percent}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ОСНОВНАЯ МОДАЛКА: ТРАНЗАКЦИЯ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[60] flex items-end justify-center p-4">
          <div className="bg-white/90 backdrop-blur-2xl border border-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-xl">
                {executingPlanId ? 'Проведение плана' : (editingId ? 'Редактировать' : 'Новая запись')}
              </h2>
              <button onClick={closeModal} className="p-2 bg-slate-100/80 rounded-full"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex bg-slate-100/80 p-1 rounded-xl">
                <button onClick={() => {setType('expense'); setCategory(undefined);}} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'expense' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}>Расход</button>
                <button onClick={() => {setType('income'); setCategory(undefined);}} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'income' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>Доход</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.filter(c => c.type === type).map(cat => (
                  <button key={cat.name} onClick={() => setCategory(category === cat.name ? undefined : cat.name)} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${category === cat.name ? `${cat.color} text-white border-transparent shadow-md` : 'bg-white/60 border-slate-200/60 text-slate-500'}`}>{cat.icon} {cat.name}</button>
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative w-12 h-12 bg-slate-100/80 rounded-xl flex items-center justify-center shrink-0">
                  <Calendar size={20}/>
                  <input type="date" value={entryDate} onChange={e => {
                    const val = e.target.value;
                    if (val > getTodayStr()) { setEntryDate(getTodayStr()); showToast("Следующие дни только в Событиях"); }
                    else setEntryDate(val);
                  }} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <div className="flex-1 bg-white/60 p-3 rounded-xl border border-white font-bold text-center flex justify-center items-center gap-2">
                  <span>{formatDateRU(entryDate)}</span>
                  {entryTime && <span className="text-slate-400 font-medium">{entryTime}</span>}
                </div>
                <div className="relative w-12 h-12 bg-slate-100/80 rounded-xl flex items-center justify-center shrink-0">
                  <Clock size={20}/>
                  <input type="time" value={entryTime} onChange={e => setEntryTime(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>

              <input placeholder="Сумма" type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-4 bg-white/60 backdrop-blur-md rounded-xl border border-white font-black text-xl outline-blue-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" />
              <input placeholder={category ? `Название (опционально)` : "Название"} value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-4 bg-white/60 backdrop-blur-md rounded-xl border border-white font-medium outline-blue-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" />
              
              <label className="flex items-center gap-3 p-3 bg-orange-50/80 backdrop-blur-md text-orange-700 rounded-2xl border border-orange-100 cursor-pointer">
                <input type="checkbox" checked={isManualWarning} onChange={e => setIsManualWarning(e.target.checked)} className="w-5 h-5 rounded text-orange-500" />
                <span className="text-sm font-semibold flex items-center gap-2">⚠️ Важное</span>
              </label>

              <div className="flex gap-2">
                {editingId && !executingPlanId && <button onClick={deleteEntry} className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center active:bg-red-100"><Trash2 size={24} /></button>}
                <button onClick={saveEntry} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-[0_4px_20px_rgba(37,99,235,0.4)] active:scale-95 transition-all">
                  {executingPlanId ? 'Провести' : 'Готово'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
	  {/* УВЕДОМЛЕНИЕ ВСТАВЛЯЕМ СЮДА */}
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[1000] w-max">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10 animate-bounce">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-black">!</div>
            <span className="text-sm font-bold">{toast.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}