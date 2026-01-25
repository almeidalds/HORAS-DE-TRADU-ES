import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Entry } from '../types';
import { Button } from './Button';
import { StatCard } from './StatCard';
import { calculateStats, formatDateDisplay, isEntryLocked, formatHoursToHHMM, parseHHMMToHours } from '../services/dataService';
import { Clock, BookOpen, Calendar, PlusCircle, Trash2, Edit2, Moon, Sun, Bell, X, Play, Pause, Square, Link as LinkIcon, CheckCircle, Clock as ClockIcon, XCircle, Copy, Zap, ArrowRight, LayoutDashboard, LogOut, Lock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DESIGNATIONS } from '../constants';

interface InstructorViewProps {
  user: User;
  entries: Entry[];
  notifications: any[];
  onAddEntry: (entry: Omit<Entry, 'id' | 'createdAt' | 'history'>) => void;
  onEditEntry: (id: string, updates: Partial<Entry>) => void;
  onDeleteEntry: (id: string) => void;
  onLogout: () => void;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
  onMarkNotificationRead: (id: string) => void;
  globalLockDate: string | null;
}

export const InstructorView: React.FC<InstructorViewProps> = ({ 
  user, 
  entries, 
  notifications,
  onAddEntry, 
  onEditEntry,
  onDeleteEntry,
  onLogout,
  toggleDarkMode,
  isDarkMode,
  onMarkNotificationRead,
  globalLockDate
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Date Filters for List/Stats
  const [filterDate, setFilterDate] = useState({
      start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
  });

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    designation: DESIGNATIONS[0] || '', // Use global constant or user specific
    inputHours: 1,
    inputMinutes: 0,
    notes: '',
    link: ''
  });

  // Timer State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Filter entries based on User AND Date Selection
  const myFilteredEntries = useMemo(() => {
    return entries.filter(e => 
        e.userId === user.id && 
        e.date >= filterDate.start && 
        e.date <= filterDate.end
    ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, user.id, filterDate]);

  const stats = useMemo(() => {
      // Calculate days in selected period
      const d1 = new Date(filterDate.start);
      const d2 = new Date(filterDate.end);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return calculateStats(myFilteredEntries, diffDays);
  }, [myFilteredEntries, filterDate]);
  
  // Goal Progress (Current Month - fixed logic)
  const currentMonth = new Date().getMonth();
  const currentMonthEntries = entries.filter(e => e.userId === user.id && new Date(e.date).getMonth() === currentMonth);
  const currentMonthHours = currentMonthEntries.reduce((acc, curr) => acc + curr.hours, 0);
  const targetHours = user.targetHours || 50;
  const progressPercent = Math.min((currentMonthHours / targetHours) * 100, 100);

  // Timer Logic
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = window.setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStopTimer = () => {
    setIsTimerRunning(false);
    const hours = Math.floor(timerSeconds / 3600);
    const minutes = Math.floor((timerSeconds % 3600) / 60);
    
    setFormData(prev => ({ 
        ...prev, 
        inputHours: hours, 
        inputMinutes: minutes 
    }));
    setTimerSeconds(0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Lock Check
    if (isEntryLocked(formData.date, globalLockDate)) {
        alert("Não é possível adicionar registros em uma data fechada pelo supervisor.");
        return;
    }

    // Validation: "OUTROS" requires Notes
    if (formData.designation === 'OUTROS' && !formData.notes.trim()) {
      alert("Por favor, preencha o campo 'Observação' para especificar a atividade 'OUTROS'.");
      return;
    }

    const calculatedHours = parseHHMMToHours(formData.inputHours, formData.inputMinutes);

    // Validation: Hours sanity check
    if (calculatedHours === 0) {
        alert("O tempo registrado não pode ser zero.");
        return;
    }

    if (calculatedHours > 12) {
      if (!window.confirm("Você está registrando mais de 12 horas em um único lançamento. Confirma?")) return;
    }

    const payload = {
      date: formData.date,
      designation: formData.designation,
      languages: user.languages, // Automatically use user's languages
      hours: Number(calculatedHours.toFixed(2)),
      notes: formData.notes,
      link: formData.link,
      status: 'pending' as const
    };

    if (editingId) {
      onEditEntry(editingId, payload);
      setEditingId(null);
    } else {
      onAddEntry({ ...payload, userId: user.id, zoneId: user.zoneId });
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      designation: DESIGNATIONS[0] || '',
      inputHours: 1,
      inputMinutes: 0,
      notes: '',
      link: ''
    });
    setEditingId(null);
  };

  const handleEditClick = (entry: Entry) => {
    if (isEntryLocked(entry.date, globalLockDate)) {
      alert("Este período foi fechado pelo supervisor. Contate a administração.");
      return;
    }
    setEditingId(entry.id);
    
    // Convert decimal hours back to hours/minutes for form
    const decimalHours = entry.hours;
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);

    setFormData({
      date: entry.date,
      designation: entry.designation,
      inputHours: h,
      inputMinutes: m === 60 ? 0 : m,
      notes: entry.notes || '',
      link: entry.link || ''
    });
    // Adjust if minute rounding caused hour bump (unlikely with round vs floor logic here but safe check)
    if (m === 60) {
       setFormData(prev => ({...prev, inputHours: h + 1}));
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDuplicate = (entry: Entry) => {
    // Convert decimal hours back to hours/minutes for form
    const decimalHours = entry.hours;
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);

    setFormData({
      date: new Date().toISOString().split('T')[0],
      designation: entry.designation,
      inputHours: h,
      inputMinutes: m === 60 ? 0 : m,
      notes: entry.notes || '',
      link: entry.link || ''
    });
    if (m === 60) {
        setFormData(prev => ({...prev, inputHours: h + 1}));
     }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"><CheckCircle size={12} className="mr-1"/> Aprovado</span>;
      case 'rejected': return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"><XCircle size={12} className="mr-1"/> Rejeitado</span>;
      default: return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800"><ClockIcon size={12} className="mr-1"/> Pendente</span>;
    }
  };

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayTotal = myFilteredEntries.filter(e => e.date === dateStr).reduce((sum, e) => sum + e.hours, 0);
      data.push({ name: formatDateDisplay(dateStr).substring(0, 5), hours: dayTotal });
    }
    return data;
  }, [myFilteredEntries]);

  return (
    <div className="min-h-screen pb-12 transition-colors duration-500">
      {/* Navbar Island */}
      <div className="sticky top-4 z-40 px-4 sm:px-6 lg:px-8 mb-8">
        <div className="max-w-7xl mx-auto glass rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-black/20 p-4 flex justify-between items-center transition-all duration-300">
          <div className="flex items-center space-x-4">
             <div className="relative group">
                <img src={user.photoUrl} alt={user.name} className="relative h-10 w-10 rounded-full border-2 border-white dark:border-slate-800 object-cover" />
                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
             </div>
             <div>
               <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">{user.name}</h1>
               <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                 <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">{user.subgroup || 'Geral'}</span>
               </div>
             </div>
          </div>
          <div className="flex items-center space-x-2">
             <button onClick={toggleDarkMode} className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
               {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             
             <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
                  <Bell size={20} />
                  {unreadCount > 0 && <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>}
                </button>
                {showNotifications && (
                   <div className="absolute right-0 mt-4 w-80 glass-card rounded-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 shadow-2xl">
                     <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Notificações</h3>
                        <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={14}/></button>
                     </div>
                     <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? <p className="p-6 text-center text-xs text-slate-500">Tudo limpo por aqui.</p> : notifications.map(n => (
                           <div key={n.id} className={`p-3 border-b border-slate-50 dark:border-slate-800/50 ${!n.read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                             <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{n.title}</p>
                             <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                             {!n.read && <button onClick={() => onMarkNotificationRead(n.id)} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1.5 hover:underline">Marcar como lida</button>}
                           </div>
                        ))}
                     </div>
                   </div>
                )}
             </div>
             <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
             <Button variant="ghost" size="sm" onClick={onLogout} className="text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400">
                <LogOut size={16} className="mr-2 md:hidden"/> <span className="hidden md:inline">Sair</span>
             </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Goal Banner */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 relative overflow-hidden group border border-white/50 dark:border-slate-700">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-opacity duration-500 opacity-70 group-hover:opacity-100"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center relative z-10">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Olá, {user.name.split('               ')[0]}! 👋</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-lg text-sm sm:text-base leading-relaxed">
                Você já completou <strong className="text-indigo-600 dark:text-indigo-400">{formatHoursToHHMM(currentMonthHours)}</strong> da sua meta mensal de <strong className="text-slate-700 dark:text-slate-300">{targetHours}h</strong>.
                {globalLockDate && <span className="block mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center"><Lock size={12} className="mr-1"/> Período fechado até {formatDateDisplay(globalLockDate)}</span>}
              </p>
              <div className="flex space-x-3">
                 <Button onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })} variant="secondary" size="sm">
                    Ver Histórico
                 </Button>
              </div>
            </div>
            
            <div className="w-full md:w-64 mt-6 md:mt-0">
               <div className="flex justify-between text-xs font-semibold mb-2 text-slate-600 dark:text-slate-300">
                  <span>Progresso Mensal</span>
                  <span>{progressPercent.toFixed(0)}%</span>
               </div>
               <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner border border-slate-200 dark:border-slate-600">
                  <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${progressPercent}%` }}>
                     <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_infinite]"></div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Left Column: Tools */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* Modern Timer */}
            <div className="bg-slate-900 dark:bg-black rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden ring-1 ring-white/10 dark:ring-white/5">
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20"></div>
               <div className="relative z-10">
                   <div className="flex justify-between items-center mb-6">
                     <span className="flex items-center text-indigo-200 text-sm font-medium tracking-wide uppercase"><Clock className="mr-2 w-4 h-4"/> Cronometro</span>
                     {isTimerRunning && <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
                   </div>
                   
                   <div className="text-center py-4">
                     <div className="text-6xl font-mono font-bold tracking-tighter tabular-nums text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
                       {formatTime(timerSeconds)}
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3 mt-6">
                     {!isTimerRunning ? (
                       <button onClick={() => setIsTimerRunning(true)} className="col-span-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/50 flex items-center justify-center group active:scale-[0.98]">
                         <Play size={20} className="mr-2 fill-current group-hover:scale-110 transition-transform"/> Iniciar
                       </button>
                     ) : (
                       <>
                        <button onClick={() => setIsTimerRunning(false)} className="bg-amber-500 hover:bg-amber-400 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center shadow-lg shadow-amber-900/20">
                            <Pause size={20} className="fill-current"/>
                        </button>
                        <button onClick={handleStopTimer} className="bg-red-500 hover:bg-red-400 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center shadow-lg shadow-red-900/20">
                            <Square size={20} className="fill-current"/>
                        </button>
                       </>
                     )}
                   </div>
               </div>
            </div>

            {/* Form */}
            <div className={`glass-card rounded-2xl p-6 transition-all duration-300 ${editingId ? 'ring-2 ring-indigo-500 shadow-xl' : ''}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                  <div className={`p-2 rounded-lg mr-3 ${editingId ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'} transition-colors`}>
                    {editingId ? <Edit2 size={18}/> : <PlusCircle size={18}/>}
                  </div>
                  {editingId ? 'Editar Registro' : 'Novo Registro'}
                </h2>
                {editingId && <button onClick={resetForm} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">Cancelar</button>}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Data</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"/>
                  {isEntryLocked(formData.date, globalLockDate) && <p className="text-[10px] text-red-500 mt-1 flex items-center"><Lock size={10} className="mr-1"/> Data fechada</p>}
                </div>
                
                <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Designação</label>
                    <select value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none appearance-none">
                        {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-1">
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Horas e Minutos</label>
                       <div className="flex gap-2 items-center">
                           <div className="relative flex-1">
                                <input 
                                    type="number" 
                                    min="0"
                                    max="23"
                                    value={formData.inputHours} 
                                    onChange={e => setFormData({...formData, inputHours: parseInt(e.target.value) || 0})} 
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-center text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-mono font-medium text-lg placeholder-slate-400"
                                    placeholder="00"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">H</span>
                           </div>
                           <span className="text-slate-400 font-bold">:</span>
                           <div className="relative flex-1">
                                <input 
                                    type="number" 
                                    min="0"
                                    max="59"
                                    value={formData.inputMinutes} 
                                    onChange={e => setFormData({...formData, inputMinutes: parseInt(e.target.value) || 0})} 
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-center text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-mono font-medium text-lg placeholder-slate-400"
                                    placeholder="00"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">M</span>
                           </div>
                       </div>
                   </div>
                   <div className="col-span-1">
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Link / Anexo</label>
                       <div className="relative">
                          <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                          <input type="url" placeholder="https://..." value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm"/>
                       </div>
                   </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
                      Observação
                      {formData.designation === 'OUTROS' && <span className="text-red-500 ml-1 text-base">*</span>}
                  </label>
                  <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm resize-none" rows={2}/>
                </div>

                <Button fullWidth type="submit" variant="primary" size="lg" className="mt-2 shadow-lg shadow-indigo-500/20 active:scale-[0.98]" disabled={isEntryLocked(formData.date, globalLockDate)}>
                    {editingId ? 'Salvar Alterações' : 'Registrar Atividade'}
                </Button>
              </form>
            </div>
          </div>

          {/* Right Column: Data */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Filter Control for Instructor */}
            <div className="flex items-center justify-between glass-card p-4 rounded-xl">
                 <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Meus Registros</h3>
                 <div className="flex items-center gap-2">
                     <span className="text-xs text-slate-500">Filtrar:</span>
                     <input type="date" value={filterDate.start} onChange={e => setFilterDate({...filterDate, start: e.target.value})} className="text-xs bg-slate-100 dark:bg-slate-800 border-none rounded p-1"/>
                     <span className="text-xs text-slate-400">-</span>
                     <input type="date" value={filterDate.end} onChange={e => setFilterDate({...filterDate, end: e.target.value})} className="text-xs bg-slate-100 dark:bg-slate-800 border-none rounded p-1"/>
                 </div>
            </div>

            {/* Stats Cards based on filter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Total no Período" value={`${formatHoursToHHMM(stats.totalHours)}`} icon={Clock} gradientFrom="from-blue-500/20" gradientTo="to-cyan-500/20" color="text-blue-600 dark:text-blue-400" />
              <StatCard label="Média/Registro" value={`${formatHoursToHHMM(stats.avgHoursPerEntry)}`} icon={BookOpen} gradientFrom="from-emerald-500/20" gradientTo="to-teal-500/20" color="text-emerald-600 dark:text-emerald-400" />
              <StatCard label="Registros" value={stats.entryCount} icon={LayoutDashboard} gradientFrom="from-violet-500/20" gradientTo="to-fuchsia-500/20" color="text-violet-600 dark:text-violet-400" />
            </div>

            {/* Activity Chart */}
            <div className="glass-card rounded-2xl p-6">
               <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Atividade Recente (7 dias)</h3>
               <div className="h-48 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={chartData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#e2e8f0"} />
                     <XAxis 
                       dataKey="name" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 10}} 
                       dy={10} 
                     />
                     <Tooltip 
                       cursor={{fill: isDarkMode ? '#1e293b' : '#f1f5f9'}}
                       contentStyle={{
                         borderRadius: '8px', 
                         border: 'none', 
                         boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', 
                         backgroundColor: isDarkMode ? '#1e293b' : '#fff', 
                         color: isDarkMode ? '#fff' : '#0f172a'
                       }}
                       formatter={(value: number) => [`${formatHoursToHHMM(value)}`, 'Horas']}
                     />
                     <Bar 
                       dataKey="hours" 
                       fill={isDarkMode ? "#818cf8" : "#6366f1"} 
                       radius={[4, 4, 0, 0]} 
                       barSize={32} 
                     />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* List */}
            <div className="glass-card rounded-2xl overflow-hidden">
               <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                 <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Histórico</h3>
                 <span className="text-[10px] font-mono text-slate-400">{myFilteredEntries.length} items</span>
               </div>
               
               <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                 <table className="min-w-full">
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                     {myFilteredEntries.length === 0 ? <tr className="text-center p-4 text-sm text-slate-400"><td colSpan={3} className="p-8">Nenhum registro neste período.</td></tr> : myFilteredEntries.map((entry) => (
                       <tr key={entry.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                         <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatDateDisplay(entry.date)}</span>
                                <span className="text-xs text-slate-400">{formatHoursToHHMM(entry.hours)}</span>
                            </div>
                         </td>
                         <td className="px-6 py-4">
                           <div className="flex flex-col">
                                <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{entry.designation}</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">{entry.languages.join('/')}</span>
                                    {entry.link && <a href={entry.link} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600 transition-colors"><LinkIcon size={12}/></a>}
                                </div>
                                {entry.status === 'rejected' && entry.rejectionReason && (
                                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg">
                                       <p className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 mb-0.5">Motivo da Rejeição</p>
                                       <p className="text-xs text-red-700 dark:text-red-300">{entry.rejectionReason}</p>
                                    </div>
                                )}
                           </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex flex-col items-end gap-2">
                                {getStatusBadge(entry.status)}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                                    <button onClick={() => handleDuplicate(entry)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all" title="Duplicar">
                                        <Copy size={14} />
                                    </button>
                                    {!isEntryLocked(entry.date, globalLockDate) && (
                                        <>
                                            <button onClick={() => handleEditClick(entry)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all" title="Editar">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => onDeleteEntry(entry.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all" title="Excluir">
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                    {isEntryLocked(entry.date, globalLockDate) && <Lock size={14} className="text-slate-300"/>}
                                </div>
                            </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};