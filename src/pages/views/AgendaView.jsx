import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Ban, Plus, Briefcase, Info, Trash2, UserPlus, Clock, FileText } from 'lucide-react';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, where, getDoc } from 'firebase/firestore';
import { Button, Input, Modal } from '../../components/UI.jsx';

export const AgendaView = ({ db, user, appId }) => {
    const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
    const [appointments, setAppointments] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newAppt, setNewAppt] = useState({ client: '', service: '', time: '', notes: '', duration: '30' });

    const [workSettings, setWorkSettings] = useState({
        workStart: '09:00',
        workEnd: '19:00',
        workDays: { 0: false, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true }
    });

    useEffect(() => {
        if (!user) return;
        const fetchSettings = async () => {
            const docSnap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'));
            if (docSnap.exists()) {
                const data = docSnap.data();
                setWorkSettings({
                    workStart: data.workStart || '09:00',
                    workEnd: data.workEnd || '19:00',
                    workDays: data.workDays || { 0: false, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true }
                });
            }
        };
        fetchSettings();
    }, [user, db, appId]);

    useEffect(() => {
        if (!user || !user.uid) return;

        const q = query(
            collection(db, 'artifacts', appId, 'users', user.uid, 'appointments'),
            where('date', '==', currentDate)
        );
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => a.time.localeCompare(b.time));
            setAppointments(data);
        });
        return () => unsub();
    }, [user, db, appId, currentDate]);

    const isDayClosed = () => {
        const dayOfWeek = new Date(currentDate + 'T00:00:00').getDay();
        return workSettings.workDays && workSettings.workDays[dayOfWeek] === false;
    };

    const generateHours = () => {
        const start = parseInt(workSettings.workStart.split(':')[0]);
        const end = parseInt(workSettings.workEnd.split(':')[0]);
        const hours = [];
        for (let i = start; i <= end; i++) {
            hours.push(i < 10 ? `0${i}` : `${i}`);
        }
        return hours;
    };

    const handleOpenModal = (hourPrefix) => {
        setNewAppt({ client: '', service: '', time: `${hourPrefix}:00`, notes: '', duration: '30' });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!user || !user.uid) return;

        try {
            await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'appointments'), {
                ...newAppt,
                date: currentDate,
                createdAt: new Date().toISOString()
            });
            setIsModalOpen(false);
        } catch (error) {
            alert("Erro ao salvar agendamento.");
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Cancelar este agendamento?')) {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'appointments', id));
        }
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
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <div className="bg-azuri-100 p-2 rounded-lg text-azuri-600"><Calendar size={24} /></div>
                    Agenda
                </h2>

                <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                    <button
                        onClick={() => changeDate(-1)}
                        className="p-2 hover:bg-white hover:text-azuri-600 rounded-lg transition-all shadow-sm text-gray-500"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="relative group px-4 text-center cursor-pointer">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Visualizando</p>
                        <p className="text-sm font-bold text-gray-800 capitalize min-w-[180px]">
                            {formatDateDisplay(currentDate)}
                        </p>
                        <input
                            type="date"
                            value={currentDate}
                            onChange={(e) => setCurrentDate(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                    </div>

                    <button
                        onClick={() => changeDate(1)}
                        className="p-2 hover:bg-white hover:text-azuri-600 rounded-lg transition-all shadow-sm text-gray-500"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {isDayClosed() ? (
                <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 min-h-[400px]">
                    <div className="text-center p-8 max-w-md">
                        <div className="bg-white p-4 rounded-full inline-block mb-4 shadow-sm">
                            <Ban className="text-red-300" size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Fechado neste dia</h3>
                        <p className="text-gray-500 mb-6">Conforme suas configurações, o estabelecimento não abre aos {new Date(currentDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}s.</p>
                        <button className="text-sm text-red-700 underline hover:text-red-900 mt-4">
                            Alterar Configurações
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1">
                    {generateHours().map(hour => {
                        const slotsInThisHour = appointments.filter(a => a.time.startsWith(hour));

                        return (
                            <div key={hour} className="flex border-b border-gray-50 last:border-0 min-h-[100px] group hover:bg-gray-50/50 transition-colors">

                                <div className="w-24 flex-shrink-0 border-r border-gray-100 p-4 flex flex-col items-center justify-start gap-1">
                                    <span className="text-xl font-bold text-gray-400 group-hover:text-azuri-600 transition-colors">{hour}:00</span>

                                    <button
                                        onClick={() => handleOpenModal(hour)}
                                        className="mt-2 opacity-0 group-hover:opacity-100 bg-white border border-azuri-200 text-azuri-600 p-1.5 rounded-full hover:bg-azuri-50 transition-all shadow-sm"
                                        title="Adicionar agendamento"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>

                                <div className="flex-1 p-3 relative space-y-3">
                                    {slotsInThisHour.length > 0 ? (
                                        <>
                                            {slotsInThisHour.map(appt => (
                                                <div key={appt.id} className="bg-white border-l-4 border-azuri-500 rounded-r-lg p-3 flex justify-between items-start shadow-sm hover:shadow-md transition-all group/card ring-1 ring-gray-100">
                                                    <div className="flex gap-4">
                                                        <div className="bg-azuri-50 text-azuri-700 font-bold px-2 py-1 rounded text-xs h-fit border border-azuri-100">
                                                            {appt.time}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-800 text-sm">{appt.client}</h4>
                                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                                <Briefcase size={12} /> {appt.service}
                                                                {appt.duration && <span className="text-gray-300">• {appt.duration} min</span>}
                                                            </p>
                                                            {appt.notes && <p className="text-xs text-orange-400 mt-1 italic flex items-center gap-1"><Info size={10} /> {appt.notes}</p>}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDelete(appt.id)}
                                                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity p-1"
                                                        title="Cancelar agendamento"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}

                                            <button
                                                onClick={() => handleOpenModal(hour)}
                                                className="text-xs font-medium text-azuri-400 hover:text-azuri-700 flex items-center gap-1 py-1 px-2 rounded hover:bg-azuri-50 w-fit transition-colors"
                                            >
                                                <Plus size={12} /> Encaixar outro serviço às {hour}:xx
                                            </button>
                                        </>
                                    ) : (
                                        <div
                                            onClick={() => handleOpenModal(hour)}
                                            className="w-full h-full flex items-center justify-center cursor-pointer rounded-lg border-2 border-transparent hover:border-dashed hover:border-gray-200 transition-all"
                                        >
                                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 text-gray-400 text-sm font-medium">
                                                <Plus size={18} /> Agendar cliente
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isModalOpen && (
                <Modal title={`Novo Agendamento`} onClose={() => setIsModalOpen(false)}>
                    <form onSubmit={handleSave} className="space-y-4">
                        <Input label="Nome do Cliente" value={newAppt.client} onChange={e => setNewAppt({ ...newAppt, client: e.target.value })} required icon={UserPlus} />
                        <Input label="Serviço" value={newAppt.service} onChange={e => setNewAppt({ ...newAppt, service: e.target.value })} required icon={Briefcase} />

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Horário (Início)"
                                type="time"
                                value={newAppt.time}
                                onChange={e => setNewAppt({ ...newAppt, time: e.target.value })}
                                required
                                icon={Clock}
                            />
                            <Input
                                label="Duração (min)"
                                type="number"
                                placeholder="30"
                                value={newAppt.duration}
                                onChange={e => setNewAppt({ ...newAppt, duration: e.target.value })}
                                icon={Clock}
                            />
                        </div>

                        <Input label="Observações" value={newAppt.notes} onChange={e => setNewAppt({ ...newAppt, notes: e.target.value })} icon={FileText} />
                        <Button className="w-full py-3" type="submit">Confirmar Agendamento</Button>
                    </form>
                </Modal>
            )}
        </div>
    );
};
