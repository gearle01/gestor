import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Calendar, DollarSign, UserPlus, FileText } from 'lucide-react';
import { Card } from '../components/UI.jsx';

const DashboardView = ({ transactions, onNavigate }) => {
  const summary = useMemo(() => {
    let receita = 0;
    let despesa = 0;
    transactions.forEach(t => {
      const val = parseFloat(t.amount || 0);
      if (t.type === 'income') receita += val;
      else despesa += val;
    });
    return { receita, despesa, lucro: receita - despesa };
  }, [transactions]);

  // Função segura para navegar
  const handleNavigate = (view) => {
    if (typeof onNavigate === 'function') {
      onNavigate(view);
    } else {
      console.warn(`Navegando para: ${view}`);
    }
  };

  const shortcuts = [
    { label: 'Novo Agendamento', icon: Calendar, action: () => handleNavigate('agenda') },
    { label: 'Lançar Venda', icon: DollarSign, action: () => handleNavigate('financial') },
    { label: 'Novo Cliente', icon: UserPlus, action: () => handleNavigate('clients') },
    { label: 'Relatório Diário', icon: FileText, action: () => handleNavigate('reports') },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-500 text-sm">Visão geral do seu negócio hoje</p>
        </div>
        <div className="bg-azuri-100 text-azuri-700 px-3 py-1 rounded-full text-xs font-bold">
          Mês Atual
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <p className="text-gray-500 text-xs font-bold uppercase">Receitas</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-1">R$ {summary.receita.toFixed(2)}</h3>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <p className="text-gray-500 text-xs font-bold uppercase">Despesas</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-1">R$ {summary.despesa.toFixed(2)}</h3>
        </Card>
        <Card className="border-l-4 border-l-azuri-500 bg-azuri-50">
          <p className="text-azuri-600 text-xs font-bold uppercase">Lucro Líquido</p>
          <h3 className="text-2xl font-bold text-azuri-900 mt-1">R$ {summary.lucro.toFixed(2)}</h3>
        </Card>
      </div>

      <h3 className="font-bold text-gray-800 mt-4">Acesso Rápido</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {shortcuts.map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            className="p-4 bg-white border hover:border-azuri-300 rounded-xl flex flex-col items-center justify-center gap-2 text-sm font-medium text-gray-700 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <div className="bg-azuri-50 p-2 rounded-full text-azuri-600">
              <item.icon size={20} />
            </div>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DashboardView;