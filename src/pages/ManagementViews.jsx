import React, { useState, useEffect } from 'react';
import { Plus, UserPlus, BarChart3, Users, DollarSign, Briefcase, Package, ChevronRight, Trash2, FileBarChart, Printer } from 'lucide-react';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, orderBy, where, setDoc } from 'firebase/firestore';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Card, Button, Input, DataTable, Modal } from '../components/UI.jsx';
import RelatorioFluxoCaixa from '../components/RelatorioFluxoCaixa';
import RelatorioMelhoresClientes from '../components/RelatorioMelhoresClientes';
import RelatorioEstoque from '../components/RelatorioEstoque';
import RelatorioComissoes from '../components/RelatorioComissoes';

// --- 1. CLIENTES ---
export const ClientsView = ({ db, user, appId, searchTerm }) => {
  const [clients, setClients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', address: '' });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'clients'), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => setClients(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [user, db, appId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'clients'), newClient);
    setIsModalOpen(false);
    setNewClient({ name: '', phone: '', address: '' });
  };

  return (
    <div className="space-y-4 flex flex-col">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Meus Clientes</h2>
        <Button onClick={() => setIsModalOpen(true)} icon={UserPlus}>Adicionar Cliente</Button>
      </div>
      <Card className="flex flex-col p-0">
        <DataTable
          columns={[
            { header: 'Nome', accessor: 'name', render: r => <span className="font-bold">{r.name}</span> },
            { header: 'Telefone', accessor: 'phone' },
            { header: 'Endereço', accessor: 'address' },
          ]}
          data={clients.filter(c => c.name?.toLowerCase().includes(searchTerm?.toLowerCase() || '') || c.phone?.includes(searchTerm || ''))}
          onDelete={async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'clients', id))}
        />
      </Card>
      {isModalOpen && (
        <Modal title="Novo Cliente" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <Input label="Nome Completo" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} required />
            <Input label="Telefone" value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
            <Input label="Endereço" value={newClient.address} onChange={e => setNewClient({ ...newClient, address: e.target.value })} />
            <Button className="w-full" type="submit">Salvar Cliente</Button>
          </form>
        </Modal>
      )}
    </div>
  );
};

// --- 2. SERVIÇOS & PACOTES ---
export const ServicesView = ({ db, user, appId, searchTerm }) => {
  const [tab, setTab] = useState('services');
  const [items, setItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', duration: '' });

  useEffect(() => {
    if (!user) return;
    const collectionName = tab === 'services' ? 'services' : 'packages';
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, collectionName), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [user, tab, db, appId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const collectionName = tab === 'services' ? 'services' : 'packages';
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, collectionName), newItem);
    setIsModalOpen(false);
    setNewItem({ name: '', price: '', duration: '' });
  };

  return (
    <div className="space-y-4 flex flex-col">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Catálogo</h2>
        <Button onClick={() => setIsModalOpen(true)} icon={Plus}>Novo {tab === 'services' ? 'Serviço' : 'Pacote'}</Button>
      </div>
      <div className="flex gap-4 border-b border-gray-200">
        <button onClick={() => setTab('services')} className={`pb-2 px-4 font-bold text-sm ${tab === 'services' ? 'text-azuri-600 border-b-2 border-azuri-600' : 'text-gray-500'}`}>SERVIÇOS</button>
        <button onClick={() => setTab('packages')} className={`pb-2 px-4 font-bold text-sm ${tab === 'packages' ? 'text-azuri-600 border-b-2 border-azuri-600' : 'text-gray-500'}`}>PACOTES</button>
      </div>
      <Card className="flex flex-col p-0">
        <DataTable
          columns={[
            { header: 'Nome', accessor: 'name', render: r => <span className="font-bold">{r.name}</span> },
            { header: 'Preço', accessor: 'price', render: r => `R$ ${parseFloat(r.price).toFixed(2)}` },
            { header: 'Duração', accessor: 'duration', render: r => r.duration ? `${r.duration} min` : '-' },
          ]}
          data={items.filter(i => i.name?.toLowerCase().includes(searchTerm?.toLowerCase() || ''))}
          onDelete={async (id) => {
            const collectionName = tab === 'services' ? 'services' : 'packages';
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, collectionName, id));
          }}
        />
      </Card>
      {isModalOpen && (
        <Modal title={`Adicionar ${tab === 'services' ? 'Serviço' : 'Pacote'}`} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <Input label="Nome" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} required />
            <Input label="Preço (R$)" type="number" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} required />
            <Input label="Duração (min)" type="number" value={newItem.duration} onChange={e => setNewItem({ ...newItem, duration: e.target.value })} />
            <Button className="w-full" type="submit">Salvar</Button>
          </form>
        </Modal>
      )}
    </div>
  );
};

