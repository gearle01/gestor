import React, { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { Card, Button, Input, DataTable, Modal } from '../../components/UI.jsx';

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
