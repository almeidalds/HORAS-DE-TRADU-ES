import React, { useState, useMemo, useEffect } from 'react';
import { User, Entry, Role, Notification, SmartAlert, SupervisorLog } from '../types';
import { Button } from './Button';
import { StatCard } from './StatCard';
import { filterEntries, calculateStats, getDaysDifference, formatDateDisplay, generateCSV, downloadCSV, checkSmartAlerts, generatePDF, formatHoursToHHMM } from '../services/dataService';
import { Users, Clock, Calendar, Download, ChevronLeft, Search, Filter, Sun, Moon, Bell, X, History, Lock, Key, LayoutDashboard, UserPlus, Trash2, Camera, Save, CheckCircle, XCircle, FileText, PieChart as PieChartIcon, Briefcase, TrendingUp, Target, LogOut, AlertTriangle, FileDown, Unlock, List, Pencil, AlertOctagon } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

interface SupervisorViewProps {
  currentUser: User;
  allUsers: User[];
  entries: Entry[];
  notifications: Notification[];
  supervisorLogs: SupervisorLog[];
  onLogout: () => void;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
  onMarkNotificationRead: (id: string) => void;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onAddUser: (user: Omit<User, 'id'>) => void;
  onDeleteUser: (userId: string) => void;
  onApproveEntry: (entryId: string) => void;
  onRejectEntry: (entryId: string, reason: string) => void;
  onSetLockDate: (date: string | null) => void;
  globalLockDate: string | null;
}