// --- 3. PRODUTOS ---
export const ProductsView = ({ db, user, appId, searchTerm }) => {
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState(null);
  const [newProd, setNewProd] = useState({ name: '', category: '', price: '', stock: '' });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'products'), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [user, db, appId]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (editingProd) {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'products', editingProd.id), newProd, { merge: true });
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'products'), newProd);
    }
    setIsModalOpen(false);
    setEditingProd(null);
    setNewProd({ name: '', category: '', price: '', stock: '' });
  };

  const openEdit = (prod) => {
    setEditingProd(prod);
    setNewProd(prod);
    setIsModalOpen(true);
  };

  const openNew = () => {
    setEditingProd(null);
    setNewProd({ name: '', category: '', price: '', stock: '' });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4 flex flex-col">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Produtos & Estoque</h2>
        <Button onClick={openNew} icon={Plus}>Novo Produto</Button>
      </div>
      <Card className="flex flex-col p-0">
        <DataTable
          columns={[
            { header: 'Produto', accessor: 'name', render: r => <span className="font-bold">{r.name}</span> },
            { header: 'Categoria', accessor: 'category', render: r => <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 uppercase">{r.category || 'Geral'}</span> },
            { header: 'Preço', accessor: 'price', render: r => `R$ ${parseFloat(r.price).toFixed(2)}` },
            { header: 'Estoque', accessor: 'stock', render: r => <span className={`font-bold ${r.stock < 5 ? 'text-red-500' : 'text-gray-700'}`}>{r.stock || 0} un</span> },
          ]}
          data={products.filter(p => p.name?.toLowerCase().includes(searchTerm?.toLowerCase() || '') || p.category?.toLowerCase().includes(searchTerm?.toLowerCase() || ''))}
          onDelete={async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'products', id))}
          onRowClick={openEdit}
        />
      </Card>
      {isModalOpen && (
        <Modal title={editingProd ? "Editar Produto" : "Adicionar Produto"} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <Input label="Nome do Produto" value={newProd.name} onChange={e => setNewProd({ ...newProd, name: e.target.value })} required />
            <Input label="Categoria" value={newProd.category} onChange={e => setNewProd({ ...newProd, category: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Preço (R$)" type="number" value={newProd.price} onChange={e => setNewProd({ ...newProd, price: e.target.value })} required />
              <Input label="Estoque Atual" type="number" value={newProd.stock} onChange={e => setNewProd({ ...newProd, stock: e.target.value })} required />
            </div>
            <Button className="w-full" type="submit">Salvar Produto</Button>
          </form>
        </Modal>
      )}
    </div>
  );
};

// --- 4. PROFISSIONAIS ---
export const ProfessionalsView = ({ db, user, appId, searchTerm }) => {
  const [profs, setProfs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProf, setNewProf] = useState({ name: '', role: '', commission: '' });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'professionals'), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => setProfs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [user, db, appId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'professionals'), newProf);
    setIsModalOpen(false);
    setNewProf({ name: '', role: '', commission: '' });
  };

  return (
    <div className="space-y-4 flex flex-col">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Profissionais</h2>
        <Button onClick={() => setIsModalOpen(true)} icon={UserPlus}>Adicionar Profissional</Button>
      </div>
      <Card className="flex flex-col p-0">
        <DataTable
          columns={[
            { header: 'Nome', accessor: 'name', render: r => <span className="font-bold">{r.name}</span> },
            { header: 'Função', accessor: 'role', render: r => <span className="text-gray-500">{r.role}</span> },
            { header: 'Comissão (%)', accessor: 'commission', render: r => <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-bold">{r.commission}%</span> },
          ]}
          data={profs.filter(p => p.name?.toLowerCase().includes(searchTerm?.toLowerCase() || '') || p.role?.toLowerCase().includes(searchTerm?.toLowerCase() || ''))}
          onDelete={async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'professionals', id))}
        />
      </Card>
      {isModalOpen && (
        <Modal title="Novo Profissional" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <Input label="Nome" value={newProf.name} onChange={e => setNewProf({ ...newProf, name: e.target.value })} required />
            <Input label="Função" value={newProf.role} onChange={e => setNewProf({ ...newProf, role: e.target.value })} />
            <Input label="Comissão (%)" type="number" value={newProf.commission} onChange={e => setNewProf({ ...newProf, commission: e.target.value })} />
            <Button className="w-full" type="submit">Salvar Equipe</Button>
          </form>
        </Modal>
      )}
    </div>
  );
};

