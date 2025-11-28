import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, doc, getDoc, orderBy } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { Calendar, User, CheckCircle, Scissors, ChevronLeft, AlertCircle, Clock, MapPin, Phone } from 'lucide-react';

const StepTitle = ({ children }) => <h2 className="text-xl font-bold text-gray-800 mb-2">{children}</h2>;

export default function PublicBooking() {
    const { uid } = useParams();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);

    const [businessProfile, setBusinessProfile] = useState(null);
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState(null);
    const [clientData, setClientData] = useState({ name: '', phone: '' });
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');

    const [isBlockedUser, setIsBlockedUser] = useState(false);
    const [takenSlots, setTakenSlots] = useState([]);

    // 1. Carregar Perfil e Serviços
    useEffect(() => {
        const fetchData = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'artifacts', appId, 'users', uid, 'settings', 'profile'));
                if (userDoc.exists()) {
                    setBusinessProfile(userDoc.data());
                }

                const q = query(collection(db, 'artifacts', appId, 'users', uid, 'services'), orderBy('name'));
                const snap = await getDocs(q);
                setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (error) {
                console.error("Erro ao carregar:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [uid]);

    // 2. Disponibilidade (ATUALIZADO)
    useEffect(() => {
        if (!selectedDate || !uid) return;
        const fetchAvailability = async () => {
            const q = query(
                collection(db, 'artifacts', appId, 'users', uid, 'appointments'),
                where('date', '==', selectedDate)
            );
            const snap = await getDocs(q);

            // 👇 FILTRO DE SEGURANÇA:
            // Só considera ocupado se o status NÃO for 'cancelled'
            const busyTimes = snap.docs
                .map(d => d.data())
                .filter(appt => appt.status !== 'cancelled') // <--- AQUI
                .map(appt => appt.time);

            setTakenSlots(busyTimes);
        };
        fetchAvailability();
    }, [selectedDate, uid]);

    // 3. Identificação (COM VALIDAÇÃO) 🔒
    const handleIdentifyClient = async (e) => {
        e.preventDefault();

        // 👇 VALIDAÇÃO 1: NOME (Mínimo 3 letras)
        if (!clientData.name || clientData.name.trim().length < 3) {
            alert('Por favor, digite seu nome completo (mínimo 3 letras).');
            return;
        }

        // 👇 VALIDAÇÃO 2: TELEFONE (Mínimo 9 números)
        // Remove tudo que não é número para contar os dígitos reais
        const cleanPhone = clientData.phone.replace(/\D/g, '');
        if (cleanPhone.length < 9) {
            alert('Por favor, digite um WhatsApp válido com DDD (mínimo 9 números).');
            return;
        }

        setLoading(true);
        try {
            const q = query(
                collection(db, 'artifacts', appId, 'users', uid, 'clients'),
                where('phone', '==', clientData.phone),
                where('isBlocked', '==', true)
            );

            const snap = await getDocs(q);
            setIsBlockedUser(!snap.empty);
            setStep(3);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // 4. Finalizar
    const handleFinish = async () => {
        if (!selectedDate || !selectedTime) return;
        if (isBlockedUser) {
            alert("Não foi possível completar o agendamento. Tente novamente mais tarde.");
            return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'artifacts', appId, 'users', uid, 'appointments'), {
                client: clientData.name,
                clientPhone: clientData.phone,
                service: selectedService.name,
                servicePrice: selectedService.price,
                duration: selectedService.duration || '30',
                date: selectedDate,
                time: selectedTime,
                createdAt: new Date().toISOString(),
                status: 'scheduled',
                origin: 'online_booking'
            });
            setStep(4);
        } catch (error) {
            alert("Erro ao agendar.");
        } finally {
            setLoading(false);
        }
    };

    const isDayClosed = () => {
        if (!selectedDate || !businessProfile?.workDays) return false;
        const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay();
        return businessProfile.workDays[dayOfWeek] === false;
    };

    const generateTimeSlots = () => {
        if (isBlockedUser) return [];
        if (!selectedDate || !businessProfile) return [];
        if (isDayClosed()) return [];

        const startHour = parseInt(businessProfile.workStart?.split(':')[0] || 9);
        const endHour = parseInt(businessProfile.workEnd?.split(':')[0] || 19);

        const slots = [];
        for (let i = startHour; i < endHour; i++) {
            const hourString = i < 10 ? `0${i}` : `${i}`;
            const time1 = `${hourString}:00`;
            if (!takenSlots.includes(time1)) slots.push(time1);
            const time2 = `${hourString}:30`;
            if (!takenSlots.includes(time2)) slots.push(time2);
        }
        return slots;
    };

    if (loading && step === 1) return <div className="h-screen flex items-center justify-center text-azuri-600 font-bold animate-pulse">Carregando Agenda...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden min-h-[600px] flex flex-col relative">

                {/* Topo */}
                <div className="bg-azuri-600 p-8 text-white text-center rounded-b-[2.5rem] shadow-lg z-10">
                    <h1 className="text-2xl font-bold mb-1">{businessProfile?.businessName || 'Agendamento'}</h1>
                    <p className="text-azuri-100 text-sm flex items-center justify-center gap-1 opacity-90">
                        <Clock size={14} /> {businessProfile?.workStart || '09:00'} - {businessProfile?.workEnd || '19:00'}
                    </p>
                </div>

                <div className="p-6 flex-1 flex flex-col -mt-4 pt-8">

                    {/* ETAPA 1: SERVIÇOS */}
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right duration-300">
                            <StepTitle>Selecione o Serviço</StepTitle>
                            <p className="text-gray-400 text-sm mb-4">O que vamos fazer hoje?</p>
                            <div className="space-y-3 pb-4">
                                {services.map(srv => (
                                    <button
                                        key={srv.id}
                                        onClick={() => { setSelectedService(srv); setStep(2); }}
                                        className="w-full flex justify-between items-center p-4 border border-gray-100 rounded-xl hover:border-azuri-500 hover:shadow-md hover:bg-azuri-50/50 transition-all text-left group bg-white shadow-sm"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-azuri-100 text-azuri-600 flex items-center justify-center group-hover:bg-azuri-600 group-hover:text-white transition-colors">
                                                <Scissors size={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">{srv.name}</p>
                                                <p className="text-xs text-gray-400">{srv.duration || '30'} min • A partir de</p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-azuri-600 text-lg">R$ {parseFloat(srv.price).toFixed(0)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ETAPA 2: IDENTIFICAÇÃO (VALIDADA) */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right duration-300">
                            <button onClick={() => setStep(1)} className="text-gray-400 hover:text-gray-600 mb-4 flex items-center text-sm gap-1"><ChevronLeft size={16} /> Voltar</button>
                            <StepTitle>Seus Dados</StepTitle>
                            <p className="text-gray-400 text-sm mb-6">Para confirmarmos seu horário.</p>

                            <form onSubmit={handleIdentifyClient} className="space-y-5">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Seu Nome</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                        <input
                                            required
                                            className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-azuri-500 focus:bg-white transition-all"
                                            placeholder="Ex: João Silva"
                                            value={clientData.name}
                                            onChange={e => setClientData({ ...clientData, name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">WhatsApp</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                        <input
                                            required
                                            type="tel"
                                            className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-azuri-500 focus:bg-white transition-all"
                                            placeholder="(00) 00000-0000"
                                            value={clientData.phone}
                                            onChange={e => setClientData({ ...clientData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-azuri-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-azuri-700 hover:shadow-xl transition-all active:scale-95 mt-4">
                                    Verificar Disponibilidade
                                </button>
                            </form>
                        </div>
                    )}

                    {/* ETAPA 3: CALENDÁRIO */}
                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right duration-300 flex flex-col h-full">
                            <button onClick={() => setStep(2)} className="text-gray-400 hover:text-gray-600 mb-2 flex items-center text-sm gap-1"><ChevronLeft size={16} /> Voltar</button>

                            <div className="mb-6">
                                <StepTitle>Escolha o Dia</StepTitle>
                                <div className="relative">
                                    <input
                                        type="date"
                                        className="w-full p-4 pl-12 bg-white border-2 border-azuri-100 rounded-2xl outline-none focus:border-azuri-500 text-gray-700 font-bold cursor-pointer shadow-sm hover:border-azuri-300 transition-colors"
                                        value={selectedDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={e => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                                    />
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-azuri-500" size={22} />
                                </div>
                            </div>

                            {selectedDate && (
                                <div className="flex-1 overflow-y-auto pb-20">
                                    {isDayClosed() ? (
                                        <div className="text-center py-10 bg-red-50 rounded-2xl border border-red-100 animate-in zoom-in">
                                            <div className="bg-white p-3 rounded-full inline-block mb-3 shadow-sm"><Clock className="text-red-400" size={24} /></div>
                                            <p className="text-red-800 font-bold text-lg">Fechado</p>
                                            <p className="text-sm text-red-600 opacity-80 px-4">Não temos atendimento neste dia.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <h3 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
                                                <Clock size={16} /> Horários Livres
                                            </h3>

                                            <div className="grid grid-cols-4 gap-2">
                                                {generateTimeSlots().map(time => (
                                                    <button
                                                        key={time}
                                                        onClick={() => setSelectedTime(time)}
                                                        className={`py-2.5 px-1 rounded-xl text-sm font-bold border transition-all ${selectedTime === time
                                                            ? 'bg-azuri-600 text-white border-azuri-600 scale-105 shadow-md ring-2 ring-azuri-200'
                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-azuri-400 hover:text-azuri-600'
                                                            }`}
                                                    >
                                                        {time}
                                                    </button>
                                                ))}
                                            </div>

                                            {generateTimeSlots().length === 0 && !isBlockedUser && (
                                                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 mt-2">
                                                    <p className="text-gray-500 font-medium">Sem horários para este dia.</p>
                                                </div>
                                            )}

                                            {/* MENSAGEM DO SHADOW BAN */}
                                            {isBlockedUser && (
                                                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 mt-2">
                                                    <p className="text-gray-500 font-medium">Agenda lotada.</p>
                                                    <p className="text-xs text-gray-400">Não há horários disponíveis para o seu perfil.</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {selectedDate && selectedTime && (
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] rounded-b-[2rem] animate-in slide-in-from-bottom-full">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="text-xs text-gray-500">
                                            <p>{selectedService.name}</p>
                                            <p>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')} às {selectedTime}</p>
                                        </div>
                                        <span className="text-xl font-bold text-azuri-700">R$ {parseFloat(selectedService.price).toFixed(0)}</span>
                                    </div>
                                    <button onClick={handleFinish} disabled={loading} className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-green-700 active:scale-95 flex justify-center items-center gap-2 transition-all">
                                        {loading ? 'Agendando...' : 'Confirmar Agendamento'} <CheckCircle size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ETAPA 4: SUCESSO */}
                    {step === 4 && (
                        <div className="text-center flex flex-col items-center justify-center h-full animate-in zoom-in duration-500">
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 shadow-sm ring-8 ring-green-50">
                                <CheckCircle size={48} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Agendado!</h2>
                            <p className="text-gray-500 mb-8 max-w-[200px] leading-relaxed">
                                Te esperamos dia <strong>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}</strong> às <strong>{selectedTime}</strong>.
                            </p>
                            <div className="space-y-3 w-full">
                                <button onClick={() => window.location.reload()} className="w-full bg-azuri-50 text-azuri-700 font-bold py-3 rounded-xl hover:bg-azuri-100 transition-colors">
                                    Agendar Novo
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
