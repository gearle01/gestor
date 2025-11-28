import React, { useState, useEffect } from 'react';
// 👇 Adicione estes imports do Router
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { BarChart3, Calendar, DollarSign, Users, Scissors, Package, Briefcase, FileText, Settings, LogOut, Menu, Search, HelpCircle, CreditCard } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, setDoc, orderBy } from 'firebase/firestore';
import { auth, db, appId } from './firebase.js';

import LoginScreen from './pages/LoginScreen.jsx';
import DashboardView from './pages/DashboardView.jsx';
import FinancialView from './pages/FinancialView.jsx';
import { ClientsView, ServicesView, ProductsView, ProfessionalsView, ReportsView, AgendaView, SettingsView, HelpView } from './pages/ManagementViews.jsx';
import PaymentView from './pages/PaymentView.jsx';
import PaymentBanner from './components/PaymentBanner.jsx';
import WelcomeBanner from './components/WelcomeBanner.jsx';
// 👇 Importe a nova página
import PublicBooking from './pages/PublicBooking.jsx';

// Componente Wrapper para o Painel Administrativo (O seu App antigo)
function AdminPanel() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);

  const currentUser = user ? { ...user, ...userProfile } : null;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setUserProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !user.uid) return;

    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), orderBy('date', 'desc'));
    const unsubTrans = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(data);
    }, (error) => console.error("Erro transações:", error));

    const unsubUser = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), (s) => {
      setLoading(false); // Carregou
      if (s.exists()) {
        const data = s.data();
        let calculatedDueDays = 15;
        if (data.paymentDueDate) {
          const dueDate = data.paymentDueDate.toDate();
          const today = new Date();
          dueDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          const diffTime = dueDate.getTime() - today.getTime();
          calculatedDueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        setUserProfile({ ...data, isPaid: data.isPaid !== undefined ? data.isPaid : true, dueDays: calculatedDueDays });
      } else {
        setUserProfile({ isPaid: true, dueDays: 15 });
      }
    });

    return () => { unsubTrans(); unsubUser(); };
  }, [user]);

  const handleLogout = async () => { try { await signOut(auth); } catch (error) { console.error("Erro ao sair:", error); } };
  const handleSaveSettings = async (data) => { if (!user) return; await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), data, { merge: true }); alert("Salvo com sucesso!"); };
  const handleAddTransaction = async (data) => { if (!user) return; await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), data); };
  const handleDeleteTransaction = async (id) => { if (!user) return; await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', id)); };

  const menuItems = [
    { id: 'dashboard', label: 'Resumo', icon: BarChart3 },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'financial', label: 'Financeiro', icon: DollarSign },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'services', label: 'Serviços & Pacotes', icon: Scissors },
    { id: 'products', label: 'Produtos & Estoque', icon: Package },
    { id: 'professionals', label: 'Profissionais', icon: Briefcase },
    { id: 'reports', label: 'Relatórios', icon: FileText },
    { id: 'settings', label: 'Configurações', icon: Settings },
    { id: 'help', label: 'Ajuda', icon: HelpCircle },
    { id: 'payment', label: 'Assinatura', icon: CreditCard },
  ];

  if (loading) return <div className="h-screen flex items-center justify-center text-azuri-600 font-bold">Carregando Sistema...</div>;
  if (!user) return <LoginScreen />;

  const isBlocked = currentUser?.dueDays !== undefined && currentUser.dueDays < 0;
  const isDueSoon = currentUser?.dueDays !== undefined && currentUser.dueDays >= 0 && currentUser.dueDays <= 3;
  const hasPaymentMethod = currentUser?.paymentMethod !== undefined && currentUser?.paymentMethod !== null;
  const isTrialUser = !hasPaymentMethod;
  const shouldShowWelcome = showWelcome && !isBlocked && isTrialUser;

  if (isBlocked && currentView !== 'payment') setCurrentView('payment');
  if (isBlocked && currentView === 'payment') return <PaymentView user={currentUser} />;

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {isDueSoon && <PaymentBanner days={currentUser.dueDays} onClick={() => setCurrentView('payment')} />}

      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-gray-100 bg-azuri-600 text-white">
            <div className="font-bold text-xl flex items-center gap-2"><div className="bg-white text-azuri-600 p-1 rounded-md"><Settings size={16} /></div> Gestor</div>
          </div>
          <div className="p-4 bg-azuri-50 border-b border-azuri-100">
            <p className="text-xs text-azuri-600 font-bold uppercase">Logado como</p>
            <p className="font-bold text-gray-800 truncate text-sm">{user?.businessName || user?.displayName || 'Minha Empresa'}</p>
            {/* 👇 LINK DO AGENDAMENTO PÚBLICO (NOVO) */}
            <a href={`/agendar/${user.uid}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1 block">
              🔗 Meu Link de Agendamento
            </a>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => { setCurrentView(item.id); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${currentView === item.id ? 'bg-azuri-100 text-azuri-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <item.icon size={18} className={currentView === item.id ? 'text-azuri-600' : 'text-gray-400'} /> {item.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100 space-y-4">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"><LogOut size={18} /> Sair da Conta</button>
          </div>
        </div>
      </aside>

      {isMenuOpen && <div className="fixed inset-0 bg-black/20 z-20 lg:hidden" onClick={() => setIsMenuOpen(false)} />}

      <main className={`flex-1 flex flex-col h-full w-full lg:pl-64 transition-all ${isDueSoon ? 'pt-0' : ''}`}>
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden p-2 text-gray-600"><Menu size={24} /></button>
          <h1 className="text-lg font-bold text-gray-700 lg:hidden">{menuItems.find(i => i.id === currentView)?.label}</h1>
          <div className="flex items-center gap-4 ml-auto">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-azuri-300 outline-none rounded-full text-sm transition-all w-64" />
            </div>
            <div className="w-8 h-8 bg-azuri-100 rounded-full flex items-center justify-center text-azuri-700 font-bold text-sm">{currentUser?.email?.[0]?.toUpperCase() || 'G'}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50 pb-32">
          {shouldShowWelcome && <WelcomeBanner onClose={() => setShowWelcome(false)} onSubscribe={() => setCurrentView('payment')} />}
          <div className="p-4 lg:p-8 max-w-5xl mx-auto">
            {currentView === 'dashboard' && <DashboardView transactions={transactions} onNavigate={setCurrentView} />}
            {currentView === 'financial' && <FinancialView transactions={transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} searchTerm={searchTerm} />}
            {currentView === 'agenda' && <AgendaView db={db} user={currentUser} appId={appId} searchTerm={searchTerm} />}
            {currentView === 'clients' && <ClientsView db={db} user={currentUser} appId={appId} searchTerm={searchTerm} />}
            {currentView === 'services' && <ServicesView db={db} user={currentUser} appId={appId} searchTerm={searchTerm} />}
            {currentView === 'products' && <ProductsView db={db} user={currentUser} appId={appId} searchTerm={searchTerm} />}
            {currentView === 'professionals' && <ProfessionalsView db={db} user={currentUser} appId={appId} searchTerm={searchTerm} />}
            {currentView === 'reports' && <ReportsView db={db} user={currentUser} appId={appId} transactions={transactions} />}
            {currentView === 'settings' && <SettingsView user={currentUser} onSaveSettings={handleSaveSettings} />}
            {currentView === 'help' && <HelpView />}
            {currentView === 'payment' && <PaymentView user={currentUser} />}
          </div>
        </div>
      </main>
    </div>
  );
}

// 👇 CONFIGURAÇÃO DO ROTEADOR (ISSO É NOVO)
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota para o Agendamento Público */}
        <Route path="/agendar/:uid" element={<PublicBooking />} />

        {/* Rota Principal (Painel Admin) */}
        <Route path="/*" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}