// --- 5. RELATÓRIOS ---
// eslint-disable-next-line no-unused-vars
export const ReportsView = ({ db, user, appId, transactions = [] }) => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [products, setProducts] = useState([]);
  const [professionals, setProfessionals] = useState([]);

  useEffect(() => {
    if (!user) return;

    const qAppt = query(collection(db, 'artifacts', appId, 'users', user.uid, 'appointments'));
    const unsubAppt = onSnapshot(qAppt, (snap) => setAppointments(snap.docs.map(d => d.data())));

    const qProd = query(collection(db, 'artifacts', appId, 'users', user.uid, 'products'));
    const unsubProd = onSnapshot(qProd, (snap) => setProducts(snap.docs.map(d => d.data())));

    const qProf = query(collection(db, 'artifacts', appId, 'users', user.uid, 'professionals'));
    const unsubProf = onSnapshot(qProf, (snap) => setProfessionals(snap.docs.map(d => d.data())));

    return () => {
      unsubAppt();
      unsubProd();
      unsubProf();
    };
  }, [user, db, appId]);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
  const maxVal = Math.max(totalIncome, totalExpense, 1);

  const clientCounts = appointments.reduce((acc, curr) => {
    acc[curr.client] = (acc[curr.client] || 0) + 1;
    return acc;
  }, {});
  const sortedClients = Object.entries(clientCounts).sort(([, a], [, b]) => b - a).slice(0, 5);

  const lowStockProducts = products.filter(p => parseInt(p.stock) < 5).sort((a, b) => parseInt(a.stock) - parseInt(b.stock));

  const reports = [
    { id: 'daily', title: 'Fluxo de Caixa', icon: BarChart3, color: 'bg-blue-100 text-blue-600' },
    { id: 'clients', title: 'Melhores Clientes', icon: Users, color: 'bg-green-100 text-green-600' },
    { id: 'products', title: 'Alerta de Estoque', icon: Package, color: 'bg-orange-100 text-orange-600' },
    { id: 'commissions', title: 'Comissões', icon: DollarSign, color: 'bg-yellow-100 text-yellow-600' },
  ];

  const getPDFComponent = () => {
    switch (selectedReport?.id) {
      case 'daily':
        return <RelatorioFluxoCaixa income={totalIncome} expense={totalExpense} />;
      case 'clients':
        return <RelatorioMelhoresClientes clientes={sortedClients} />;
      case 'products':
        return <RelatorioEstoque produtos={lowStockProducts} />;
      case 'commissions':
        return <RelatorioComissoes profissionais={professionals} />;
      default:
        return null;
    }
  };

  const getPDFFileName = () => {
    const fileNames = {
      'daily': 'fluxo_caixa.pdf',
      'clients': 'melhores_clientes.pdf',
      'products': 'alerta_estoque.pdf',
      'commissions': 'comissoes.pdf'
    };
    return fileNames[selectedReport?.id] || 'relatorio.pdf';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Relatórios</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((report) => (
          <button
            key={report.id}
            onClick={() => setSelectedReport(report)}
            className="bg-white p-4 rounded-xl border border-gray-200 hover:border-azuri-300 hover:shadow-md transition-all flex items-center gap-4 text-left w-full"
          >
            <div className={`p-3 rounded-full ${report.color}`}><report.icon size={24} /></div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800">{report.title}</h3>
              <p className="text-xs text-gray-400">Clique para visualizar</p>
            </div>
            <ChevronRight className="ml-auto text-gray-300" size={20} />
          </button>
        ))}
      </div>

      {selectedReport && (
        <Modal title={selectedReport.title} onClose={() => setSelectedReport(null)}>
          <div className="flex flex-col items-center justify-center py-4 space-y-6 print-content w-full">
            <h2 className="text-xl font-bold text-center mb-6 hidden print:block">{selectedReport.title}</h2>

            {selectedReport.id === 'daily' && (
              <div className="w-full space-y-4">
                <div className="flex items-center justify-between text-sm font-bold text-gray-600">
                  <span>Receitas</span>
                  <span className="text-green-600">R$ {totalIncome.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div className="bg-green-500 h-full rounded-full" style={{ width: `${(totalIncome / maxVal) * 100}%` }}></div>
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-gray-600">
                  <span>Despesas</span>
                  <span className="text-red-600">R$ {totalExpense.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div className="bg-red-500 h-full rounded-full" style={{ width: `${(totalExpense / maxVal) * 100}%` }}></div>
                </div>
                <div className="pt-4 border-t border-gray-100 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800">Saldo Total</span>
                    <span className={`font-bold text-lg ${(totalIncome - totalExpense) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {(totalIncome - totalExpense).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {selectedReport.id === 'clients' && (
              <div className="w-full space-y-2">
                {sortedClients.length > 0 ? sortedClients.map(([client, count], index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="font-bold text-gray-700">#{index + 1} {client}</span>
                    <span className="bg-azuri-100 text-azuri-700 px-2 py-1 rounded-full text-xs font-bold">{count} agendamentos</span>
                  </div>
                )) : (
                  <p className="text-center text-gray-500">Nenhum dado de cliente encontrado.</p>
                )}
              </div>
            )}

            {selectedReport.id === 'products' && (
              <div className="w-full space-y-2">
                {lowStockProducts.length > 0 ? lowStockProducts.map((prod, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                    <span className="font-bold text-red-700">{prod.name}</span>
                    <span className="bg-white text-red-600 px-2 py-1 rounded-full text-xs font-bold border border-red-200">{prod.stock} un</span>
                  </div>
                )) : (
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100 text-green-700">
                    <Package size={32} className="mx-auto mb-2" />
                    <p className="font-bold">Estoque Saudável</p>
                    <p className="text-xs">Nenhum produto com estoque baixo.</p>
                  </div>
                )}
              </div>
            )}

            {selectedReport.id === 'commissions' && (
              <div className="w-full space-y-2">
                {professionals.length > 0 ? professionals.map((prof, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                    <span className="font-bold text-yellow-800">{prof.name}</span>
                    <span className="bg-white text-yellow-700 px-2 py-1 rounded-full text-xs font-bold border border-yellow-200">{prof.commission || 0}%</span>
                  </div>
                )) : (
                  <p className="text-center text-gray-500">Nenhum profissional cadastrado.</p>
                )}
                <p className="text-xs text-gray-400 text-center mt-2">Comissões baseadas na configuração de cada profissional.</p>
              </div>
            )}

            <div className="flex gap-2 w-full no-print">
              <PDFDownloadLink
                document={getPDFComponent()}
                fileName={getPDFFileName()}
                className="flex-1"
                style={{ textDecoration: 'none' }}
              >
                {({ loading }) => (
                  <Button variant="secondary" icon={Printer} className="w-full pointer-events-none" disabled={loading}>
                    {loading ? 'Gerando...' : 'Baixar PDF'}
                  </Button>
                )}
              </PDFDownloadLink>
              <Button onClick={() => setSelectedReport(null)} variant="primary" className="flex-1">
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// --- 6. AGENDA COMPLETA ---
export const AgendaView = ({ db, user, appId, searchTerm }) => {
  const [viewMode, setViewMode] = useState('today');
  const [appointments, setAppointments] = useState([]);
  const [history, setHistory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAppt, setNewAppt] = useState({ client: '', service: '', time: '', notes: '' });
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user || !user.uid) return;

    if (viewMode === 'today') {
      const q = query(
        collection(db, 'artifacts', appId, 'users', user.uid, 'appointments'),
        where('date', '==', today)
      );
      const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAppointments(data);
      });
      return () => unsub();
    } else {
      const q = query(
        collection(db, 'artifacts', appId, 'users', user.uid, 'appointments'),
        orderBy('date', 'desc'),
        orderBy('time', 'asc')
      );
      const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setHistory(data);
      });
      return () => unsub();
    }
  }, [user, db, appId, today, viewMode]);

  const handleOpenModal = (time) => {
    setNewAppt({ client: '', service: '', time: time, notes: '' });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user || !user.uid) return;

    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'appointments'), {
        ...newAppt,
        date: today,
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error("AgendaView: Erro ao salvar:", error);
      alert("Erro ao salvar agendamento.");
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'appointments', id));
      } catch (error) {
        console.error("AgendaView: Erro ao deletar:", error);
      }
    }
  };

  return (
    <div className="space-y-4 flex flex-col">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Agenda</h2>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setViewMode('today')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${viewMode === 'today' ? 'bg-white text-azuri-600 shadow-sm' : 'text-gray-500'}`}>Hoje</button>
            <button onClick={() => setViewMode('history')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${viewMode === 'history' ? 'bg-white text-azuri-600 shadow-sm' : 'text-gray-500'}`}>Histórico</button>
          </div>
        </div>
      </div>

      {viewMode === 'today' ? (
        <>
          <div className="text-right text-azuri-600 font-bold text-sm mb-2">{new Date().toLocaleDateString('pt-BR')}</div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {hours.map(hour => {
              const timeSlot = `${hour}:00`;
              const appt = appointments.find(a => a.time === timeSlot);

              return (
                <div key={hour} className="flex border-b border-gray-100 last:border-0 min-h-[60px] group hover:bg-gray-50 transition-colors">
                  <div className="w-16 border-r border-gray-100 p-3 text-sm font-semibold text-gray-500 flex items-start justify-center">{timeSlot}</div>
                  <div className="flex-1 p-2 relative">
                    {appt ? (
                      <div className="bg-azuri-100 border-l-4 border-azuri-500 rounded p-2 text-xs cursor-pointer hover:opacity-90 flex justify-between items-start">
                        <div>
                          <div className="font-bold text-azuri-900">{appt.client}</div>
                          <div className="text-azuri-700">{appt.service}</div>
                        </div>
                        <button onClick={() => handleDelete(appt.id)} className="text-azuri-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenModal(timeSlot)}
                        className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center w-full h-full"
                      >
                        <span className="bg-azuri-600 text-white text-xs px-3 py-1.5 rounded-full shadow-sm hover:bg-azuri-700 transition-colors flex items-center gap-1">
                          <Plus size={12} /> Agendar
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <Card className="flex flex-col p-0">
          <DataTable
            columns={[
              { header: 'Data', accessor: 'date', render: r => <span className="text-gray-600 font-medium">{new Date(r.date).toLocaleDateString('pt-BR')}</span> },
              { header: 'Horário', accessor: 'time', render: r => <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600">{r.time}</span> },
              { header: 'Cliente', accessor: 'client', render: r => <span className="font-bold text-gray-800">{r.client}</span> },
              { header: 'Serviço', accessor: 'service', render: r => <span className="text-azuri-600">{r.service}</span> },
              { header: 'Obs', accessor: 'notes', render: r => <span className="text-gray-400 text-xs italic truncate max-w-[150px] block">{r.notes || '-'}</span> },
            ]}
            data={history.filter(h =>
              h.client?.toLowerCase().includes(searchTerm?.toLowerCase() || '') ||
              h.service?.toLowerCase().includes(searchTerm?.toLowerCase() || '')
            )}
            onDelete={handleDelete}
          />
        </Card>
      )}

      {isModalOpen && (
        <Modal title={`Novo Agendamento - ${newAppt.time}`} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <Input label="Nome do Cliente" value={newAppt.client} onChange={e => setNewAppt({ ...newAppt, client: e.target.value })} required />
            <Input label="Serviço" value={newAppt.service} onChange={e => setNewAppt({ ...newAppt, service: e.target.value })} required />
            <Input label="Observações" value={newAppt.notes} onChange={e => setNewAppt({ ...newAppt, notes: e.target.value })} />
            <Button className="w-full" type="submit">Confirmar Agendamento</Button>
          </form>
        </Modal>
      )}
    </div>
  );
};

// --- 7. CONFIGURAÇÕES ---
export const SettingsView = ({ user, onSaveSettings }) => {
  const [formData, setFormData] = useState({
    businessName: user?.businessName || '',
    userName: user?.userName || '',
    email: user?.email || '',
    cardRateCredit: user?.cardRateCredit || 0,
    cardRateDebit: user?.cardRateDebit || 0,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Configurações</h2>
      <Card>
        <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Dados da Empresa</h3>
        <Input label="Nome da Empresa" value={formData.businessName} onChange={e => setFormData({ ...formData, businessName: e.target.value })} />
        <Input label="Seu Nome" value={formData.userName} onChange={e => setFormData({ ...formData, userName: e.target.value })} />
      </Card>
      <Button onClick={() => onSaveSettings(formData)} className="w-full py-3">Salvar Alterações</Button>
    </div>
  );
};

// --- 8. AJUDA ---
export const HelpView = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Central de Ajuda</h2>
      <Card>
        <h3 className="font-bold text-lg mb-4 text-azuri-800">Guia do Sistema</h3>
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2">📊 Resumo</h4>
            <p className="text-sm text-gray-600">Visão geral com gráficos de receitas, despesas e atalhos para as principais funções.</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2">📅 Agenda</h4>
            <p className="text-sm text-gray-600">Gerencie seus agendamentos. Visualize o dia atual ou o histórico completo.</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2">💰 Financeiro</h4>
            <p className="text-sm text-gray-600">Controle de caixa. Registre entradas e saídas e visualize o histórico de transações.</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2">👥 Clientes</h4>
            <p className="text-sm text-gray-600">Cadastro completo de clientes com histórico e informações de contato.</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2">📦 Produtos & Estoque</h4>
            <p className="text-sm text-gray-600">Gerencie seu inventário, controle quantidades e valores de produtos.</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2">📈 Relatórios</h4>
            <p className="text-sm text-gray-600">Análises detalhadas sobre faturamento, clientes mais ativos e comissões.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};