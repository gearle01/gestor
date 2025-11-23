import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Filter, Plus } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';
import { Button, Card, DataTable, Modal, Input } from '../components/UI.jsx'; // Adicionada extensão .jsx

const FinancialView = ({ transactions, onAddTransaction, onDeleteTransaction, searchTerm }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all, income, expense
  const [newTrans, setNewTrans] = useState({ description: '', amount: '', type: 'income', date: new Date().toISOString().split('T')[0] });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddTransaction({
      ...newTrans,
      amount: parseFloat(newTrans.amount),
      createdAt: serverTimestamp()
    });
    setIsModalOpen(false);
    setNewTrans({ description: '', amount: '', type: 'income', date: new Date().toISOString().split('T')[0] });
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description?.toLowerCase().includes(searchTerm?.toLowerCase() || '');
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Fluxo de Caixa</h2>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Filter} onClick={() => setIsFilterOpen(true)}>Filtrar</Button>
          <Button onClick={() => setIsModalOpen(true)} icon={Plus}>Lançar</Button>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col p-0">
        <DataTable
          columns={[
            {
              header: 'Tipo', accessor: 'type', render: r => (
                <div className={`p-1.5 w-fit rounded-full ${r.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {r.type === 'income' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                </div>
              )
            },
            { header: 'Descrição', accessor: 'description', render: r => <span className="font-bold text-gray-700">{r.description}</span> },
            { header: 'Data', accessor: 'date', render: r => <span className="text-xs text-gray-500">{new Date(r.date).toLocaleDateString('pt-BR')}</span> },
            {
              header: 'Valor', accessor: 'amount', render: r => (
                <span className={`font-bold ${r.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {r.type === 'income' ? '+' : '-'} R$ {parseFloat(r.amount).toFixed(2)}
                </span>
              )
            }
          ]}
          data={filteredTransactions}
          onDelete={onDeleteTransaction}
        />
      </Card>

      {isModalOpen && (
        <Modal title="Novo Lançamento" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button type="button" onClick={() => setNewTrans({ ...newTrans, type: 'income' })} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${newTrans.type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}>Receita</button>
              <button type="button" onClick={() => setNewTrans({ ...newTrans, type: 'expense' })} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${newTrans.type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>Despesa</button>
            </div>
            <Input label="Descrição" value={newTrans.description} onChange={e => setNewTrans({ ...newTrans, description: e.target.value })} required />
            <Input label="Valor (R$)" type="number" step="0.01" value={newTrans.amount} onChange={e => setNewTrans({ ...newTrans, amount: e.target.value })} required />
            <Input label="Data" type="date" value={newTrans.date} onChange={e => setNewTrans({ ...newTrans, date: e.target.value })} required />
            <Button className="w-full" type="submit">Salvar</Button>
          </form>
        </Modal>
      )}

      {isFilterOpen && (
        <Modal title="Filtrar Lançamentos" onClose={() => setIsFilterOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">Tipo de Lançamento</label>
              <div className="flex gap-2">
                <button onClick={() => setFilterType('all')} className={`flex-1 py-2 text-sm font-bold rounded-md border ${filterType === 'all' ? 'bg-azuri-100 border-azuri-500 text-azuri-700' : 'bg-white border-gray-200 text-gray-600'}`}>Todos</button>
                <button onClick={() => setFilterType('income')} className={`flex-1 py-2 text-sm font-bold rounded-md border ${filterType === 'income' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-600'}`}>Receitas</button>
                <button onClick={() => setFilterType('expense')} className={`flex-1 py-2 text-sm font-bold rounded-md border ${filterType === 'expense' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-white border-gray-200 text-gray-600'}`}>Despesas</button>
              </div>
            </div>
            <Button onClick={() => setIsFilterOpen(false)} className="w-full">Aplicar Filtros</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FinancialView;