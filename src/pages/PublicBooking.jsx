import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, doc, getDoc, orderBy } from 'firebase/firestore';
import { db, appId } from '../firebase';
import {
    Calendar, User, CheckCircle, Scissors, ChevronLeft,
    AlertCircle, Clock, Phone, Sun, Moon, Sunset, Store
} from 'lucide-react';

export default function PublicBooking() {
    const { uid } = useParams();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [businessProfile, setBusinessProfile] = useState(null);
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState(null);

    const [clientData, setClientData] = useState({ name: '', phone: '' });

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState('');
    const [nextDays, setNextDays] = useState([]);

    const [isBlockedUser, setIsBlockedUser] = useState(false);
    const [takenSlots, setTakenSlots] = useState([]);

    // 1. Inicialização
    useEffect(() => {
        if (!uid) { setError("Link inválido."); setLoading(false); return; }

        const fetchData = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'artifacts', appId, 'users', uid, 'settings', 'profile'));
                if (userDoc.exists()) {
                    setBusinessProfile(userDoc.data());
                } else {
                    setError("Estabelecimento não encontrado.");
                }

                const q = query(collection(db, 'artifacts', appId, 'users', uid, 'services'), orderBy('name'));
                const snap = await getDocs(q);
                setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));

                const days = [];
                const today = new Date();
                for (let i = 0; i < 14; i++) {
                    const d = new Date(today);
                    d.setDate(today.getDate() + i);
                    days.push(d);
                }
                setNextDays(days);

            } catch (error) {
                console.error(error);
                setError("Erro ao carregar agenda.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [uid]);

    // 2. Monitorar Disponibilidade
    useEffect(() => {
        if (!selectedDate || !uid) return;
        setLoading(true);
        const fetchAvailability = async () => {
            try {
                const q = query(
                    collection(db, 'artifacts', appId, 'users', uid, 'appointments'),
                    where('date', '==', selectedDate)
                );
                const snap = await getDocs(q);
                const busyTimes = snap.docs
                    .map(d => d.data())
                    .filter(appt => appt.status !== 'cancelled')
                    .map(appt => appt.time);
                setTakenSlots(busyTimes);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchAvailability();
    }, [selectedDate, uid]);

    const handleIdentifyClient = async (e) => {
        e.preventDefault();
        if (!clientData.name || clientData.name.length < 3) return alert('Nome muito curto.');
        if (clientData.phone.length < 8) return alert('Telefone inválido.');

        setLoading(true);
        try {
            const q = query(collection(db, 'artifacts', appId, 'users', uid, 'clients'), where('phone', '==', clientData.phone), where('isBlocked', '==', true));
            const snap = await getDocs(q);
            setIsBlockedUser(!snap.empty);
            setStep(3);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const handleFinish = async () => {
        if (!selectedDate || !selectedTime) return;
        if (isBlockedUser) return alert("Erro ao processar.");
        setLoading(true);
        try {
            await addDoc(collection(db, 'artifacts', appId, 'users', uid, 'appointments'), {
                client: clientData.name, clientPhone: clientData.phone,
                service: selectedService.name, servicePrice: selectedService.price, duration: selectedService.duration || '30',
                date: selectedDate, time: selectedTime, createdAt: new Date().toISOString(), status: 'scheduled', origin: 'online_booking'
            });
            setStep(4);
        } catch (error) { alert("Erro ao agendar."); } finally { setLoading(false); }
    };

    const isDayClosed = (dateString) => {
        if (!businessProfile?.workDays) return false;
        const dayOfWeek = new Date(dateString + 'T00:00:00').getDay();
        return businessProfile.workDays[dayOfWeek] === false;
    };

    const getSlots = () => {
        if (isBlockedUser || !selectedDate || !businessProfile || isDayClosed(selectedDate)) return { morning: [], afternoon: [], evening: [] };

        const start = parseInt(businessProfile.workStart?.split(':')[0] || 9);
        const end = parseInt(businessProfile.workEnd?.split(':')[0] || 19);
        const slots = { morning: [], afternoon: [], evening: [] };

        for (let i = start; i < end; i++) {
            const h = i < 10 ? `0${i}` : `${i}`;
            const timeFull = `${h}:00`;
            const timeHalf = `${h}:30`;

            if (!takenSlots.includes(timeFull)) {
                if (i < 12) slots.morning.push(timeFull); else if (i < 18) slots.afternoon.push(timeFull); else slots.evening.push(timeFull);
            }
            if (!takenSlots.includes(timeHalf)) {
                if (i < 12) slots.morning.push(timeHalf); else if (i < 18) slots.afternoon.push(timeHalf); else slots.evening.push(timeHalf);
            }
        }
        return slots;
    };

    const TimeGroup = ({ title, icon: Icon, slots }) => (
        slots.length > 0 && (
            <div className="mb-6 animate-in fade-in slide-in-from-bottom-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2 px-1">
                    <div className="bg-gray-100 p-1 rounded"><Icon size={14} className="text-gray-500" /></div>
                    {title}
                </h4>
                <div className="grid grid-cols-4 gap-3">
                    {slots.map(t => (
                        <button key={t} onClick={() => setSelectedTime(t)} className={`py-3 rounded-2xl text-sm font-bold border transition-all ${selectedTime === t ? 'bg-azuri-600 text-white border-azuri-600 shadow-lg scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-azuri-300'}`}>{t}</button>
                    ))}
                </div>
            </div>
        )
    );

    if (loading && step === 1) return <div className="h-screen flex items-center justify-center text-azuri-600 font-bold animate-pulse">Carregando...</div>;
    if (error) return <div className="h-screen flex items-center justify-center text-red-500 p-4 text-center"><AlertCircle size={48} /><p className="font-bold mt-2">{error}</p></div>;

    return (
        // CONTAINER GERAL (FUNDO)
        <div className="min-h-screen w-full bg-gray-100 flex items-center justify-center font-sans md:p-4 p-0">

            {/* "APP" - MÁXIMA ALTURA CONTROLADA */}
            <div className="bg-white w-full max-w-md md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative h-[100dvh] md:h-[85vh] max-h-[900px]">

                {/* 1. HEADER (FIXO NO TOPO) */}
                <div className="bg-azuri-600 p-5 pt-safe-top text-white text-center rounded-b-[2rem] shadow-lg z-20 shrink-0">
                    <div className="relative flex items-center justify-center">
                        {step > 1 && step < 4 && (
                            <button onClick={() => setStep(step - 1)} className="absolute left-0 p-2 hover:bg-white/20 rounded-full text-white transition-colors">
                                <ChevronLeft size={24} />
                            </button>
                        )}
                        <div className="flex flex-col items-center">
                            <h1 className="text-xl font-bold truncate max-w-[200px]">{businessProfile?.businessName || 'Agendamento'}</h1>
                            <p className="text-azuri-100 text-xs flex items-center gap-1 opacity-90 mt-1">
                                <Clock size={12} /> {businessProfile?.workStart || '09:00'} - {businessProfile?.workEnd || '19:00'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. ÁREA DE CONTEÚDO (ROLAGEM) */}
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-white">

                    {/* ETAPA 1: SERVIÇOS */}
                    {step === 1 && (
                        <div className="animate-in slide-in-from-right duration-300 pb-4">
                            <h2 className="text-xl font-bold text-gray-800 mb-1">Qual serviço deseja?</h2>
                            <p className="text-gray-400 text-sm mb-6">Selecione para continuar.</p>

                            {services.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                    <Store className="mx-auto text-gray-300 mb-2" size={48} />
                                    <p className="text-gray-500 font-bold">Nenhum serviço disponível</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {services.map(srv => (
                                        <button key={srv.id} onClick={() => { setSelectedService(srv); setStep(2); }} className="w-full flex justify-between items-center p-4 border border-gray-100 rounded-2xl hover:border-azuri-500 hover:shadow-md transition-all text-left group bg-white active:scale-95 duration-200">
                                            <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-azuri-50 text-azuri-600 flex items-center justify-center group-hover:bg-azuri-600 group-hover:text-white transition-colors shadow-sm"><Scissors size={20} /></div><div><p className="font-bold text-gray-800 text-lg">{srv.name}</p><p className="text-xs text-gray-400">{srv.duration || '30'} minutos</p></div></div>
                                            <span className="font-bold text-azuri-600 bg-azuri-50 px-3 py-1 rounded-lg group-hover:bg-azuri-100 transition-colors">R$ {parseFloat(srv.price).toFixed(0)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ETAPA 2: IDENTIFICAÇÃO */}
                    {step === 2 && (
                        <div className="animate-in slide-in-from-right duration-300">
                            <h2 className="text-xl font-bold text-gray-800 mb-1">Seus dados</h2>
                            <p className="text-gray-400 text-sm mb-6">Para confirmar o horário.</p>
                            <form onSubmit={handleIdentifyClient} className="space-y-5">
                                <div><label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Nome</label><div className="relative"><User className="absolute left-4 top-4 text-gray-400" size={20} /><input required className="w-full pl-12 p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-azuri-500 focus:bg-white focus:ring-4 focus:ring-azuri-50/50 transition-all text-gray-800 font-medium" placeholder="Seu nome completo" value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })} /></div></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">WhatsApp</label><div className="relative"><Phone className="absolute left-4 top-4 text-gray-400" size={20} /><input required type="tel" className="w-full pl-12 p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-azuri-500 focus:bg-white focus:ring-4 focus:ring-azuri-50/50 transition-all text-gray-800 font-medium" placeholder="(00) 90000-0000" value={clientData.phone} onChange={e => setClientData({ ...clientData, phone: e.target.value })} /></div></div>
                                <button type="submit" className="w-full bg-azuri-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-azuri-200 hover:bg-azuri-700 hover:shadow-xl transition-all active:scale-95 mt-4">Verificar Horários</button>
                            </form>
                        </div>
                    )}

                    {/* ETAPA 3: DATA E HORÁRIO */}
                    {step === 3 && (
                        <div className="animate-in slide-in-from-right duration-300">
                            <h2 className="text-xl font-bold text-gray-800 mb-1">Melhor dia e horário</h2>
                            <p className="text-gray-400 text-sm mb-6">Deslize para ver mais dias.</p>

                            <div className="mb-8 -mx-6 px-6"> {/* Extende o scroll até a borda */}
                                <div className="flex gap-3 overflow-x-auto pb-4 snap-x hide-scrollbar px-1">
                                    {nextDays.map(d => {
                                        const dString = d.toISOString().split('T')[0];
                                        const isSelected = selectedDate === dString;
                                        const isClosed = isDayClosed(dString);
                                        return (
                                            <button key={dString} onClick={() => { setSelectedDate(dString); setSelectedTime(''); }} disabled={isClosed} className={`flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 border snap-start transition-all ${isSelected ? 'bg-azuri-600 border-azuri-600 text-white shadow-lg scale-105 ring-2 ring-azuri-200' : isClosed ? 'bg-gray-50 border-gray-100 text-gray-300 opacity-50 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-600 hover:border-azuri-300'}`}>
                                                <span className="text-xs font-medium uppercase">{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span><span className="text-xl font-bold">{d.getDate()}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                {loading ? (
                                    <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-azuri-600 border-t-transparent rounded-full mx-auto mb-2"></div><p className="text-xs text-gray-400">Verificando horários...</p></div>
                                ) : (
                                    <>
                                        {isDayClosed(selectedDate) ? (
                                            <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200"><Clock className="mx-auto text-gray-300 mb-2" size={32} /><p className="text-gray-500 font-medium">Fechado neste dia</p></div>
                                        ) : (
                                            <>
                                                {getSlots().morning.length === 0 && getSlots().afternoon.length === 0 && getSlots().evening.length === 0 && (
                                                    <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200"><p className="text-gray-500 font-medium">Sem horários disponíveis.</p></div>
                                                )}
                                                <TimeGroup title="Manhã" icon={Sun} slots={getSlots().morning} />
                                                <TimeGroup title="Tarde" icon={Sunset} slots={getSlots().afternoon} />
                                                <TimeGroup title="Noite" icon={Moon} slots={getSlots().evening} />
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ETAPA 4: SUCESSO */}
                    {step === 4 && (
                        <div className="text-center flex flex-col items-center justify-center h-full animate-in zoom-in duration-500 p-4">
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 shadow-sm ring-8 ring-green-50 animate-bounce-slow"><CheckCircle size={48} /></div>
                            <h2 className="text-3xl font-bold text-gray-800 mb-2">Tudo certo!</h2>
                            <p className="text-gray-500 mb-8 max-w-[250px] leading-relaxed mx-auto">Seu agendamento para <strong>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}</strong> às <strong>{selectedTime}</strong> foi confirmado.</p>
                            <button onClick={() => window.location.reload()} className="w-full bg-azuri-50 text-azuri-700 font-bold py-4 rounded-2xl hover:bg-azuri-100 transition-colors">Fazer outro agendamento</button>
                        </div>
                    )}
                </div>

                {/* 3. FOOTER (FIXO NO FINAL) */}
                {step === 3 && selectedDate && selectedTime && (
                    <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] shrink-0 z-20 pb-safe-bottom">
                        <div className="flex justify-between items-center mb-3">
                            <div><p className="font-bold text-gray-800 text-sm">{selectedService?.name}</p><p className="text-xs text-gray-500">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')} às {selectedTime}</p></div>
                            <span className="text-xl font-bold text-azuri-600">R$ {parseFloat(selectedService?.price).toFixed(0)}</span>
                        </div>
                        <button onClick={handleFinish} disabled={loading} className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-200 hover:bg-green-700 active:scale-95 transition-all flex justify-center items-center gap-2">{loading ? 'Confirmando...' : 'Confirmar Agendamento'} <CheckCircle size={20} /></button>
                    </div>
                )}

            </div>
        </div>
    );
}
