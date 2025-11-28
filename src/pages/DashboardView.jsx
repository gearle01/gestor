import React, { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar,
  Target, Edit2, CheckCircle, Trophy, AlertCircle, Users, Plus
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, appId, auth } from '../firebase';
import { Card } from '../components/UI';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function DashboardView({ transactions = [], onNavigate }) {
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  const [loadingGoal, setLoadingGoal] = useState(true);

  // 1. Carregar Meta
  useEffect(() => {
    const fetchGoal = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'settings', 'profile');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMonthlyGoal(parseFloat(docSnap.data().monthlyGoal) || 0);
        }
      } catch (error) {
        console.error("Erro ao carregar meta:", error);
      } finally {
        setLoadingGoal(false);
      }
    };
    fetchGoal();
  }, []);

  // 2. Salvar Meta
  const handleSaveGoal = async () => {
    if (!auth.currentUser || !newGoal) return;
    try {
      const val = parseFloat(newGoal);
      await setDoc(doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'settings', 'profile'), {
        monthlyGoal: val
      }, { merge: true });
      setMonthlyGoal(val);
      setIsEditingGoal(false);
    } catch (error) {
      alert("Erro ao salvar meta.");
    }
  };

  // 3. Cálculos Financeiros
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const currentMonthTransactions = transactions.filter(t => {
    const tDate = new Date(t.date + 'T00:00:00');
    return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
  });

  const income = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

  const expense = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

  const balance = income - expense;
  const progressPercent = monthlyGoal > 0 ? Math.min((income / monthlyGoal) * 100, 100) : 0;
  const isGoalReached = income >= monthlyGoal && monthlyGoal > 0;

  const chartData = transactions
    .slice(0, 20)
    .reverse()
    .map(t => ({
      name: new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      valor: parseFloat(t.amount),
      type: t.type
    }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Visão Geral</h2>
          <p className="text-gray-500 text-sm">Resumo de {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* 1. META MENSAL (Banner) */}
      <div className="bg-gradient-to-r from-azuri-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy size={120} /></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-azuri-100 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <Target size={18} /> Meta Mensal
              </h3>
              {isEditingGoal ? (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-bold">R$</span>
                  <input
                    autoFocus
                    type="number"
                    className="w-32 bg-white/20 border border-white/30 rounded px-2 py-1 text-white font-bold outline-none focus:bg-white/30"
                    placeholder="0.00"
                    value={newGoal}
                    onChange={e => setNewGoal(e.target.value)}
                  />
                  <button onClick={handleSaveGoal} className="bg-green-500 hover:bg-green-600 p-1.5 rounded text-white"><CheckCircle size={18} /></button>
                </div>
              ) : (
                <div className="flex items-end gap-2 mt-1 group cursor-pointer" onClick={() => { setNewGoal(monthlyGoal); setIsEditingGoal(true); }}>
                  <span className="text-3xl font-bold">
                    R$ {monthlyGoal > 0 ? monthlyGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'Definir Meta'}
                  </span>
                  <Edit2 size={16} className="text-azuri-200 opacity-0 group-hover:opacity-100 mb-2 transition-opacity" />
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-azuri-100 text-xs uppercase">Faturamento Atual</p>
              <p className="text-2xl font-bold">R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-azuri-100">
              <span>{progressPercent.toFixed(0)}% Concluído</span>
              <span>{isGoalReached ? '🎉 Meta Batida!' : `Falta R$ ${(monthlyGoal - income).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</span>
            </div>
            <div className="w-full h-4 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
              <div className={`h-full rounded-full transition-all duration-1000 ease-out relative ${isGoalReached ? 'bg-green-400' : 'bg-yellow-400'}`} style={{ width: `${progressPercent}%` }}>
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-green-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-full text-green-600"><TrendingUp size={24} /></div>
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase">Entradas</p>
              <p className="text-xl font-bold text-gray-800">R$ {income.toFixed(2)}</p>
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-red-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-full text-red-600"><TrendingDown size={24} /></div>
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase">Saídas</p>
              <p className="text-xl font-bold text-gray-800">R$ {expense.toFixed(2)}</p>
            </div>
          </div>
        </Card>
        <Card className={`border-l-4 ${balance >= 0 ? 'border-blue-500' : 'border-orange-500'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${balance >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase">Saldo</p>
              <p className={`text-xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>R$ {balance.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. ATALHOS RÁPIDOS (VISUAL NOVO - GRID) */}
      <div>
        <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">🚀 Ações Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={() => onNavigate('agenda')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-azuri-500 hover:shadow-md transition-all flex flex-col items-center gap-3 text-center group">
            <div className="p-3 bg-azuri-50 text-azuri-600 rounded-full group-hover:bg-azuri-600 group-hover:text-white transition-colors">
              <Calendar size={24} />
            </div>
            <span className="font-bold text-gray-700 text-sm">Novo Agendamento</span>
          </button>

          <button onClick={() => onNavigate('financial')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-red-500 hover:shadow-md transition-all flex flex-col items-center gap-3 text-center group">
            <div className="p-3 bg-red-50 text-red-600 rounded-full group-hover:bg-red-600 group-hover:text-white transition-colors">
              <DollarSign size={24} />
            </div>
            <span className="font-bold text-gray-700 text-sm">Registrar Despesa</span>
          </button>

          <button onClick={() => onNavigate('clients')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-green-500 hover:shadow-md transition-all flex flex-col items-center gap-3 text-center group">
            <div className="p-3 bg-green-50 text-green-600 rounded-full group-hover:bg-green-600 group-hover:text-white transition-colors">
              <Users size={24} />
            </div>
            <span className="font-bold text-gray-700 text-sm">Novo Cliente</span>
          </button>

          <button onClick={() => onNavigate('services')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-orange-500 hover:shadow-md transition-all flex flex-col items-center gap-3 text-center group">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-full group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <Plus size={24} />
            </div>
            <span className="font-bold text-gray-700 text-sm">Novo Serviço</span>
          </button>
        </div>
      </div>

      {/* 4. GRÁFICO (AGORA LARGO) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2"><BarChart3 size={18} /> Evolução Financeira</h3>
        <div className="h-72 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF' }} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} tick={{ fill: '#9CA3AF' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Valor']}
                />
                <Area type="monotone" dataKey="valor" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorValor)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <BarChart3 size={48} className="mb-3 opacity-20" />
              <p className="text-sm">Nenhuma movimentação recente</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}