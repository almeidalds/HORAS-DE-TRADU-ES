import React, { useState, useMemo } from 'react';
import { User, Role, Entry, Notification, SupervisorLog } from './types';
import { USERS, INITIAL_ENTRIES } from './constants';
import { InstructorView } from './components/InstructorView';
import { SupervisorView } from './components/SupervisorView';
import { Button } from './components/Button';
import { Lock, User as UserIcon, Sun, Moon, ArrowLeft, Key, Eye, EyeOff, Search, CheckCircle2, X, Globe2, ShieldCheck, Check, XCircle, ArrowRight } from 'lucide-react';
import { formatDateDisplay, getAutomaticLockDate, formatHoursToHHMM } from './services/dataService';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>(USERS);
  const [entries, setEntries] = useState<Entry[]>(INITIAL_ENTRIES);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [supervisorLogs, setSupervisorLogs] = useState<SupervisorLog[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Initialize Global Lock Date automatically based on 10th day rule
  const [globalLockDate, setGlobalLockDate] = useState<string | null>(getAutomaticLockDate());

  // Login State
  const [viewState, setViewState] = useState<'home' | 'login-supervisor' | 'login-instructor' | 'app'>('home');
  const [loginSelectedUserId, setLoginSelectedUserId] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
    document.documentElement.classList.toggle('dark');
  };

  const filteredInstructors = useMemo(() => {
    return allUsers
      .filter(u => u.role === Role.INSTRUCTOR)
      .filter(u => u.name.toLowerCase().includes(userSearchTerm.toLowerCase()));
  }, [allUsers, userSearchTerm]);

  const availableSupervisors = useMemo(() => {
      return allUsers.filter(u => u.role === Role.SUPERVISOR);
  }, [allUsers]);

  // (Data logic helpers remain same as previous version)
  const generateNotifications = (user: User) => {
    const newNotifications: Notification[] = [];
    if (user.role === Role.SUPERVISOR) {
      const myInstructors = allUsers.filter(u => u.role === Role.INSTRUCTOR && u.zoneId === user.zoneId);
      myInstructors.forEach(inst => {
        const instEntries = entries.filter(e => e.userId === inst.id);
        const lastEntry = instEntries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        if (lastEntry) {
          const daysSince = Math.floor((new Date().getTime() - new Date(lastEntry.date).getTime()) / (1000 * 3600 * 24));
          if (daysSince > 7) {
            newNotifications.push({ id: `n-sup-${Date.now()}-${inst.id}`, userId: user.id, title: "Alerta de Inatividade", message: `${inst.name} está inativo há ${daysSince} dias.`, type: 'alert', read: false, createdAt: new Date().toISOString() });
          }
        }
      });
    }
    return newNotifications;
  };

  // Helper to add audit log
  const logSupervisorAction = (action: string) => {
    if (currentUser?.role !== Role.SUPERVISOR) return;
    const newLog: SupervisorLog = {
      id: `log-${Date.now()}`,
      supervisorId: currentUser.id,
      supervisorName: currentUser.name,
      action: action,
      timestamp: new Date().toISOString()
    };
    setSupervisorLogs(prev => [newLog, ...prev]);
  };

  // Login Logic
  const handleSelectLoginType = (type: 'supervisor' | 'instructor') => {
    setLoginError(''); setLoginPassword(''); setShowPassword(false); setUserSearchTerm('');
    setLoginSelectedUserId(''); // Clear previous selection
    if (type === 'supervisor') {
      setViewState('login-supervisor');
    } else {
      setViewState('login-instructor');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const targetUser = allUsers.find(u => u.id === loginSelectedUserId);
    if (!targetUser) { setLoginError('Selecione um usuário.'); return; }
    if (targetUser.password === loginPassword) {
      setCurrentUser(targetUser);
      setNotifications(generateNotifications(targetUser));
      setViewState('app');
    } else {
      setLoginError('Senha incorreta.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null); setNotifications([]); setViewState('home'); setLoginPassword(''); setLoginSelectedUserId(''); setLoginError('');
  };

  // Data Actions
  const handleUpdateUser = (userId: string, updates: Partial<User>) => {
    const target = allUsers.find(u => u.id === userId);
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    if (currentUser && currentUser.id === userId) setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    
    // Log important updates
    if (target) {
        const changes = [];
        if (updates.name && updates.name !== target.name) changes.push('nome');
        if (updates.email && updates.email !== target.email) changes.push('email');
        if (updates.targetHours && updates.targetHours !== target.targetHours) changes.push('meta');
        if (updates.password) changes.push('senha');
        if (updates.photoUrl && updates.photoUrl !== target.photoUrl) changes.push('foto');
        if (updates.languages && JSON.stringify(updates.languages) !== JSON.stringify(target.languages)) changes.push('idiomas');
        
        if (changes.length > 0) {
            logSupervisorAction(`Atualizou perfil de ${target.name}: ${changes.join(', ')}`);
        }
    }
  };

  const handleAddUser = (user: Omit<User, 'id'>) => {
    setAllUsers(prev => [...prev, { ...user, id: `inst-${Date.now()}` }]);
    logSupervisorAction(`Adicionou novo instrutor: ${user.name}`);
  };

  const handleDeleteUser = (userId: string) => {
      const target = allUsers.find(u => u.id === userId);
      setAllUsers(prev => prev.filter(u => u.id !== userId));
      if (target) logSupervisorAction(`Removeu o instrutor: ${target.name}`);
  };
  
  const handleAddEntry = (newEntry: Omit<Entry, 'id' | 'createdAt' | 'history'>) => {
      setEntries(prev => [{ ...newEntry, id: `e-${Date.now()}`, createdAt: new Date().toISOString(), history: [], editCount: 0 }, ...prev]);
  };

  const handleEditEntry = (id: string, updates: Partial<Entry>) => {
    if (!currentUser) return;
    setEntries(prev => prev.map(entry => {
      if (entry.id === id) {
        return { 
            ...entry, 
            ...updates,
            editCount: (entry.editCount || 0) + 1 
        };
      }
      return entry;
    }));
  };
  
  const handleDeleteEntry = (id: string) => { if (window.confirm("Apagar registro?")) setEntries(prev => prev.filter(e => e.id !== id)); };
  
  const handleApproveEntry = (id: string) => {
      const entry = entries.find(e => e.id === id);
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'approved' } : e));
      if (entry) {
          const author = allUsers.find(u => u.id === entry.userId);
          logSupervisorAction(`Aprovou registro de ${formatHoursToHHMM(entry.hours)} de ${author?.name || 'Unknown'} (Data: ${formatDateDisplay(entry.date)})`);
      }
  };

  const handleRejectEntry = (id: string, reason: string) => {
      const entry = entries.find(e => e.id === id);
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'rejected', rejectionReason: reason } : e));
      if (entry) {
          const author = allUsers.find(u => u.id === entry.userId);
          logSupervisorAction(`Rejeitou registro de ${author?.name} (Motivo: ${reason})`);
      }
  };

  const handleSetLockDate = (date: string | null) => {
      setGlobalLockDate(date);
      if (date) {
          logSupervisorAction(`Definiu data de fechamento para ${formatDateDisplay(date)}`);
      } else {
          logSupervisorAction(`Reabriu o período (removeu data de fechamento)`);
      }
  }

  const handleMarkNotificationRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-500">
        {/* Background Decor */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[100px] animate-blob"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-violet-500/20 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
            <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-fuchsia-500/10 rounded-full blur-[100px] animate-blob animation-delay-4000"></div>
        </div>

        {/* Main Card */}
        <div className="w-full max-w-md bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/50 dark:border-slate-800 p-8 relative z-10 animate-in fade-in zoom-in-95 duration-500">
          
          {/* Toggle Theme Absolute */}
          <button 
              onClick={toggleDarkMode} 
              className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
              {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
          </button>

          {/* Back Button */}
          {viewState !== 'home' && (
              <button 
                  onClick={() => { setViewState('home'); setLoginError(''); setLoginSelectedUserId(''); }} 
                  className="absolute top-6 left-6 p-2 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                  <ArrowLeft size={20}/>
              </button>
          )}

          {/* Header Branding */}
          <div className="text-center mb-8 mt-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 mb-4 overflow-hidden">
                 <img
                 src="https://i.imgur.com/ZBqY97C.png"
                 alt="Logo"
                 className="w-100 h-100 object-contain drop-shadow"
                 loading="lazy"
             />
         </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Horários de Tradução</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Centro de Treinamento Missionário do Brasil</p>
          </div>

          {/* Content */}
          <div className="min-h-[320px] flex flex-col">
              {viewState === 'home' && (
                  <div className="flex-1 flex flex-col justify-center gap-4 animate-in slide-in-from-bottom-4 duration-500">
                      <button onClick={() => handleSelectLoginType('instructor')} className="group relative p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all shadow-sm hover:shadow-md text-left flex items-center">
                          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 mr-4 group-hover:scale-110 transition-transform">
                              <UserIcon size={24} />
                          </div>
                          <div>
                              <span className="block font-bold text-slate-900 dark:text-white">Sou Instrutor</span>
                              <span className="text-xs text-slate-500">Registrar atividades e horas</span>
                          </div>
                          <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500">
                              <ArrowRight size={20} />
                          </div>
                      </button>

                      <button onClick={() => handleSelectLoginType('supervisor')} className="group relative p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-violet-500 dark:hover:border-violet-500 transition-all shadow-sm hover:shadow-md text-left flex items-center">
                          <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 mr-4 group-hover:scale-110 transition-transform">
                              <ShieldCheck size={24} />
                          </div>
                          <div>
                              <span className="block font-bold text-slate-900 dark:text-white">Sou Supervisor</span>
                              <span className="text-xs text-slate-500">Gerenciar equipe e relatórios</span>
                          </div>
                          <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity text-violet-500">
                              <ArrowRight size={20} />
                          </div>
                      </button>
                  </div>
              )}

              {viewState === 'login-supervisor' && (
                  <div className="animate-in slide-in-from-right-8 duration-300 flex flex-col h-full">
                       <div className="text-center mb-4">
                           <h2 className="text-lg font-bold text-slate-800 dark:text-white">Acesso Supervisor</h2>
                           <p className="text-xs text-slate-400">Selecione seu perfil</p>
                       </div>

                       {!loginSelectedUserId ? (
                          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
                              <div className="grid grid-cols-2 gap-3 pb-2">
                                  {availableSupervisors.map(u => (
                                      <button 
                                          key={u.id} 
                                          onClick={() => setLoginSelectedUserId(u.id)} 
                                          className={`flex flex-col items-center p-4 rounded-xl border transition-all duration-200 group bg-white dark:bg-slate-900/50 shadow-sm relative overflow-hidden ${loginSelectedUserId === u.id ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-slate-100 dark:border-slate-800 hover:border-violet-500 dark:hover:border-violet-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                      >
                                          <div className="relative">
                                              <img src={u.photoUrl} className="w-12 h-12 rounded-full mb-2 group-hover:scale-110 transition-transform shadow-md border-2 border-white dark:border-slate-700 object-cover"/>
                                              <div className="absolute -bottom-1 -right-1 bg-violet-500 text-white p-0.5 rounded-full border border-white dark:border-slate-800"><ShieldCheck size={10}/></div>
                                          </div>
                                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 text-center line-clamp-1">{u.name}</span>
                                      </button>
                                  ))}
                              </div>
                              {availableSupervisors.length === 0 && <p className="text-center text-slate-400 text-xs py-10">Nenhum supervisor encontrado.</p>}
                          </div>
                       ) : (
                           <form onSubmit={handleLoginSubmit} className="w-full flex-1 flex flex-col justify-center animate-in fade-in zoom-in-95">
                               <div className="flex flex-col items-center mb-6">
                                   <div className="relative">
                                       <img src={allUsers.find(u => u.id === loginSelectedUserId)?.photoUrl} className="w-20 h-20 rounded-full border-4 border-violet-100 dark:border-slate-700 shadow-lg mb-3 object-cover"/>
                                       <button type="button" onClick={() => {setLoginSelectedUserId(''); setLoginPassword(''); setLoginError('');}} className="absolute -top-1 -right-1 bg-slate-200 dark:bg-slate-700 rounded-full p-1 text-slate-600 dark:text-slate-300 hover:bg-red-100 hover:text-red-600 transition-colors">
                                           <X size={14}/>
                                       </button>
                                   </div>
                                   <h3 className="font-bold text-lg text-slate-900 dark:text-white">{allUsers.find(u => u.id === loginSelectedUserId)?.name}</h3>
                                   <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full mt-1 font-bold">Supervisor</span>
                               </div>

                               <div className="relative mb-4 group">
                                  <Key className={`absolute left-3 top-3 transition-colors ${showPassword ? 'text-indigo-500' : 'text-slate-400'}`} size={18}/>
                                  <input 
                                      type={showPassword ? "text" : "password"} 
                                      placeholder="Senha" 
                                      value={loginPassword} 
                                      onChange={e => setLoginPassword(e.target.value)} 
                                      className="w-full pl-10 pr-10 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-all outline-none text-slate-900 dark:text-white"
                                  />
                                  <button 
                                      type="button" 
                                      onClick={() => setShowPassword(!showPassword)} 
                                      className={`absolute right-3 top-3 transition-colors ${showPassword ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                      title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                  >
                                      {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                  </button>
                              </div>
                              {loginError && <p className="text-xs text-red-500 text-center bg-red-50 p-2 rounded-lg mb-4 flex items-center justify-center gap-2"><XCircle size={14}/> {loginError}</p>}
                              <Button type="submit" fullWidth variant="primary" size="lg" className="shadow-lg shadow-indigo-500/20">Acessar Painel</Button>
                              <div className="text-center mt-4"><span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">Senha: admin</span></div>
                           </form>
                       )}
                  </div>
              )}

              {viewState === 'login-instructor' && (
                  <div className="animate-in slide-in-from-right-8 duration-300 flex flex-col h-full">
                       <div className="text-center mb-4">
                           <h2 className="text-lg font-bold text-slate-800 dark:text-white">Acesso Instrutor</h2>
                           <p className="text-xs text-slate-400">Encontre seu nome na lista</p>
                       </div>

                       {!loginSelectedUserId ? (
                          <>
                              <div className="relative mb-4 flex-shrink-0">
                                  <Search className="absolute left-3 top-3 text-slate-400" size={18}/>
                                  <input type="text" placeholder="Buscar instrutor..." value={userSearchTerm} onChange={e => setUserSearchTerm(e.target.value)} className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-all outline-none text-slate-900 dark:text-white"/>
                              </div>
                              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
                                  <div className="grid grid-cols-2 gap-3 pb-2">
                                      {filteredInstructors.map(u => (
                                          <button 
                                              key={u.id} 
                                              onClick={() => setLoginSelectedUserId(u.id)} 
                                              className="flex flex-col items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 group bg-white dark:bg-slate-900/50 relative hover:shadow-md"
                                          >
                                              <div className="relative">
                                                  <img src={u.photoUrl} className="w-12 h-12 rounded-full mb-2 group-hover:scale-110 transition-transform shadow-sm object-cover border border-slate-200 dark:border-slate-700"/>
                                              </div>
                                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 text-center line-clamp-1">{u.name}</span>
                                          </button>
                                      ))}
                                  </div>
                                  {filteredInstructors.length === 0 && <p className="text-center text-slate-400 text-xs py-10">Nenhum instrutor encontrado.</p>}
                              </div>
                          </>
                       ) : (
                           <form onSubmit={handleLoginSubmit} className="w-full flex-1 flex flex-col justify-center animate-in fade-in zoom-in-95">
                               <div className="flex flex-col items-center mb-6">
                                   <div className="relative">
                                       <img src={allUsers.find(u => u.id === loginSelectedUserId)?.photoUrl} className="w-20 h-20 rounded-full border-4 border-indigo-100 dark:border-slate-700 shadow-lg mb-3 object-cover"/>
                                       <button type="button" onClick={() => {setLoginSelectedUserId(''); setLoginPassword(''); setLoginError('');}} className="absolute -top-1 -right-1 bg-slate-200 dark:bg-slate-700 rounded-full p-1 text-slate-600 dark:text-slate-300 hover:bg-red-100 hover:text-red-600 transition-colors">
                                           <X size={14}/>
                                       </button>
                                   </div>
                                   <h3 className="font-bold text-lg text-slate-900 dark:text-white">{allUsers.find(u => u.id === loginSelectedUserId)?.name}</h3>
                               </div>

                               <div className="relative mb-4 group">
                                  <Key className={`absolute left-3 top-3 transition-colors ${showPassword ? 'text-indigo-500' : 'text-slate-400'}`} size={18}/>
                                  <input 
                                      type={showPassword ? "text" : "password"} 
                                      placeholder="Senha" 
                                      value={loginPassword} 
                                      onChange={e => setLoginPassword(e.target.value)} 
                                      className="w-full pl-10 pr-10 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-all outline-none text-slate-900 dark:text-white"
                                  />
                                  <button 
                                      type="button" 
                                      onClick={() => setShowPassword(!showPassword)} 
                                      className={`absolute right-3 top-3 transition-colors ${showPassword ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                      title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                  >
                                      {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                  </button>
                              </div>
                              {loginError && <p className="text-xs text-red-500 text-center bg-red-50 p-2 rounded-lg mb-4 flex items-center justify-center gap-2"><XCircle size={14}/> {loginError}</p>}
                              <Button type="submit" fullWidth variant="primary" size="lg" className="shadow-lg shadow-indigo-500/20">Acessar Painel</Button>
                              <div className="text-center mt-4"><span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">Fale com seu supervisor para alterar a senha</span></div>
                           </form>
                       )}
                  </div>
              )}
          </div>

        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center relative z-10">
            <p className="text-xs text-slate-400 font-medium">© 2026 CTM BRASIL Inc.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      {currentUser.role === Role.INSTRUCTOR ? (
        <InstructorView
          user={currentUser}
          entries={entries}
          notifications={notifications}
          onAddEntry={handleAddEntry}
          onEditEntry={handleEditEntry}
          onDeleteEntry={handleDeleteEntry}
          onLogout={handleLogout}
          toggleDarkMode={toggleDarkMode}
          isDarkMode={isDarkMode}
          onMarkNotificationRead={handleMarkNotificationRead}
          globalLockDate={globalLockDate}
        />
      ) : (
        <SupervisorView
          currentUser={currentUser}
          allUsers={allUsers}
          entries={entries}
          notifications={notifications}
          supervisorLogs={supervisorLogs}
          onLogout={handleLogout}
          toggleDarkMode={toggleDarkMode}
          isDarkMode={isDarkMode}
          onMarkNotificationRead={handleMarkNotificationRead}
          onUpdateUser={handleUpdateUser}
          onAddUser={handleAddUser}
          onDeleteUser={handleDeleteUser}
          onApproveEntry={handleApproveEntry}
          onRejectEntry={handleRejectEntry}
          onSetLockDate={handleSetLockDate}
          globalLockDate={globalLockDate}
        />
      )}
    </div>
  );
};