import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { Card, Button, Input, DataTable, Modal } from '../../components/UI.jsx';

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
