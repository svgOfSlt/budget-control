import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Plus, X, Pencil, AlertOctagon, Calendar, Trash2, LayoutList, PieChart, TrendingUp } from 'lucide-react';

interface Transaction {
  id: number;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category?: string;
  balanceAfter: number;
  isWarning?: boolean;
}

const CATEGORIES = [
  { name: 'Продукты', color: 'bg-orange-500', lightColor: 'bg-orange-100', text: 'text-orange-700', icon: '🛒', type: 'expense' },
  { name: 'Связь', color: 'bg-blue-500', lightColor: 'bg-blue-100', text: 'text-blue-700', icon: '📱', type: 'expense' },
  { name: 'Жилье', color: 'bg-purple-500', lightColor: 'bg-purple-100', text: 'text-purple-700', icon: '🏠', type: 'expense' },
  { name: 'Услуги', color: 'bg-slate-500', lightColor: 'bg-slate-200', text: 'text-slate-700', icon: '🛠', type: 'expense' },
  { name: 'Зарплата', color: 'bg-emerald-500', lightColor: 'bg-emerald-100', text: 'text-emerald-700', icon: '💰', type: 'income' },
];

const getTodayStr = () => new Date().toISOString().split('T')[0];
const formatDateRU = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
};

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('budget-data');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [entryDate, setEntryDate] = useState(getTodayStr());
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [isManualWarning, setIsManualWarning] = useState(false);

  useEffect(() => {
    localStorage.setItem('budget-data', JSON.stringify(transactions));
  }, [transactions]);

  const currentMonthName = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(new Date());
  const todayStr = getTodayStr();

  const recalculateAndSet = (list: Transaction[]) => {
    const sorted = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningBalance = 0;
    const recalculated = sorted.map(tx => {
      runningBalance = tx.type === 'income' ? runningBalance + tx.amount : runningBalance - tx.amount;
      return { ...tx, balanceAfter: runningBalance };
    });
    setTransactions(recalculated);
  };

  const openAddModal = () => {
    setEditingId(null); setAmount(''); setDesc(''); setCategory(undefined);
    setEntryDate(getTodayStr()); setIsManualWarning(false); setIsModalOpen(true);
  };

  const openEditModal = (item: Transaction) => {
    setEditingId(item.id); setAmount(String(item.amount)); setDesc(item.description);
    setType(item.type); setEntryDate(item.date); setCategory(item.category);
    setIsManualWarning(!!item.isWarning); setIsModalOpen(true);
  };

  const saveEntry = () => {
    const numAmt = Number(amount);
    if (!numAmt || (!desc && !category) || !entryDate) return;
    const newTx: Transaction = {
      id: editingId || Date.now(),
      date: entryDate,
      amount: numAmt,
      type,
      description: desc || category || '',
      category,
      balanceAfter: 0,
      isWarning: isManualWarning
    };
    recalculateAndSet([...transactions.filter(t => t.id !== editingId), newTx]);
    setIsModalOpen(false);
  };

  const deleteEntry = () => {
    if (editingId) recalculateAndSet(transactions.filter(t => t.id !== editingId));
    setIsModalOpen(false);
  };

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    transactions.forEach(tx => {
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    });
    return Object.keys(groups).sort().map(date => ({
      date,
      txs: groups[date],
      finalDayBalance: groups[date][groups[date].length - 1].balanceAfter
    }));
  }, [transactions]);

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
    /* ИСПРАВЛЕННЫЙ ФОН: Надежный градиент */
    <div className="min-h-screen pb-24 font-sans text-slate-900 relative bg-gradient-to-br from-blue-100 via-slate-50 to-purple-100">
      
      <header className="pt-10 pb-8 flex justify-center sticky top-0 z-50">
        <div className="bg-slate-900/80 backdrop-blur-xl text-white px-8 py-2 rounded-full font-bold shadow-[0_0_20px_rgba(15,23,42,0.2)] uppercase tracking-tighter text-sm border border-slate-700/50">
          {currentMonthName}
        </div>
      </header>

      <main className="relative max-w-md mx-auto px-4 z-10">
        {transactions.length > 0 ? (
          <div className="relative">
            {/* ИСПРАВЛЕННАЯ ОСЕВАЯ ЛИНИЯ */}
            <div className="absolute left-1/2 top-0 bottom-0 w-6 bg-slate-200/50 backdrop-blur-md border border-white/50 -translate-x-1/2 rounded-full shadow-inner" />
            
            <div className="relative z-10 space-y-12">
              {groupedTransactions.map((group) => (
                <div key={group.date}>
                  <div className="sticky top-24 z-30 flex justify-center mb-6">
                    <div className="bg-white/60 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-white/80 px-6 py-2 rounded-2xl font-black text-xl text-slate-800">
                      {group.finalDayBalance.toLocaleString()} ₽
                    </div>
                  </div>

                  <div className="space-y-6">
                    {group.txs.map((item) => {
                      const isCritical = item.balanceAfter < 4000;
                      const isToday = item.date === todayStr;
                      
                      return (
                        <div key={item.id} className={`flex items-center ${item.type === 'expense' ? 'flex-row-reverse' : 'flex-row'}`}>
                          
                          <div onClick={() => openEditModal(item)} className="w-[42%] cursor-pointer active:scale-95 transition-all">
                            
                            <div className={`p-3 rounded-2xl border backdrop-blur-xl transition-all relative overflow-hidden 
                              ${isToday ? 'bg-white/80 border-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-white/50 border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.05)]'}`}>
                              
                              {isCritical && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
                              
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-[10px] font-bold uppercase ${isToday ? 'text-blue-500' : 'text-slate-500'}`}>
                                  {isToday ? 'Сегодня' : formatDateRU(item.date)}
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
                            <div className="absolute -top-6 flex gap-1">
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
              ))}
            </div>
          </div>
        ) : (
          <div className="pt-20 text-center flex flex-col items-center">
             <LayoutList size={48} className="text-slate-400/50 mb-4" />
             <p className="text-slate-500 font-bold">Начните историю своего бюджета</p>
          </div>
        )}
      </main>

      <div className="fixed bottom-8 left-0 right-0 px-8 flex justify-between items-center max-w-md mx-auto z-50">
        <button onClick={() => setIsStatsOpen(true)} className="w-14 h-14 bg-white/80 backdrop-blur-xl border border-white/50 text-slate-800 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex items-center justify-center active:scale-90 transition-all">
          <PieChart size={28} strokeWidth={2.5} />
        </button>
        <button onClick={openAddModal} className="w-16 h-16 bg-slate-900 text-white rounded-[24px] shadow-[0_0_30px_rgba(15,23,42,0.4)] border border-slate-700/50 flex items-center justify-center active:scale-90 transition-all">
          <Plus size={32} />
        </button>
      </div>

      {isStatsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-end justify-center p-4">
          <div className="bg-white/90 backdrop-blur-2xl border border-white/50 w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-2xl">Аналитика</h2>
              <button onClick={() => setIsStatsOpen(false)} className="p-2 bg-slate-100/80 rounded-full"><X size={20} /></button>
            </div>
            <div className="bg-slate-900 rounded-3xl p-4 mb-6 relative h-32 flex items-end overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
               <span className="absolute top-3 left-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Пульс баланса</span>
               
               {/* ИСПРАВЛЕННЫЙ ГРАФИК СО СВЕЧЕНИЕМ */}
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
                  fill="none" 
                  stroke="#3b82f6" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  filter="url(#neonGlow)" 
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[60] flex items-end justify-center p-4">
          <div className="bg-white/90 backdrop-blur-2xl border border-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-xl">{editingId ? 'Редактировать' : 'Новая запись'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100/80 rounded-full"><X size={20} /></button>
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
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 bg-slate-100/80 rounded-xl flex items-center justify-center"><Calendar size={20}/><input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" /></div>
                <div className="flex-1 bg-white/60 p-3 rounded-xl border border-white font-bold">{formatDateRU(entryDate)}</div>
              </div>
              <input placeholder="Сумма" type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-4 bg-white/60 backdrop-blur-md rounded-xl border border-white font-black text-xl outline-blue-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" />
              <input placeholder={category ? `Название (опционально)` : "Название"} value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-4 bg-white/60 backdrop-blur-md rounded-xl border border-white font-medium outline-blue-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" />
              
              <label className="flex items-center gap-3 p-3 bg-orange-50/80 backdrop-blur-md text-orange-700 rounded-2xl border border-orange-100 cursor-pointer">
                <input type="checkbox" checked={isManualWarning} onChange={e => setIsManualWarning(e.target.checked)} className="w-5 h-5 rounded text-orange-500" />
                <span className="text-sm font-semibold flex items-center gap-2">⚠️ Важное</span>
              </label>

              <div className="flex gap-2">
                {editingId && <button onClick={deleteEntry} className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center active:bg-red-100"><Trash2 size={24} /></button>}
                <button onClick={saveEntry} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-[0_4px_20px_rgba(37,99,235,0.4)] active:scale-95 transition-all">Готово</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}