export const SupervisorView: React.FC<SupervisorViewProps> = ({ 
  currentUser, 
  allUsers, 
  entries, 
  notifications,
  supervisorLogs,
  onLogout,
  toggleDarkMode,
  isDarkMode,
  onMarkNotificationRead,
  onUpdateUser,
  onAddUser,
  onDeleteUser,
  onApproveEntry,
  onRejectEntry,
  onSetLockDate,
  globalLockDate
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'approvals' | 'alerts' | 'audit'>('dashboard');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Dashboard Global Date Range
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // User Detail Specific Date Range
  const [detailDateRange, setDetailDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [filterText, setFilterText] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  // Modals
  const [rejectionModal, setRejectionModal] = useState<{open: boolean, entryId: string | null, reason: string}>({ open: false, entryId: null, reason: '' });
  const [lockDateModal, setLockDateModal] = useState<{open: boolean, date: string}>({ open: false, date: globalLockDate || new Date().toISOString().split('T')[0] });
  
  // Profile Management Modals
  const [deleteUserModal, setDeleteUserModal] = useState<{open: boolean, user: User | null}>({ open: false, user: null });
  const [editUserModal, setEditUserModal] = useState<{open: boolean, user: User | null, formData: any}>({ open: false, user: null, formData: {} });

  // Team Management state
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '123',
    languages: [] as string[],
    targetHours: 50,
    subgroup: ''
  });

  // Derived Data
  const instructors = allUsers.filter(u => u.role === Role.INSTRUCTOR && u.zoneId === currentUser.zoneId);
  const pendingEntries = entries.filter(e => e.status === 'pending' && e.zoneId === currentUser.zoneId);
  
  const filteredEntries = useMemo(() => 
    filterEntries(entries, selectedUserId, currentUser.zoneId, dateRange.start, dateRange.end),
    [entries, selectedUserId, currentUser.zoneId, dateRange]
  );
  
  const daysInPeriod = getDaysDifference(dateRange.start, dateRange.end);
  const stats = calculateStats(filteredEntries, daysInPeriod);

  // Alerts
  const smartAlerts: SmartAlert[] = useMemo(() => {
      const all = checkSmartAlerts(filteredEntries, allUsers);
      return all.filter(a => !dismissedAlertIds.includes(a.id));
  }, [filteredEntries, allUsers, dismissedAlertIds]);

  // When opening a user profile, sync the local date range with the global one initially
  const handleOpenUserProfile = (userId: string) => {
      setDetailDateRange({ ...dateRange });
      setSelectedUserId(userId);
  };

  // --- Handlers ---
  const handleRejectionSubmit = () => {
      if (!rejectionModal.entryId || !rejectionModal.reason.trim()) return;
      onRejectEntry(rejectionModal.entryId, rejectionModal.reason);
      setRejectionModal({ open: false, entryId: null, reason: '' });
  };

  const handleLockDateSubmit = () => {
      onSetLockDate(lockDateModal.date);
      setLockDateModal({ ...lockDateModal, open: false });
  };

  const handleClearLockDate = () => {
      onSetLockDate(null);
      setLockDateModal({ ...lockDateModal, open: false });
  };

  const handlePasswordUpdate = (userId: string) => {
    if (newPassword.trim().length < 3) { alert("A senha deve ter pelo menos 3 caracteres."); return; }
    if (newPassword !== confirmPassword) { alert("As senhas não coincidem."); return; }
    
    onUpdateUser(userId, { password: newPassword });
    setEditingPasswordId(null);
    setNewPassword('');
    setConfirmPassword('');
    alert("Senha atualizada com sucesso.");
  };

  const handleStartPasswordEdit = (userId: string) => {
      setEditingPasswordId(userId);
      setNewPassword('');
      setConfirmPassword('');
  };

  const handleChangePhoto = (user: User) => {
    const currentUrl = user.photoUrl;
    const newUrl = window.prompt("Insira a URL da nova foto:", currentUrl);
    if (newUrl !== null) {
      let finalUrl = newUrl.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
      onUpdateUser(user.id, { photoUrl: finalUrl });
    }
  };

  const handleOpenEditUserModal = (user: User) => {
      setEditUserModal({
          open: true,
          user: user,
          formData: {
              name: user.name,
              email: user.email,
              targetHours: user.targetHours,
              subgroup: user.subgroup,
              languages: user.languages
          }
      });
  };

  const handleSaveUserChanges = () => {
      if (!editUserModal.user) return;
      onUpdateUser(editUserModal.user.id, editUserModal.formData);
      setEditUserModal({ open: false, user: null, formData: {} });
  };

  const toggleEditLanguage = (lang: string) => {
      setEditUserModal(prev => {
          const currentLangs = prev.formData.languages || [];
          const newLangs = currentLangs.includes(lang) 
              ? currentLangs.filter((l: string) => l !== lang)
              : [...currentLangs, lang];
          return { ...prev, formData: { ...prev.formData, languages: newLangs } };
      });
  };

  const handleDeleteUserClick = (user: User) => {
    setDeleteUserModal({ open: true, user: user });
  };

  const confirmDeleteUser = () => {
      if (deleteUserModal.user) {
          onDeleteUser(deleteUserModal.user.id);
          setDeleteUserModal({ open: false, user: null });
      }
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email) return;
    onAddUser({
      name: newUserForm.name,
      email: newUserForm.email,
      password: newUserForm.password,
      role: Role.INSTRUCTOR,
      zoneId: currentUser.zoneId,
      photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newUserForm.name)}&background=random`,
      languages: newUserForm.languages.length > 0 ? newUserForm.languages : ['PT'],
      designations: ['Tradução', 'Revisão'],
      targetHours: newUserForm.targetHours,
      subgroup: newUserForm.subgroup
    });
    setIsAddUserModalOpen(false);
    setNewUserForm({ name: '', email: '', password: '123', languages: [], targetHours: 50, subgroup: '' });
  };

  const toggleLanguage = (lang: string) => {
    setNewUserForm(prev => {
      const exists = prev.languages.includes(lang);
      return { ...prev, languages: exists ? prev.languages.filter(l => l !== lang) : [...prev.languages, lang] };
    });
  };

  const handleDismissAlert = (id: string) => {
      setDismissedAlertIds(prev => [...prev, id]);
  };

  const handleClearAllAlerts = () => {
      const ids = smartAlerts.map(a => a.id);
      setDismissedAlertIds(prev => [...prev, ...ids]);
  };

  // --- RENDER HELPERS ---
  const renderTeamManagementView = () => {
    const filteredUsers = instructors.filter(u => 
        u.name.toLowerCase().includes(filterText.toLowerCase()) || 
        u.email.toLowerCase().includes(filterText.toLowerCase())
    );

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input 
                    type="text" 
                    placeholder="Buscar por nome ou email..." 
                    value={filterText} 
                    onChange={e => setFilterText(e.target.value)} 
                    className="w-full pl-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                />
             </div>
             <Button onClick={() => setIsAddUserModalOpen(true)} className="flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                <UserPlus size={18}/> Novo Instrutor
             </Button>
        </div>

        {/* User List */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredUsers.map(user => (
                <div key={user.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm relative group hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                             <div className="relative">
                                 <img src={user.photoUrl} className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-slate-100 dark:border-slate-700"/>
                                 <button onClick={() => handleChangePhoto(user)} className="absolute -bottom-2 -right-2 bg-slate-100 dark:bg-slate-700 p-1.5 rounded-lg text-slate-500 dark:text-slate-300 hover:text-indigo-600 transition-colors shadow-sm opacity-0 group-hover:opacity-100">
                                     <Camera size={12}/>
                                 </button>
                             </div>
                             <div>
                                 <h3 className="font-bold text-slate-900 dark:text-white">{user.name}</h3>
                                 <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                                 <span className="inline-block mt-1 text-[10px] bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-600">
                                     {user.subgroup || 'Geral'}
                                 </span>
                             </div>
                        </div>
                        <div className="relative">
                           <button onClick={() => handleDeleteUserClick(user)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                               <Trash2 size={16}/>
                           </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                         <div className="flex justify-between items-center text-sm">
                             <span className="text-slate-500 dark:text-slate-400">Meta Mensal</span>
                             <span className="font-bold text-slate-800 dark:text-white">{user.targetHours}h</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                             <span className="text-slate-500 dark:text-slate-400">Idiomas</span>
                             <div className="flex gap-1">
                                 {user.languages.map(l => (
                                     <span key={l} className="text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase">{l}</span>
                                 ))}
                             </div>
                         </div>
                         
                         {/* Password Reset Section */}
                         <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50">
                             {editingPasswordId === user.id ? (
                                 <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl animate-in fade-in slide-in-from-top-2">
                                     <p className="text-xs font-bold text-slate-500 uppercase mb-2">Nova Senha</p>
                                     <input 
                                        type="password" 
                                        placeholder="Nova senha" 
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-600 mb-2 outline-none bg-white dark:bg-slate-800"
                                     />
                                     <input 
                                        type="password" 
                                        placeholder="Confirmar" 
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-600 mb-2 outline-none bg-white dark:bg-slate-800"
                                     />
                                     <div className="flex gap-2">
                                         <Button size="sm" variant="primary" onClick={() => handlePasswordUpdate(user.id)} className="w-full py-1 text-xs h-7">Salvar</Button>
                                         <Button size="sm" variant="ghost" onClick={() => setEditingPasswordId(null)} className="w-full py-1 text-xs h-7">Cancelar</Button>
                                     </div>
                                 </div>
                             ) : (
                                 <div className="flex gap-2">
                                     <Button variant="secondary" size="sm" fullWidth onClick={() => handleOpenEditUserModal(user)} className="text-xs">
                                         <Pencil size={12} className="mr-1.5"/> Editar
                                     </Button>
                                     <Button variant="ghost" size="sm" fullWidth onClick={() => handleStartPasswordEdit(user.id)} className="text-xs">
                                         <Key size={12} className="mr-1.5"/> Senha
                                     </Button>
                                 </div>
                             )}
                         </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Add User Modal */}
        {isAddUserModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Adicionar Instrutor</h3>
                        <button onClick={() => setIsAddUserModalOpen(false)}><X size={20} className="text-slate-400"/></button>
                    </div>
                    
                    <form onSubmit={handleAddUserSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome Completo</label>
                            <input required type="text" value={newUserForm.name} onChange={e => setNewUserForm({...newUserForm, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email</label>
                            <input required type="email" value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Meta (Horas)</label>
                                <input type="number" value={newUserForm.targetHours} onChange={e => setNewUserForm({...newUserForm, targetHours: parseInt(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"/>
                             </div>
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Subgrupo</label>
                                <input type="text" placeholder="Ex: Equipe A" value={newUserForm.subgroup} onChange={e => setNewUserForm({...newUserForm, subgroup: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"/>
                             </div>
                        </div>
                        <div>
                             <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Idiomas</label>
                             <div className="flex flex-wrap gap-2">
                                 {['PT', 'EN', 'ES', 'FR', 'IT', 'DE'].map(lang => (
                                     <button 
                                        key={lang}
                                        type="button"
                                        onClick={() => toggleLanguage(lang)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${newUserForm.languages.includes(lang) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400'}`}
                                     >
                                         {lang}
                                     </button>
                                 ))}
                             </div>
                        </div>
                        <div className="pt-2">
                             <Button type="submit" fullWidth>Criar Instrutor</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Edit User Modal */}
        {editUserModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Editar Instrutor</h3>
                        <button onClick={() => setEditUserModal({open: false, user: null, formData: {}})}><X size={20} className="text-slate-400"/></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome Completo</label>
                            <input type="text" value={editUserModal.formData.name || ''} onChange={e => setEditUserModal({...editUserModal, formData: {...editUserModal.formData, name: e.target.value}})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email</label>
                            <input type="email" value={editUserModal.formData.email || ''} onChange={e => setEditUserModal({...editUserModal, formData: {...editUserModal.formData, email: e.target.value}})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Meta (Horas)</label>
                                <input type="number" value={editUserModal.formData.targetHours || 0} onChange={e => setEditUserModal({...editUserModal, formData: {...editUserModal.formData, targetHours: parseInt(e.target.value)}})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"/>
                             </div>
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Subgrupo</label>
                                <input type="text" value={editUserModal.formData.subgroup || ''} onChange={e => setEditUserModal({...editUserModal, formData: {...editUserModal.formData, subgroup: e.target.value}})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"/>
                             </div>
                        </div>
                        <div>
                             <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Idiomas</label>
                             <div className="flex flex-wrap gap-2">
                                 {['PT', 'EN', 'ES', 'FR', 'IT', 'DE'].map(lang => (
                                     <button 
                                        key={lang}
                                        type="button"
                                        onClick={() => toggleEditLanguage(lang)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${(editUserModal.formData.languages || []).includes(lang) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400'}`}
                                     >
                                         {lang}
                                     </button>
                                 ))}
                             </div>
                        </div>
                        <div className="pt-2 flex gap-2">
                             <Button onClick={handleSaveUserChanges} fullWidth>Salvar Alterações</Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteUserModal.open && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                 <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-100 dark:border-slate-800">
                     <div className="flex items-center gap-3 mb-4 text-red-600">
                         <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                             <AlertOctagon size={24}/>
                         </div>
                         <h3 className="text-lg font-bold text-slate-900 dark:text-white">Excluir Instrutor?</h3>
                     </div>
                     <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                         Tem certeza que deseja remover <strong>{deleteUserModal.user?.name}</strong>? Esta ação removerá o acesso do usuário, mas manterá o histórico de registros para auditoria.
                     </p>
                     <div className="flex justify-end gap-2">
                         <Button variant="ghost" onClick={() => setDeleteUserModal({open: false, user: null})}>Cancelar</Button>
                         <Button variant="danger" onClick={confirmDeleteUser}>Confirmar Exclusão</Button>
                     </div>
                 </div>
             </div>
        )}

      </div>
    );
  };

  const renderDetailView = () => {
    const user = allUsers.find(u => u.id === selectedUserId);
    if (!user) return null;

    // Filter entries specifically for this view using detailDateRange
    const userEntries = entries.filter(entry => {
        const validUser = entry.userId === user.id;
        const validDate = entry.date >= detailDateRange.start && entry.date <= detailDateRange.end;
        return validUser && validDate;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const daysInDetailPeriod = getDaysDifference(detailDateRange.start, detailDateRange.end);
    const userStats = calculateStats(userEntries, daysInDetailPeriod);
    
    // Progress calculation
    const progressPercent = Math.min((userStats.totalHours / (user.targetHours || 50)) * 100, 100);

    const chartData = userEntries.reduce((acc: any[], curr) => {
      const found = acc.find(i => i.name === curr.designation);
      if (found) found.hours += curr.hours;
      else acc.push({ name: curr.designation, hours: curr.hours });
      return acc;
    }, []);

    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 pb-10">
        
        {/* Header Navigation & Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <Button variant="ghost" onClick={() => setSelectedUserId(null)} className="flex items-center pl-0 hover:bg-transparent">
            <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full mr-3 text-slate-600 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-600 transition-colors">
                <ChevronLeft size={20}/> 
            </div>
            <div className="text-left">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Voltar para Dashboard</p>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-none mt-0.5">{user.name}</h2>
            </div>
          </Button>

          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
             <div className="flex items-center px-3 border-r border-slate-200 dark:border-slate-700">
                <Calendar size={16} className="text-slate-400 mr-2"/>
                <span className="text-xs font-semibold text-slate-500 uppercase mr-2">Período</span>
             </div>
             <input 
                type="date" 
                value={detailDateRange.start} 
                onChange={e => setDetailDateRange({...detailDateRange, start: e.target.value})} 
                className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-0 p-1 outline-none"
             />
             <span className="text-slate-400">-</span>
             <input 
                type="date" 
                value={detailDateRange.end} 
                onChange={e => setDetailDateRange({...detailDateRange, end: e.target.value})} 
                className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-0 p-1 outline-none"
             />
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           {/* Card 1: Profile & Bio */}
           <div className="lg:col-span-1 bg-gradient-to-br from-[#FDFBF7] to-[#F4F4F5] dark:from-slate-800 dark:to-slate-900/50 rounded-3xl p-8 relative overflow-hidden shadow-sm border border-slate-200/60 dark:border-slate-700 flex flex-col justify-between min-h-[300px]">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                 <Briefcase size={120} className="text-slate-900 dark:text-white"/>
              </div>
              
              <div className="relative z-10">
                 <div className="relative inline-block group">
                     <img className="h-24 w-24 rounded-2xl object-cover shadow-lg border-4 border-white dark:border-slate-700 cursor-pointer hover:opacity-80 transition-opacity" src={user.photoUrl} alt="" onClick={() => handleChangePhoto(user)} />
                     <button onClick={() => handleChangePhoto(user)} className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-600 p-2 rounded-xl shadow-md text-slate-600 dark:text-white hover:text-indigo-600 transition-colors">
                        <Camera size={14} />
                     </button>
                 </div>
                 <div className="mt-6">
                     <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{user.name}</h2>
                     <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">{user.subgroup || 'Instrutor Geral'}</p>
                 </div>
              </div>

              <div className="relative z-10 mt-6">
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Idiomas</p>
                 <div className="flex flex-wrap gap-2">
                     {user.languages.map(lang => (
                         <span key={lang} className="px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-600">
                             {lang}
                         </span>
                     ))}
                 </div>
              </div>
           </div>

           {/* Card 2: Progress & Main Stats */}
           <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
              <div>
                  <div className="flex justify-between items-start mb-6">
                      <div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total no Período</p>
                          <h3 className="text-5xl font-bold text-slate-900 dark:text-white tracking-tighter mt-2">{formatHoursToHHMM(userStats.totalHours)}</h3>
                      </div>
                      <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-2xl">
                          <TrendingUp size={24} />
                      </div>
                  </div>

                  <div className="mb-6">
                      <div className="flex justify-between text-sm font-semibold mb-2">
                          <span className="text-slate-700 dark:text-slate-300">Meta Mensal</span>
                          <span className="text-indigo-600 dark:text-indigo-400">{progressPercent.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                          <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full" style={{ width: `${progressPercent}%` }}></div>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 text-right">Alvo: {user.targetHours}h</p>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-2xl">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Média Diária</p>
                      <p className="text-xl font-bold text-slate-800 dark:text-white">{formatHoursToHHMM(userStats.avgHoursPerDay)}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-2xl">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Registros</p>
                      <p className="text-xl font-bold text-slate-800 dark:text-white">{userStats.entryCount}</p>
                  </div>
              </div>
           </div>

           {/* Card 3: Activity Breakdown */}
           <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-900 dark:text-white">Distribuição</h3>
                  <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><Target size={18} className="text-slate-400"/></button>
              </div>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? "#334155" : "#f1f5f9"} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={90} tick={{fontSize: 11, fill: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 600}} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', backgroundColor: isDarkMode ? '#1e293b' : '#fff', color: isDarkMode ? '#fff' : '#0f172a'}} formatter={(value: number) => [`${formatHoursToHHMM(value)}`, 'Horas']} />
                    <Bar dataKey="hours" fill={isDarkMode ? "#818cf8" : "#8b5cf6"} radius={[0, 6, 6, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>

        </div>

        {/* Bottom List (Dark/Light card style) */}
        <div className="bg-slate-900 dark:bg-black/80 rounded-3xl p-6 shadow-xl text-slate-100 ring-1 ring-white/10">
             <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
               <h3 className="font-bold text-lg flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                   Histórico Detalhado
               </h3>
               <span className="text-xs font-mono text-slate-400 bg-white/5 px-2 py-1 rounded">
                   {userEntries.length} registros
               </span>
             </div>
             
             <div className="overflow-x-auto">
               <table className="min-w-full">
                 <thead>
                   <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                     <th className="px-4 py-3">Status</th>
                     <th className="px-4 py-3">Data</th>
                     <th className="px-4 py-3">Designação</th>
                     <th className="px-4 py-3">Horas</th>
                     <th className="px-4 py-3">Nota</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/10">
                   {userEntries.length === 0 ? (
                       <tr><td colSpan={5} className="py-8 text-center text-slate-500">Nenhum registro encontrado neste período.</td></tr>
                   ) : userEntries.map(e => (
                     <tr key={e.id} className="hover:bg-white/5 transition-colors group">
                       <td className="px-4 py-3">
                            {e.status === 'approved' && <CheckCircle size={16} className="text-emerald-400"/>}
                            {e.status === 'pending' && <Clock size={16} className="text-amber-400"/>}
                            {e.status === 'rejected' && <XCircle size={16} className="text-red-400"/>}
                       </td>
                       <td className="px-4 py-3 text-sm font-medium text-slate-200">{formatDateDisplay(e.date)}</td>
                       <td className="px-4 py-3 text-sm text-slate-300">{e.designation}</td>
                       <td className="px-4 py-3 text-sm font-bold text-white">{formatHoursToHHMM(e.hours)}</td>
                       <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate group-hover:text-slate-200 transition-colors">{e.notes || '-'}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
        </div>
      </div>
    );
  };

  const renderDashboardView = () => {
    // Calc logic same as before
    const instructorStats = instructors
      .filter(u => u.name.toLowerCase().includes(filterText.toLowerCase()))
      .map(inst => {
        const instEntries = filterEntries(entries, inst.id, currentUser.zoneId, dateRange.start, dateRange.end);
        const s = calculateStats(instEntries, daysInPeriod);
        return { user: inst, stats: s };
      })
      .sort((a,b) => b.stats.totalHours - a.stats.totalHours);

    const timeSeriesData = (() => {
      const grouped = filteredEntries.reduce((acc, entry) => {
        if (!acc[entry.date]) acc[entry.date] = 0; acc[entry.date] += entry.hours; return acc;
      }, {} as Record<string, number>);
      const data = []; let curr = new Date(dateRange.start); const end = new Date(dateRange.end);
      while (curr.getTime() <= end.getTime()) {
        const d = curr.toISOString().split('T')[0];
        data.push({ date: formatDateDisplay(d).substring(0, 5), hours: grouped[d] || 0 });
        curr.setDate(curr.getDate() + 1);
      }
      return data;
    })();

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <StatCard label="Total Zona" value={`${formatHoursToHHMM(stats.totalHours)}`} icon={Clock} gradientFrom="from-indigo-500/20" gradientTo="to-blue-500/20" color="text-indigo-600 dark:text-indigo-400" />
           <StatCard label="Média / Pessoa" value={`${formatHoursToHHMM(stats.totalHours / (instructors.length || 1))}`} icon={Users} gradientFrom="from-emerald-500/20" gradientTo="to-teal-500/20" color="text-emerald-600 dark:text-emerald-400" />
           <StatCard label="Registros Totais" value={stats.entryCount} icon={Briefcase} gradientFrom="from-fuchsia-500/20" gradientTo="to-pink-500/20" color="text-fuchsia-600 dark:text-fuchsia-400" />
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card rounded-2xl p-6">
               <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-6">Gráfico de Horas</h3>
               <div className="h-72 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={timeSeriesData}>
                     <defs>
                        <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#e2e8f0"} />
                     <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12}} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12}} />
                     <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: isDarkMode ? '#1e293b' : '#fff', color: isDarkMode ? '#fff' : '#0f172a'}} formatter={(value: number) => [`${formatHoursToHHMM(value)}`, 'Horas']} />
                     <Line type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={3} dot={{r: 0}} activeDot={{r: 6, fill: '#4f46e5'}} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>
            
            <div className="glass-card rounded-2xl p-6 flex flex-col gap-6">
               <div>
                   <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4">Controles do Período</h3>
                   <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                       <div className="flex justify-between items-center mb-3">
                           <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Data de Fechamento</span>
                           <button onClick={() => setLockDateModal({open: true, date: globalLockDate || new Date().toISOString().split('T')[0]})} className="text-xs text-indigo-600 hover:underline" title="Alterar">Alterar</button>
                       </div>
                       <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
                           <div className="flex items-center text-slate-700 dark:text-white font-mono text-sm">
                               {globalLockDate ? (
                                   <><Lock size={14} className="mr-2 text-red-500"/> {formatDateDisplay(globalLockDate)}</>
                               ) : (
                                   <><Unlock size={14} className="mr-2 text-emerald-500"/> Aberto</>
                               )}
                           </div>
                           <Button size="sm" onClick={() => setLockDateModal({open: true, date: globalLockDate || new Date().toISOString().split('T')[0]})} variant="secondary">Definir</Button>
                       </div>
                       <p className="text-[10px] text-slate-400 mt-2">Instrutores não podem editar registros anteriores a esta data.</p>
                   </div>
               </div>

               <div>
                   <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4">Exportação</h3>
                   <div className="grid grid-cols-2 gap-3">
                       <Button onClick={() => generatePDF('executive', filteredEntries, allUsers, "Zona Menezes", dateRange)} variant="secondary" className="flex flex-col h-20 items-center justify-center gap-1">
                           <FileText size={20} className="text-indigo-600"/>
                           <span className="text-xs">PDF Executivo</span>
                       </Button>
                       <Button onClick={() => generatePDF('detailed', filteredEntries, allUsers, "Zona Menezes", dateRange)} variant="secondary" className="flex flex-col h-20 items-center justify-center gap-1">
                           <FileDown size={20} className="text-emerald-600"/>
                           <span className="text-xs">PDF Detalhado</span>
                       </Button>
                   </div>
               </div>
            </div>
         </div>

         {/* Instructor Table */}
         <div className="glass-card rounded-2xl overflow-hidden">
             <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
                 <div className="flex gap-2 w-full sm:w-auto">
                    <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm p-2 outline-none"/>
                    <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm p-2 outline-none"/>
                 </div>
                 <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                    <input type="text" placeholder="Filtrar instrutor..." value={filterText} onChange={e => setFilterText(e.target.value)} className="w-full pl-9 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm p-2 outline-none"/>
                 </div>
             </div>
            <table className="min-w-full">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Instrutor</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Idiomas</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Horas</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Média</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {instructorStats.map(({ user, stats }) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group" onClick={() => handleOpenUserProfile(user.id)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <img className="h-10 w-10 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" src={user.photoUrl} alt="" />
                        <div className="ml-4">
                            <div className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{user.subgroup}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex gap-1">
                            {user.languages.map(l => <span key={l} className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{l}</span>)}
                        </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-900/30">{formatHoursToHHMM(stats.totalHours)}</span></td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{formatHoursToHHMM(stats.avgHoursPerEntry)}</td>
                    <td className="px-6 py-4 text-right">
                        <span className="text-sm font-medium text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Ver Detalhes &rarr;</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
         </div>

         {/* Rejection Modal */}
         {rejectionModal.open && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                 <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-100 dark:border-slate-800">
                     <div className="flex items-center gap-3 mb-4 text-red-600">
                         <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                             <XCircle size={24}/>
                         </div>
                         <h3 className="text-lg font-bold text-slate-900 dark:text-white">Rejeitar Registro</h3>
                     </div>
                     <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                         Por favor, informe o motivo da rejeição. Esta informação será visível para o instrutor.
                     </p>
                     <textarea 
                        className="w-full h-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4"
                        placeholder="Ex: Horas duplicadas, data incorreta..."
                        value={rejectionModal.reason}
                        onChange={e => setRejectionModal({...rejectionModal, reason: e.target.value})}
                     />
                     <div className="flex justify-end gap-2">
                         <Button variant="ghost" onClick={() => setRejectionModal({open: false, entryId: null, reason: ''})}>Cancelar</Button>
                         <Button variant="danger" onClick={handleRejectionSubmit} disabled={!rejectionModal.reason.trim()}>Confirmar Rejeição</Button>
                     </div>
                 </div>
             </div>
         )}

         {/* Lock Date Modal */}
         {lockDateModal.open && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                 <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-100 dark:border-slate-800">
                     <div className="flex items-center gap-3 mb-4 text-indigo-600">
                         <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                             <Calendar size={24}/>
                         </div>
                         <h3 className="text-lg font-bold text-slate-900 dark:text-white">Controle de Período</h3>
                     </div>
                     <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                         Defina a data de fechamento. Registros anteriores a esta data <strong>não poderão ser criados ou editados</strong> pelos instrutores.
                     </p>
                     
                     <div className="mb-6">
                         <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data de Corte</label>
                         <input 
                            type="date" 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                            value={lockDateModal.date}
                            onChange={e => setLockDateModal({...lockDateModal, date: e.target.value})}
                         />
                     </div>

                     <div className="flex flex-col gap-2">
                         <Button variant="primary" onClick={handleLockDateSubmit}>Salvar Data de Fechamento</Button>
                         <div className="flex justify-between gap-2 mt-2">
                             <Button variant="ghost" onClick={() => setLockDateModal({...lockDateModal, open: false})}>Cancelar</Button>
                             {globalLockDate && <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={handleClearLockDate}>Remover Bloqueio</Button>}
                         </div>
                     </div>
                 </div>
             </div>
         )}

      </div>
    );
  };

  const renderApprovalsView = () => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
               <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Aprovações Pendentes</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total: {pendingEntries.length} registros aguardando revisão</p>
               </div>
               <div className="flex gap-2">
                   {/* Batch actions could go here */}
               </div>
            </div>

            {pendingEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                    <CheckCircle size={48} className="text-emerald-500 mb-4 opacity-50"/>
                    <h3 className="text-lg font-bold text-slate-700 dark:text-white">Tudo Limpo!</h3>
                    <p className="text-slate-500 dark:text-slate-400">Não há registros pendentes para aprovação.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {pendingEntries.map(entry => {
                        const user = allUsers.find(u => u.id === entry.userId);
                        return (
                            <div key={entry.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between gap-4 group hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
                                <div className="flex items-start gap-4">
                                    <img src={user?.photoUrl} className="w-10 h-10 rounded-full bg-slate-100"/>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-slate-900 dark:text-white">{user?.name}</h4>
                                            <span className="text-xs text-slate-400">• {formatDateDisplay(entry.date)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-medium">{entry.designation}</span>
                                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{formatHoursToHHMM(entry.hours)}</span>
                                            <span className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700 px-1 rounded uppercase">{entry.languages.join('/')}</span>
                                        </div>
                                        {entry.notes && (
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg italic">"{entry.notes}"</p>
                                        )}
                                        {entry.link && (
                                            <a href={entry.link} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline mt-1 inline-block">Ver Anexo</a>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 self-end sm:self-center">
                                    <button onClick={() => setRejectionModal({open: true, entryId: entry.id, reason: ''})} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
                                        <XCircle size={18}/> Rejeitar
                                    </button>
                                    <button onClick={() => onApproveEntry(entry.id)} className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 text-sm font-bold">
                                        <CheckCircle size={18}/> Aprovar
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
  };

  const renderAlertsView = () => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center justify-between mb-2">
               <h2 className="text-xl font-bold text-slate-900 dark:text-white">Alertas Inteligentes</h2>
               <div className="flex items-center gap-4">
                   <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-200">
                       {smartAlerts.length} detectados
                   </div>
                   {smartAlerts.length > 0 && (
                       <Button size="sm" variant="secondary" onClick={handleClearAllAlerts} className="text-xs">
                           Limpar Todos
                       </Button>
                   )}
               </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {smartAlerts.length === 0 ? (
                   <div className="col-span-2 p-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                       <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4 opacity-50"/>
                       <h3 className="text-lg font-bold text-slate-700 dark:text-white">Tudo Certo!</h3>
                       <p className="text-slate-500">Nenhuma anomalia detectada nos registros atuais.</p>
                   </div>
               ) : smartAlerts.map((alert) => {
                   const user = allUsers.find(u => u.id === alert.userId);
                   return (
                       <div key={alert.id} className={`p-6 rounded-2xl border-l-4 shadow-sm flex items-start gap-4 ${alert.severity === 'high' ? 'bg-red-50 dark:bg-red-900/10 border-red-500' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-500'}`}>
                           <div className={`p-2 rounded-full ${alert.severity === 'high' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                               <AlertTriangle size={24}/>
                           </div>
                           <div className="flex-1">
                               <div className="flex justify-between items-start">
                                   <h4 className="font-bold text-slate-800 dark:text-white">{user?.name || 'Usuário Desconhecido'}</h4>
                                   <div className="flex gap-2">
                                       <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white dark:bg-slate-800 shadow-sm">{alert.type.replace(/_/g, ' ')}</span>
                                       <button onClick={() => handleDismissAlert(alert.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={14}/></button>
                                   </div>
                               </div>
                               <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{alert.message}</p>
                               <div className="mt-4 flex gap-2">
                                   <Button size="sm" variant="secondary" onClick={() => handleOpenUserProfile(alert.userId)}>Ver Perfil</Button>
                               </div>
                           </div>
                       </div>
                   );
               })}
           </div>
        </div>
    )
  }

  const renderAuditView = () => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center justify-between mb-2">
               <h2 className="text-xl font-bold text-slate-900 dark:text-white">Histórico de Ações</h2>
               <p className="text-sm text-slate-500">Registro de ações dos supervisores</p>
           </div>

           <div className="glass-card rounded-2xl overflow-hidden">
               <table className="min-w-full">
                   <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                       <tr>
                           <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Data/Hora</th>
                           <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Supervisor</th>
                           <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Ação</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                       {supervisorLogs.length === 0 ? (
                           <tr><td colSpan={3} className="p-8 text-center text-slate-500">Nenhum registro de atividade ainda.</td></tr>
                       ) : supervisorLogs.map(log => (
                           <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                               <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                   {new Date(log.timestamp).toLocaleString()}
                               </td>
                               <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                                   {log.supervisorName}
                               </td>
                               <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                                   {log.action}
                               </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen pb-10 transition-colors">
      <header className="sticky top-4 z-40 px-4 sm:px-6 lg:px-8 mb-8">
        <div className="glass rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-black/20 p-4 flex justify-between items-center max-w-7xl mx-auto transition-all">
          <div className="flex items-center space-x-4">
             <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 mb-4 overflow-hidden">
                 <img
                 src="https://i.imgur.com/ZBqY97C.png"
                 alt="Logo"
                 className="w-100 h-100 object-contain drop-shadow"
                 loading="lazy"
                 />
             </div>
             <div>
               <h1 className="text-base font-bold text-slate-900 dark:text-white">Portal do Supervisor</h1>
               <p className="text-xs text-slate-500 dark:text-slate-400">Zona {currentUser.zoneId === 'z1' ? 'Menezes' : 'Geral'}</p>
             </div>
          </div>
          <div className="flex items-center space-x-2">
             <button onClick={toggleDarkMode} className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
               {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
             <Button variant="ghost" size="sm" onClick={onLogout}>Sair</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {selectedUserId ? renderDetailView() : (
          <>
            <div className="flex justify-center mb-8 overflow-x-auto">
               <div className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl inline-flex shadow-inner border border-slate-200/50 dark:border-slate-700/50 min-w-max">
                   <button onClick={() => setActiveTab('dashboard')} className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Visão Geral</button>
                   <button onClick={() => setActiveTab('team')} className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'team' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Instrutores</button>
                   <button onClick={() => setActiveTab('alerts')} className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'alerts' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                       Alertas {smartAlerts.length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{smartAlerts.length}</span>}
                   </button>
                   <button onClick={() => setActiveTab('approvals')} className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'approvals' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                       Aprovações {pendingEntries.length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingEntries.length}</span>}
                   </button>
                   <button onClick={() => setActiveTab('audit')} className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'audit' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                       Histórico
                   </button>
               </div>
            </div>
            {activeTab === 'dashboard' ? renderDashboardView() : activeTab === 'team' ? renderTeamManagementView() : activeTab === 'alerts' ? renderAlertsView() : activeTab === 'approvals' ? renderApprovalsView() : renderAuditView()}
          </>
        )}
      </main>
    </div>
  );
};