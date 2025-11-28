import React, { useState, useEffect, useRef } from 'react';
import {
    Plus, Minus, UserPlus, Calendar, Clock, ChevronRight, ChevronLeft,
    Trash2, Info, Ban, Repeat, Briefcase, XCircle, AlertTriangle,
    CheckCircle, DollarSign, ShoppingBag, Edit2, ShoppingCart, MessageCircle, FileText
} from 'lucide-react';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, where, getDoc, updateDoc, getDocs } from 'firebase/firestore';
import { Card, Button, Input, Modal } from '../../components/UI';

// --- CUSTOM ICONS ---
const WhatsAppIcon = ({ size = 18, className = "" }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
);

export const AgendaView = ({ db, user, appId }) => {
    const [viewMode, setViewMode] = useState('day');
    const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);

    // 👇 1. ESTADO PARA A HORA ATUAL
    const [now, setNow] = useState(new Date());

    const [appointments, setAppointments] = useState([]);
    const [services, setServices] = useState([]);
    const [products, setProducts] = useState([]);
    const [clientsList, setClientsList] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Estados de Modais
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [apptToCancel, setApptToCancel] = useState(null);
    const [cancelReason, setCancelReason] = useState('');

    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [apptToCheckout, setApptToCheckout] = useState(null);
    const [checkoutItems, setCheckoutItems] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [finalServicePrice, setFinalServicePrice] = useState(0);

    // Novo Agendamento
    const [newAppt, setNewAppt] = useState({
        client: '', clientId: '', clientPhone: '',
        service: '', serviceId: '', price: '',
        time: '', notes: '', duration: '30',
        isRecurring: false, recurrenceType: 'weekly', recurrenceCount: 4
    });

    const [workSettings, setWorkSettings] = useState({
        workStart: '09:00', workEnd: '19:00',
        workDays: { 0: false, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true }
    });

    // 👇 2. ATUALIZAR O RELÓGIO A CADA MINUTO
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000); // Atualiza a cada 60s
        return () => clearInterval(timer);
    }, []);

    // 1. Carregar Dados
    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            const docSnap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'));
            if (docSnap.exists()) setWorkSettings(docSnap.data());

            const qProd = query(collection(db, 'artifacts', appId, 'users', user.uid, 'products'));
            const snapProd = await getDocs(qProd);
            const allProducts = snapProd.docs.map(d => ({ id: d.id, ...d.data() }));
            setProducts(allProducts.filter(p => parseInt(p.stock) > 0));

            const qServ = query(collection(db, 'artifacts', appId, 'users', user.uid, 'services'), where('name', '!=', ''));
            const snapServ = await getDocs(qServ);
            setServices(snapServ.docs.map(d => ({ id: d.id, ...d.data() })));

            const qCli = query(collection(db, 'artifacts', appId, 'users', user.uid, 'clients'));
            const snapCli = await getDocs(qCli);
            setClientsList(snapCli.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        fetchData();
    }, [user, db, appId]);

    // 2. Carregar Agendamentos
    useEffect(() => {
        if (!user || !user.uid) return;
        const q = query(
            collection(db, 'artifacts', appId, 'users', user.uid, 'appointments'),
            where('date', '==', currentDate)
        );
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(a => a.status !== 'cancelled');
            data.sort((a, b) => a.time.localeCompare(b.time));
            setAppointments(data);
        });
        return () => unsub();
    }, [user, db, appId, currentDate]);

    // --- LÓGICA DE CLIENTE ---
    const handleClientNameChange = (e) => {
        const val = e.target.value;
        const found = clientsList.find(c => c.name && c.name.toLowerCase() === val.toLowerCase());

        setNewAppt({
            ...newAppt,
            client: val,
            clientId: found ? found.id : '',
            clientPhone: found ? found.phone : ''
        });
    };

    // --- FUNÇÃO DO WHATSAPP (TURBINADA) ---
    const sendWhatsApp = async (appt) => {
        let phone = appt.clientPhone;

        // Se não tiver telefone, pede na hora
        if (!phone) {
            const manualPhone = prompt("Este agendamento está sem telefone. Digite o número (com DDD):");
            if (!manualPhone) return; // Cancelou
            phone = manualPhone;

            // Opcional: Salvar esse telefone no agendamento para a próxima vez
            try {
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'appointments', appt.id), {
                    clientPhone: manualPhone
                });
            } catch (error) { console.error("Erro ao salvar telefone manual", error); }
        }

        // 1. Limpa o telefone
        const cleanPhone = phone.replace(/\D/g, '');

        // 2. Define a saudação
        const hour = new Date().getHours();
        let greeting = 'Olá';
        if (hour < 12) greeting = 'Bom dia';
        else if (hour < 18) greeting = 'Boa tarde';
        else greeting = 'Boa noite';

        // 3. Formata a data
        const dateParts = appt.date.split('-');
        const dateFormatted = `${dateParts[2]}/${dateParts[1]}`;

        // 4. Cria a mensagem
        const msg = `${greeting} ${appt.client}! 👋\n\nPassando para lembrar do seu horário de *${appt.service}*.\n\n📅 Data: ${dateFormatted} (Amanhã/Hoje)\n⏰ Horário: ${appt.time}\n\nPosso deixar confirmado?`;

        // 5. Abre o WhatsApp
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const baseUrl = isMobile ? "whatsapp://send" : "https://web.whatsapp.com/send";

        window.open(`${baseUrl}?phone=55${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
    };

    // --- LÓGICA DE CHECKOUT ---
    const openCheckout = (appt) => {
        setApptToCheckout(appt);
        setCheckoutItems([]);
        setSelectedProduct('');
        setFinalServicePrice(parseFloat(appt.servicePrice || 0));
        setIsCheckoutModalOpen(true);
    };

    const addProductToCheckout = () => {
        if (!selectedProduct) return;
        const prod = products.find(p => p.id === selectedProduct);
        if (prod) {
            const existingIndex = checkoutItems.findIndex(item => item.id === prod.id);
            if (existingIndex >= 0) {
                updateQuantity(existingIndex, 1);
            } else {
                setCheckoutItems([...checkoutItems, { ...prod, quantity: 1 }]);
            }
            setSelectedProduct('');
        }
    };

    const updateQuantity = (index, delta) => {
        const newItems = [...checkoutItems];
        const item = newItems[index];
        const newQty = item.quantity + delta;
        if (newQty <= 0) newItems.splice(index, 1);
        else {
            if (newQty > parseInt(item.stock)) { alert(`Apenas ${item.stock} un em estoque!`); return; }
            item.quantity = newQty;
        }
        setCheckoutItems(newItems);
    };

    const confirmCheckout = async () => {
        if (!apptToCheckout) return;
        setSaving(true);
        const productsTotal = checkoutItems.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
        const total = parseFloat(finalServicePrice) + productsTotal;

        try {
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'appointments', apptToCheckout.id), {
                status: 'completed', totalPaid: total, productsSold: checkoutItems, completedAt: new Date().toISOString()
            });
            await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), {
                description: `Atendimento: ${apptToCheckout.client} (${apptToCheckout.service})`,
                amount: total, type: 'income', date: currentDate, category: 'Serviços', createdAt: new Date().toISOString()
            });
            for (const item of checkoutItems) {
                const itemRef = doc(db, 'artifacts', appId, 'users', user.uid, 'products', item.id);
                const currentProd = await getDoc(itemRef);
                if (currentProd.exists()) {
                    const currentStock = parseInt(currentProd.data().stock || 0);
                    await updateDoc(itemRef, { stock: Math.max(0, currentStock - item.quantity) });
                }
            }
            setIsCheckoutModalOpen(false); setApptToCheckout(null);
            alert(`Venda finalizada! R$ ${total.toFixed(2)}`);
        } catch (error) { alert("Erro ao finalizar."); } finally { setSaving(false); }
    };

    // --- UI AUXILIAR ---
    const handleServiceChange = (e) => {
        const selectedId = e.target.value;
        const serv = services.find(s => s.id === selectedId);
        if (serv) setNewAppt({ ...newAppt, service: serv.name, serviceId: serv.id, price: serv.price, duration: serv.duration || '30' });
        else setNewAppt({ ...newAppt, service: '', serviceId: '', price: '' });
    };
    const isDayClosed = () => {
        const dayOfWeek = new Date(currentDate + 'T00:00:00').getDay();
        return workSettings.workDays && workSettings.workDays[dayOfWeek] === false;
    };
    const generateHours = () => {
        const start = parseInt(workSettings.workStart.split(':')[0]);
        const end = parseInt(workSettings.workEnd.split(':')[0]);
        const hours = [];
        for (let i = start; i <= end; i++) hours.push(i < 10 ? `0${i}` : `${i}`);
        return hours;
    };
    const handleOpenModal = (hourPrefix) => {
        setNewAppt({ client: '', clientId: '', clientPhone: '', service: '', serviceId: '', price: '', time: `${hourPrefix}:00`, notes: '', duration: '30', isRecurring: false, recurrenceType: 'weekly', recurrenceCount: 4 });
        setIsModalOpen(true);
    };
    const handleSave = async (e) => {
        e.preventDefault();
        if (!user || !user.uid) return;
        setSaving(true);
        try {
            const baseDate = new Date(currentDate + 'T00:00:00');
            const promises = [];
            const loops = newAppt.isRecurring ? parseInt(newAppt.recurrenceCount) : 1;
            const daysToAdd = newAppt.recurrenceType === 'weekly' ? 7 : 14;
            for (let i = 0; i < loops; i++) {
                const nextDate = new Date(baseDate);
                nextDate.setDate(baseDate.getDate() + (i * daysToAdd));
                const dateString = nextDate.toISOString().split('T')[0];
                const promise = addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'appointments'), {
                    client: newAppt.client, clientId: newAppt.clientId, clientPhone: newAppt.clientPhone,
                    service: newAppt.service, servicePrice: newAppt.price,
                    time: newAppt.time, duration: newAppt.duration, notes: newAppt.notes,
                    date: dateString, createdAt: new Date().toISOString(), status: 'scheduled', isRecurrence: i > 0
                });
                promises.push(promise);
            }
            await Promise.all(promises);
            setIsModalOpen(false);
        } catch (error) { alert("Erro ao salvar."); } finally { setSaving(false); }
    };
    const initiateCancel = (appt) => { setApptToCancel(appt); setCancelReason(''); setIsCancelModalOpen(true); };
    const confirmCancel = async () => {
        if (!apptToCancel) return;
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'appointments', apptToCancel.id), {
                status: 'cancelled', cancelReason: cancelReason || 'Sem motivo', cancelledAt: new Date().toISOString()
            });
            setIsCancelModalOpen(false);
        } catch (error) { alert("Erro ao cancelar."); }
    };
    const changeDate = (days) => {
        const d = new Date(currentDate + 'T00:00:00');
        d.setDate(d.getDate() + days);
        setCurrentDate(d.toISOString().split('T')[0]);
    };
    const formatDateDisplay = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    return (
        <div className="space-y-6 flex flex-col h-full">
            {/* CABEÇALHO */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <div className="bg-azuri-100 p-2 rounded-lg text-azuri-600"><Calendar size={24} /></div> Agenda
                </h2>
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                    <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white rounded-lg shadow-sm"><ChevronLeft size={20} /></button>
                    <div className="flex flex-col items-center px-2">
                        <span className="text-sm font-bold text-gray-800 capitalize">{formatDateDisplay(currentDate)}</span>
                        <input type="date" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} className="p-1 border rounded text-xs bg-white cursor-pointer mt-1" />
                    </div>
                    <button onClick={() => changeDate(1)} className="p-2 hover:bg-white rounded-lg shadow-sm"><ChevronRight size={20} /></button>
                </div>
            </div>

            {/* AGENDA */}
            {isDayClosed() ? (
                <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 min-h-[400px]">
                    <div className="text-center p-8"><Ban className="mx-auto text-red-300 mb-2" size={48} /><h3 className="text-xl font-bold text-gray-800">Fechado</h3><p className="text-gray-500">Sem expediente.</p></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1">
                    {generateHours().map(hour => {
                        const slotsInThisHour = appointments.filter(a => a.time.startsWith(hour));

                        // 👇 LÓGICA DA LINHA DO TEMPO
                        const isToday = currentDate === new Date().toISOString().split('T')[0];
                        const isCurrentHour = isToday && parseInt(hour) === now.getHours();
                        const linePosition = isCurrentHour ? (now.getMinutes() / 60) * 100 : 0;

                        return (
                            <div key={hour} className="flex border-b border-gray-50 min-h-[100px] group hover:bg-gray-50/50 relative">
                                {/* COLUNA ESQUERDA (HORA + LINHA AZUL) */}
                                <div className="w-24 border-r border-gray-100 p-4 flex flex-col items-center relative">
                                    <span className={`text-xl font-bold transition-colors ${isCurrentHour ? 'text-azuri-600' : 'text-gray-400'}`}>
                                        {hour}:00
                                    </span>
                                    <button onClick={() => handleOpenModal(hour)} className="mt-2 opacity-0 group-hover:opacity-100 bg-azuri-100 text-azuri-600 p-1 rounded hover:bg-azuri-200 transition-all"><Plus size={16} /></button>

                                    {/* 🔵 LINHA AZUL */}
                                    {isCurrentHour && (
                                        <div
                                            className="absolute w-full border-t-2 border-azuri-500 z-10 pointer-events-none"
                                            style={{ top: `${linePosition}%` }}
                                        >
                                            <div className="absolute right-0 -mt-1.5 w-3 h-3 bg-azuri-500 rounded-full translate-x-1.5 shadow-sm"></div>
                                        </div>
                                    )}
                                </div>

                                {/* COLUNA DIREITA (CONTEÚDO) */}
                                <div className="flex-1 p-3 space-y-2 relative">
                                    {slotsInThisHour.map(appt => (
                                        <div key={appt.id} className={`border-l-4 rounded p-3 shadow-sm flex justify-between items-center transition-all ${appt.status === 'completed' ? 'bg-green-50 border-green-500 opacity-75' : 'bg-white border-azuri-500'}`}>
                                            <div>
                                                <span className={`font-bold flex items-center gap-2 ${appt.status === 'completed' ? 'text-green-800 line-through' : 'text-gray-800'}`}>
                                                    {appt.client} {appt.status === 'completed' && <CheckCircle size={14} className="text-green-600" />}
                                                    {appt.isRecurrence && <Repeat size={12} className="text-azuri-500" />}
                                                </span>
                                                <span className="text-xs text-gray-500 block">{appt.time} - {appt.service} ({appt.duration}min)</span>
                                            </div>
                                            <div className="flex gap-2">
                                                {appt.status !== 'completed' && (
                                                    <>
                                                        <button onClick={() => sendWhatsApp(appt)} className={`p-2 rounded-full ${appt.clientPhone ? 'text-green-600 hover:bg-green-50' : 'text-gray-300 hover:text-green-600'}`} title={appt.clientPhone ? "Mandar Zap" : "Adicionar Zap"}>
                                                            <WhatsAppIcon size={18} />
                                                        </button>
                                                        <button onClick={() => openCheckout(appt)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full" title="Fechar Conta"><DollarSign size={18} /></button>
                                                        <button onClick={() => initiateCancel(appt)} className="text-gray-300 hover:text-red-500 p-2 rounded-full" title="Cancelar"><Trash2 size={16} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {slotsInThisHour.length === 0 && <div onClick={() => handleOpenModal(hour)} className="h-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 text-gray-400 text-sm"><Plus size={16} className="mr-1" /> Agendar</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL DE NOVO AGENDAMENTO */}
            {isModalOpen && (
                <Modal title="Novo Agendamento" onClose={() => setIsModalOpen(false)}>
                    <form onSubmit={handleSave} className="space-y-4">

                        {/* CLIENTE */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Cliente</label>
                            <div className="relative">
                                <UserPlus size={18} className="absolute left-3 top-3 text-gray-400" />
                                <input
                                    list="clients-list"
                                    className="w-full pl-10 p-3 border border-gray-300 rounded-lg outline-none focus:border-azuri-500 bg-white"
                                    value={newAppt.client}
                                    onChange={handleClientNameChange}
                                    placeholder="Digite ou selecione..."
                                    required
                                />
                                <datalist id="clients-list">
                                    {clientsList.map(c => (
                                        <option key={c.id} value={c.name} />
                                    ))}
                                </datalist>
                            </div>
                            {newAppt.clientPhone && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle size={10} /> Cliente identificado</p>}
                        </div>

                        {/* TELEFONE */}
                        <Input
                            label="WhatsApp / Telefone"
                            value={newAppt.clientPhone}
                            onChange={e => setNewAppt({ ...newAppt, clientPhone: e.target.value })}
                            placeholder="(00) 00000-0000"
                            rightElement={<MessageCircle size={18} className="text-gray-400" />}
                        />

                        {/* SERVIÇO */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Serviço</label>
                            <div className="flex items-center gap-2">
                                <Briefcase size={18} className="text-gray-400" />
                                <select className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-azuri-500 bg-white" onChange={handleServiceChange} value={newAppt.serviceId}>
                                    <option value="">Selecione um serviço...</option>
                                    {services.map(s => (<option key={s.id} value={s.id}>{s.name} - R$ {parseFloat(s.price).toFixed(2)}</option>))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Horário" type="time" value={newAppt.time} onChange={e => setNewAppt({ ...newAppt, time: e.target.value })} required rightElement={<Clock size={18} className="text-gray-400" />} />
                            <Input label="Duração (min)" type="number" value={newAppt.duration} onChange={e => setNewAppt({ ...newAppt, duration: e.target.value })} rightElement={<Clock size={18} className="text-gray-400" />} />
                        </div>

                        <Input label="Obs" value={newAppt.notes} onChange={e => setNewAppt({ ...newAppt, notes: e.target.value })} rightElement={<FileText size={18} className="text-gray-400" />} />

                        <div className="bg-azuri-50 p-4 rounded-xl border border-azuri-100">
                            <label className="flex items-center gap-3 cursor-pointer mb-3">
                                <input type="checkbox" className="w-5 h-5 text-azuri-600 rounded" checked={newAppt.isRecurring} onChange={(e) => setNewAppt({ ...newAppt, isRecurring: e.target.checked })} />
                                <div className="flex items-center gap-2 font-bold text-azuri-800"><Repeat size={18} /> Repetir Agendamento?</div>
                            </label>
                            {newAppt.isRecurring && (
                                <div className="grid grid-cols-2 gap-3 pl-8 animate-in fade-in">
                                    <div><span className="text-xs font-bold text-gray-500 uppercase">Frequência</span><select value={newAppt.recurrenceType} onChange={e => setNewAppt({ ...newAppt, recurrenceType: e.target.value })} className="w-full p-2 mt-1 text-sm border rounded-lg bg-white"><option value="weekly">Semanal</option><option value="biweekly">Quinzenal</option></select></div>
                                    <div><span className="text-xs font-bold text-gray-500 uppercase">Repetições</span><select value={newAppt.recurrenceCount} onChange={e => setNewAppt({ ...newAppt, recurrenceCount: e.target.value })} className="w-full p-2 mt-1 text-sm border rounded-lg bg-white"><option value="2">2x</option><option value="4">4x</option><option value="8">8x</option></select></div>
                                </div>
                            )}
                        </div>
                        <Button className="w-full py-3" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Confirmar'}</Button>
                    </form>
                </Modal>
            )}

            {/* MODAL CANCELAMENTO */}
            {isCancelModalOpen && (
                <Modal title="Cancelar" onClose={() => setIsCancelModalOpen(false)}>
                    <div className="space-y-4">
                        <div className="bg-red-50 p-4 rounded-lg flex items-start gap-3 border border-red-100"><AlertTriangle className="text-red-500 mt-1" size={20} /><div><h4 className="font-bold text-red-800">Você tem certeza?</h4><p className="text-sm text-red-600">O horário será liberado.</p></div></div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Motivo</label>
                            <select className="w-full p-3 border border-gray-300 rounded-lg outline-none bg-white mb-2" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}>
                                <option value="">Selecione...</option><option value="Desistiu">Cliente desistiu</option><option value="No-Show">Não compareceu</option><option value="Imprevisto">Imprevisto</option><option value="Outro">Outro</option>
                            </select>
                        </div>
                        <div className="flex gap-2 pt-2"><Button variant="ghost" onClick={() => setIsCancelModalOpen(false)} className="flex-1">Voltar</Button><button onClick={confirmCancel} className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition-colors">Confirmar</button></div>
                    </div>
                </Modal>
            )}

            {/* MODAL CHECKOUT */}
            {isCheckoutModalOpen && apptToCheckout && (
                <Modal title="Fechar Conta" onClose={() => setIsCheckoutModalOpen(false)}>
                    <div className="space-y-6">
                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-green-900">{apptToCheckout.service}</h4>
                                <div className="flex items-center gap-1 bg-white px-2 rounded border border-green-200">
                                    <span className="text-green-700 font-bold">R$</span>
                                    <input type="number" className="w-20 p-1 text-right font-bold text-green-700 outline-none" value={finalServicePrice} onChange={(e) => setFinalServicePrice(e.target.value)} />
                                    <Edit2 size={12} className="text-green-400" />
                                </div>
                            </div>
                            <p className="text-sm text-green-700 flex items-center gap-1"><UserPlus size={14} /> {apptToCheckout.client}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Adicionar Produtos</label>
                            <div className="flex gap-2">
                                <select className="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-white" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                                    <option value="">Escolha um produto...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} - R$ {parseFloat(p.price).toFixed(2)} ({p.stock} un)</option>
                                    ))}
                                </select>
                                <button onClick={addProductToCheckout} className="bg-azuri-600 text-white p-2 rounded-lg hover:bg-azuri-700" title="Adicionar"><ShoppingCart size={20} /></button>
                            </div>
                            {checkoutItems.length > 0 && (
                                <div className="mt-3 space-y-2 bg-gray-50 p-3 rounded-lg">
                                    {checkoutItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <span className="flex items-center gap-2 text-gray-700"><ShoppingBag size={14} className="text-gray-400" /> {item.name}</span>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden h-8">
                                                    <button onClick={() => updateQuantity(idx, -1)} className="px-2 h-full hover:bg-gray-100 text-gray-600 border-r border-gray-200"><Minus size={12} /></button>
                                                    <span className="px-2 text-xs font-bold text-gray-700 min-w-[20px] text-center">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(idx, 1)} className="px-2 h-full hover:bg-gray-100 text-gray-600 border-l border-gray-200"><Plus size={12} /></button>
                                                </div>
                                                <span className="font-bold text-gray-700 min-w-[60px] text-right">R$ {(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                            <span className="text-gray-500 font-medium">Total a Receber</span>
                            <span className="text-3xl font-bold text-azuri-700">
                                R$ {(parseFloat(finalServicePrice || 0) + checkoutItems.reduce((acc, i) => acc + (parseFloat(i.price) * i.quantity), 0)).toFixed(2)}
                            </span>
                        </div>
                        <Button className="w-full py-4 text-lg bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200" onClick={confirmCheckout} disabled={saving}>
                            {saving ? 'Finalizando...' : 'Confirmar Pagamento ($)'}
                        </Button>
                    </div>
                </Modal>
            )}
        </div>
    );
};