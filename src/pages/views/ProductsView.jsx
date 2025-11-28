import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, orderBy, setDoc } from 'firebase/firestore';
import { Card, Button, Input, DataTable, Modal } from '../../components/UI.jsx';

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
