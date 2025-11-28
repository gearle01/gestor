import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Package, DollarSign, ChevronRight, Printer } from 'lucide-react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Card, Button, Modal } from '../../components/UI.jsx';
import RelatorioFluxoCaixa from '../../components/RelatorioFluxoCaixa';
import RelatorioMelhoresClientes from '../../components/RelatorioMelhoresClientes';
import RelatorioEstoque from '../../components/RelatorioEstoque';
import RelatorioComissoes from '../../components/RelatorioComissoes';

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
