import React, { useState, useEffect } from 'react';
import { UserPlus, Smartphone, Camera, FileText, Image as ImageIcon, XCircle, Info } from 'lucide-react';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, orderBy, setDoc, getDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from '../../firebase';
import { Card, Button, Input, DataTable, Modal } from '../../components/UI.jsx';

export const ClientsView = ({ db, user, appId, searchTerm }) => {
    const [clients, setClients] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [activeTab, setActiveTab] = useState('data');
    const [formData, setFormData] = useState({ name: '', phone: '', address: '', isBlocked: false });
    const [anamnesis, setAnamnesis] = useState('');
    const [photos, setPhotos] = useState([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'clients'), orderBy('name'));
        const unsub = onSnapshot(q, (snap) => setClients(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => unsub();
    }, [user, db, appId]);

    const openClient = async (client) => {
        setEditingClient(client);
        setFormData({ ...client, isBlocked: client.isBlocked || false });
        setActiveTab('data');
        setAnamnesis('');
        setPhotos([]);

        const anamnesisSnap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'clients', client.id, 'records', 'anamnesis'));
        if (anamnesisSnap.exists()) setAnamnesis(anamnesisSnap.data().text || '');

        const photosQ = query(collection(db, 'artifacts', appId, 'users', user.uid, 'clients', client.id, 'photos'), orderBy('createdAt', 'desc'));
        const photosSnap = await getDocs(photosQ);
        setPhotos(photosSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        setIsModalOpen(true);
    };

    const handleSaveData = async (e) => {
        e.preventDefault();
        try {
            if (editingClient) {
                await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'clients', editingClient.id), formData, { merge: true });
                await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'clients', editingClient.id, 'records', 'anamnesis'), { text: anamnesis }, { merge: true });
                alert('Dados atualizados!');
            } else {
                const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'clients'), formData);
                if (anamnesis) {
                    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'clients', docRef.id, 'records', 'anamnesis'), { text: anamnesis });
                }
                setIsModalOpen(false);
                alert('Cliente cadastrado com sucesso! Agora você pode adicionar fotos.');
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar.');
        }
    };

    const handleUploadPhoto = async (e) => {
        if (!e.target.files[0] || !editingClient) return;
        setUploading(true);
        const file = e.target.files[0];
        const storageRef = ref(storage, `users/${user.uid}/clients/${editingClient.id}/${Date.now()}_${file.name}`);

        try {
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);

            const newPhoto = { url, name: file.name, createdAt: new Date().toISOString() };
            const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'clients', editingClient.id, 'photos'), newPhoto);

            setPhotos([{ id: docRef.id, ...newPhoto }, ...photos]);
        } catch (error) {
            console.error("Erro upload:", error);
            alert("Erro ao enviar foto.");
        } finally {
            setUploading(false);
        }
    };

    const handleDeletePhoto = async (photo) => {
        if (!confirm("Excluir esta foto?")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'clients', editingClient.id, 'photos', photo.id));
            setPhotos(photos.filter(p => p.id !== photo.id));
        } catch (err) {
            console.error(err);
        }
    };

    const handleNew = () => {
        setEditingClient(null);
        setFormData({ name: '', phone: '', address: '', isBlocked: false });
        setAnamnesis('');
        setPhotos([]);
        setActiveTab('data');
        setIsModalOpen(true);
    };

    const [importing, setImporting] = useState(false);
    const handleImportContacts = async () => {
        const isSupported = ('contacts' in navigator && 'ContactsManager' in window);
        if (!isSupported) {
            alert("A importação de contatos é suportada apenas em dispositivos móveis (Android/iOS) usando Chrome ou Safari.");
            return;
        }
        try {
            setImporting(true);
            const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true });
            if (contacts.length > 0) {
                const batchPromises = contacts.map(async (contact) => {
                    const name = contact.name[0];
                    const phone = contact.tel ? contact.tel[0] : '';
                    if (name) {
                        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'clients'), { name, phone, address: '' });
                    }
                });
                await Promise.all(batchPromises);
                alert(`${contacts.length} contatos importados!`);
            }
        } catch (err) {
            // ✅ SEGURANÇA: Não expor erros em produção
            if (process.env.NODE_ENV === 'development') {
                console.error('Erro ao importar contatos:', err);
            }
            alert('Erro ao importar contatos. Tente novamente.');
        } finally { setImporting(false); }
    };

    return (
        <div className="space-y-4 flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-800">Meus Clientes</h2>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button onClick={handleImportContacts} variant="secondary" icon={Smartphone} disabled={importing} className="flex-1 md:flex-none">
                        {importing ? 'Importando...' : 'Importar Contatos'}
                    </Button>
                    <Button onClick={handleNew} icon={UserPlus} className="flex-1 md:flex-none">Novo Cliente</Button>
                </div>
            </div>

            <Card className="flex flex-col p-0">
                <DataTable
                    columns={[
                        { header: 'Nome', accessor: 'name', render: r => <span className={`font-bold ${r.isBlocked ? 'text-red-500 line-through' : 'text-azuri-900'}`}>{r.name}</span> },
                        { header: 'Telefone', accessor: 'phone' },
                        { header: 'Endereço', accessor: 'address' },
                        { header: 'Status', accessor: 'isBlocked', render: r => r.isBlocked ? <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">BLOQUEADO</span> : <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">ATIVO</span> },
                    ]}
                    data={clients.filter(c => c.name?.toLowerCase().includes(searchTerm?.toLowerCase() || '') || c.phone?.includes(searchTerm || ''))}
                    onDelete={async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'clients', id))}
                    onRowClick={openClient}
                />
            </Card>

            {isModalOpen && (
                <Modal title={editingClient ? `Cliente: ${editingClient.name}` : "Novo Cliente"} onClose={() => setIsModalOpen(false)}>

                    <div className="flex border-b border-gray-200 mb-4">
                        <button onClick={() => setActiveTab('data')} className={`flex-1 pb-2 text-sm font-bold ${activeTab === 'data' ? 'text-azuri-600 border-b-2 border-azuri-600' : 'text-gray-400'}`}>Dados</button>
                        <button onClick={() => setActiveTab('anamnesis')} className={`flex-1 pb-2 text-sm font-bold ${activeTab === 'anamnesis' ? 'text-azuri-600 border-b-2 border-azuri-600' : 'text-gray-400'}`}>Anamnese</button>
                        <button onClick={() => setActiveTab('gallery')} disabled={!editingClient} className={`flex-1 pb-2 text-sm font-bold ${activeTab === 'gallery' ? 'text-azuri-600 border-b-2 border-azuri-600' : 'text-gray-300'} disabled:cursor-not-allowed`}>Galeria</button>
                    </div>

                    {!editingClient && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 flex items-start gap-2">
                            <Info size={18} className="text-blue-500 mt-0.5" />
                            <p className="text-xs text-blue-700">
                                <strong>Dica:</strong> Salve os dados básicos do cliente primeiro para liberar a <strong>Galeria de Fotos</strong>.
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSaveData} className="space-y-4">
                        {activeTab === 'data' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                                <Input label="Nome Completo" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                <Input label="Telefone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                <Input label="Endereço" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />

                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg mt-4">
                                    <input
                                        type="checkbox"
                                        id="blockUser"
                                        className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                                        checked={formData.isBlocked}
                                        onChange={e => setFormData({ ...formData, isBlocked: e.target.checked })}
                                    />
                                    <label htmlFor="blockUser" className="text-sm font-bold text-red-700 cursor-pointer select-none">
                                        Bloquear Cliente (Lista Negra)
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500 ml-1">Clientes bloqueados não conseguem ver horários disponíveis no agendamento online.</p>

                                <Button className="w-full mt-4" type="submit">Salvar Dados</Button>
                            </div>
                        )}

                        {activeTab === 'anamnesis' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs text-yellow-800 mb-2">
                                    <FileText size={16} className="inline mr-1" /> Use este espaço para registrar alergias, histórico médico ou preferências.
                                </div>
                                <textarea
                                    className="w-full p-3 border border-gray-300 rounded-lg h-40 focus:ring-2 focus:ring-azuri-500 outline-none resize-none"
                                    placeholder="Ex: Cliente alérgica a formol. Prefere água morna..."
                                    value={anamnesis}
                                    onChange={e => setAnamnesis(e.target.value)}
                                ></textarea>
                                <Button className="w-full" type="submit">Salvar Anamnese</Button>
                            </div>
                        )}

                        {activeTab === 'gallery' && (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="flex items-center gap-2 mb-4">
                                    <label className="flex-1 cursor-pointer bg-azuri-50 border-2 border-dashed border-azuri-200 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-azuri-100 transition-colors">
                                        <Camera className="text-azuri-500 mb-1" />
                                        <span className="text-sm font-bold text-azuri-700">{uploading ? 'Enviando...' : 'Adicionar Foto'}</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} disabled={uploading} />
                                    </label>
                                </div>
                                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                                    {photos.map(photo => (
                                        <div key={photo.id} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                            <img src={photo.url} alt="Cliente" className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => handleDeletePhoto(photo)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <XCircle size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {photos.length === 0 && (
                                        <div className="col-span-3 text-center py-8 text-gray-400 text-sm">
                                            <ImageIcon className="mx-auto mb-2 opacity-50" />
                                            Nenhuma foto registrada.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </form>
                </Modal>
            )}
        </div>
    );
};
