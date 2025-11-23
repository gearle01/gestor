import React, { useState, useEffect } from 'react';
import { BarChart3, Calendar, DollarSign, Users, Scissors, Package, Briefcase, FileText, Settings, LogOut, Menu, Search } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, setDoc, orderBy } from 'firebase/firestore';
import { auth, db, appId } from './firebase.js'; // Adicionado .js

// Telas e Componentes - Adicionadas extensões .jsx
import LoginScreen from './pages/LoginScreen.jsx';
import DashboardView from './pages/DashboardView.jsx';
import FinancialView from './pages/FinancialView.jsx';
import { ClientsView, ServicesView, ProductsView, ProfessionalsView, ReportsView, AgendaView, SettingsView } from './pages/ManagementViews.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Observa estado de autenticação
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Buscar dados apenas se estiver logado
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), orderBy('date', 'desc'));
    const unsubTrans = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(data);
    });

    const unsubUser = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), (s) => {
      if (s.exists()) setUser(prev => ({ ...prev, ...s.data() }));
    });

    return () => { unsubTrans(); unsubUser(); };
  }, [user]);

  const handleLogout = async () => {
    try { await signOut(auth); } catch (error) { console.error("Erro ao sair:", error); }
  };

  const handleAddTransaction = async (data) => addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), data);
  const handleDeleteTransaction = async (id) => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', id));
  const handleSaveSettings = async (data) => {
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), data, { merge: true });
    alert("Salvo com sucesso!");
  };

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
  ];

  if (loading) return <div className="h-screen flex items-center justify-center text-azuri-600 font-bold">Iniciando...</div>;
  if (!user) return <LoginScreen />;

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-gray-100 bg-azuri-600 text-white">
            <div className="font-bold text-xl flex items-center gap-2">
              <div className="bg-white text-azuri-600 p-1 rounded-md"><Settings size={16} /></div>
              Gearle
            </div>
          </div>
          <div className="p-4 bg-azuri-50 border-b border-azuri-100">
            <p className="text-xs text-azuri-600 font-bold uppercase">Logado como</p>
            <p className="font-bold text-gray-800 truncate text-sm">
              {user?.businessName || user?.displayName || 'Minha Empresa'}
            </p>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => { setCurrentView(item.id); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${currentView === item.id ? 'bg-azuri-100 text-azuri-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <item.icon size={18} className={currentView === item.id ? 'text-azuri-600' : 'text-gray-400'} />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <LogOut size={18} /> Sair da Conta
            </button>
          </div>
        </div>
      </aside>

      {isMenuOpen && <div className="fixed inset-0 bg-black/20 z-20 lg:hidden" onClick={() => setIsMenuOpen(false)} />}

      <main className="flex-1 flex flex-col h-full w-full">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden p-2 text-gray-600"><Menu size={24} /></button>
          <h1 className="text-lg font-bold text-gray-700 lg:hidden">{menuItems.find(i => i.id === currentView)?.label}</h1>
          <div className="flex items-center gap-4 ml-auto">
            <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><Search size={20} /></button>
            <div className="w-8 h-8 bg-azuri-100 rounded-full flex items-center justify-center text-azuri-700 font-bold text-sm">
              {user?.email?.[0]?.toUpperCase() || 'G'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-gray-50">
          <div className="max-w-5xl mx-auto h-full">
            {currentView === 'dashboard' && <DashboardView transactions={transactions} />}
            {currentView === 'financial' && <FinancialView transactions={transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} />}
            {currentView === 'agenda' && <AgendaView />}
            {currentView === 'clients' && <ClientsView db={db} user={user} appId={appId} />}
            {currentView === 'services' && <ServicesView db={db} user={user} appId={appId} />}
            {currentView === 'products' && <ProductsView db={db} user={user} appId={appId} />}
            {currentView === 'professionals' && <ProfessionalsView db={db} user={user} appId={appId} />}
            {currentView === 'reports' && <ReportsView />}
            {currentView === 'settings' && <SettingsView user={user} onSaveSettings={handleSaveSettings} />}
          </div>
        </div>
      </main>
    </div>
  );
}