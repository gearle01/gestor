import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, doc, getDoc, orderBy } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { Calendar, User, CheckCircle, Scissors, ChevronLeft, AlertCircle, Clock, Phone, Sun, Sunset, Moon, Store } from 'lucide-react';

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

    // ... (SEUS USE EFFECTS PERMANECEM IGUAIS AQUI) ...
    // Init
    useEffect(() => {
        if (!uid) { setError("Link inválido."); setLoading(false); return; }
        const fetchData = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'artifacts', appId, 'users', uid, 'settings', 'profile'));
                if (userDoc.exists()) setBusinessProfile(userDoc.data());
                else setError("Estabelecimento não encontrado.");

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

    // Availability
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
                const start = parseInt((businessProfile.workStart || '09:00').split(':')[0]);
                const end = parseInt((businessProfile.workEnd || '19:00').split(':')[0]);
                const slots = { morning: [], afternoon: [], evening: [] };

                for (let i = start; i < end; i++) {
                    const h = i < 10 ? `0${i}` : `${i}`;
                    const timeFull = `${h}:00`;
                    const timeHalf = `${h}:30`;

                    if (!takenSlots.includes(timeFull)) {
                        if (i < 12) slots.morning.push(timeFull);
                        else if (i < 18) slots.afternoon.push(timeFull);
                        else slots.evening.push(timeFull);
                    }
                    if (!takenSlots.includes(timeHalf)) {
                        if (i < 12) slots.morning.push(timeHalf);
                        else if (i < 18) slots.afternoon.push(timeHalf);
                        else slots.evening.push(timeHalf);
                    }
                }
                return slots;
            };

            const TimeGroup = ({ title, icon: Icon, slots }) => (
                slots.length > 0 && (
                    <div className="mb-6">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2 px-0">
                            <Icon size={14} className="text-gray-400" /> {title}
                        </h4>
                        <div className="grid grid-cols-4 gap-2">
                            {slots.map(t => (
                                <button
                                    key={t}
                                    onClick={() => setSelectedTime(t)}
                                    className={`py-3 px-2 rounded-lg text-xs font-bold border transition-all whitespace-nowrap ${selectedTime === t
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                )
            );

            if (loading && step === 1) return (
                <div className="h-screen flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                        <p className="text-gray-600 font-medium">Carregando...</p>
                    </div>
                </div>
            );

            if (error) return (
                <div className="h-screen flex items-center justify-center bg-gray-100 p-4">
                    <div className="text-center bg-white p-6 rounded-2xl">
                        <AlertCircle className="mx-auto text-red-500 mb-3" size={48} />
                        <p className="font-bold text-gray-800">{error}</p>
                    </div>
                </div>
            );

            return (
                // ALTERADO: Removi w-full e forcei min-h-screen para garantir o fundo em toda a rolagem
                <div className="min-h-screen w-full bg-gray-100 flex items-center justify-center p-0 sm:p-4 font-sans">
                    <div className="w-full sm:max-w-md bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-screen sm:min-h-0 sm:h-auto sm:max-h-[90vh]">

                        {/* HEADER */}
                        {/* ALTERADO: Adicionei pt-[calc(...)] para somar padding + notch */}
                        <div className="bg-gradient-to-b from-blue-600 via-blue-600 to-blue-700 text-white px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-8 rounded-b-4xl relative overflow-hidden">

                            {/* Gradient overlay */}
                            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-b-4xl" />

                            <div className="flex items-center justify-between mb-4 relative z-10 pt-2">
                                {step > 1 && step < 4 && (
                                    <button onClick={() => setStep(step - 1)} className="p-2 hover:bg-white/20 rounded-full">
                                        <ChevronLeft size={24} />
                                    </button>
                                )}
                                <div className="flex-1 text-center">
                                    <h1 className="text-2xl font-bold">{businessProfile?.businessName || 'Agendamento'}</h1>
                                </div>
                                {step > 1 && step < 4 && <div className="w-10" />}
                            </div>
                            <div className="flex items-center justify-center gap-2 text-blue-100 relative z-10">
                                <Clock size={16} />
                                <span className="text-sm font-medium">{businessProfile?.workStart || '09:00'} - {businessProfile?.workEnd || '19:00'}</span>
                            </div>
                        </div>

                        {/* CONTENT */}
                        <div className="flex-1 overflow-y-auto p-5 pb-32"> {/* pb-32 garante espaço extra no final da rolagem */}

                            {/* STEP 1 */}
                            {step === 1 && (
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Qual serviço?</h2>
                                    <p className="text-gray-500 text-sm mb-6">Escolha um serviço para continuar.</p>

                                    {services.length === 0 ? (
                                        <div className="text-center py-10 bg-gray-50 rounded-xl">
                                            <Store className="mx-auto text-gray-300 mb-2" size={40} />
                                            <p className="text-gray-500 font-medium">Nenhum serviço disponível</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {services.map(srv => (
                                                <button
                                                    key={srv.id}
                                                    onClick={() => { setSelectedService(srv); setStep(2); }}
                                                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                                                >
                                                    <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                                                        <Scissors size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-gray-800">{srv.name}</p>
                                                        <p className="text-xs text-gray-500">{srv.duration || '30'} min</p>
                                                    </div>
                                                    <div className="font-bold text-blue-600 text-lg flex-shrink-0">R$ {parseFloat(srv.price).toFixed(0)}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 2 */}
                            {step === 2 && (
                                <form onSubmit={handleIdentifyClient} className="space-y-4">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Seus dados</h2>
                                    <p className="text-gray-500 text-sm mb-6">Como você se chama?</p>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Nome</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-3.5 text-gray-400" size={20} />
                                            <input
                                                required
                                                className="w-full pl-12 p-3 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:ring-0 outline-none text-gray-800 font-medium"
                                                placeholder="Seu nome"
                                                value={clientData.name}
                                                onChange={e => setClientData({ ...clientData, name: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-2">WhatsApp</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-3.5 text-gray-400" size={20} />
                                            <input
                                                required
                                                type="tel"
                                                className="w-full pl-12 p-3 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:ring-0 outline-none text-gray-800 font-medium"
                                                placeholder="(00) 90000-0000"
                                                value={clientData.phone}
                                                onChange={e => setClientData({ ...clientData, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full mt-6 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Próximo
                                    </button>
                                </form>
                            )}

                            {/* STEP 3 */}
                            {step === 3 && (
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Melhor dia e horário</h2>
                                    <p className="text-gray-500 text-sm mb-6">Escolha quando preferir.</p>

                                    {/* DATES */}
                                    <div className="mb-6 -mx-5 px-5 overflow-x-auto pb-3">
                                        <div className="flex gap-2">
                                            {nextDays.map(d => {
                                                const dString = d.toISOString().split('T')[0];
                                                const isSelected = selectedDate === dString;
                                                const isClosed = isDayClosed(dString);
                                                const isToday = dString === new Date().toISOString().split('T')[0];

                                                return (
                                                    <button
                                                        key={dString}
                                                        onClick={() => { setSelectedDate(dString); setSelectedTime(''); }}
                                                        disabled={isClosed}
                                                        className={`flex-shrink-0 w-20 py-4 rounded-xl border-2 font-bold transition-all flex flex-col items-center justify-center gap-1 ${isSelected
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                            : isClosed
                                                                ? 'bg-gray-50 border-gray-200 text-gray-300 opacity-50'
                                                                : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                                                            }`}
                                                    >
                                                        <span className="text-xs uppercase">{d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}</span>
                                                        <span className="text-lg">{d.getDate()}</span>
                                                        {isToday && <span className={`text-xs px-1.5 rounded ${isSelected ? 'bg-blue-400' : 'bg-green-100 text-green-700'}`}>Hoje</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* TIMES */}
                                    {loading ? (
                                        <div className="text-center py-8">
                                            <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                                            <p className="text-xs text-gray-400">Buscando horários...</p>
                                        </div>
                                    ) : isDayClosed(selectedDate) ? (
                                        <div className="text-center py-8 bg-red-50 rounded-lg">
                                            <p className="text-red-600 font-bold">Fechado neste dia</p>
                                        </div>
                                    ) : getSlots().morning.length === 0 && getSlots().afternoon.length === 0 && getSlots().evening.length === 0 ? (
                                        <div className="text-center py-8 bg-yellow-50 rounded-lg">
                                            <p className="text-yellow-600 font-bold">Sem horários</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <TimeGroup title="MANHÃ" icon={Sun} slots={getSlots().morning} />
                                            <TimeGroup title="TARDE" icon={Sunset} slots={getSlots().afternoon} />
                                            <TimeGroup title="NOITE" icon={Moon} slots={getSlots().evening} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 4 - MANTIDO IGUAL */}
                            {step === 4 && (
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="text-green-600" size={40} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Confirmado!</h2>
                                    <p className="text-gray-600 text-sm mb-4">Seu agendamento foi registrado com sucesso.</p>
                                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6 text-left">
                                        <p className="text-sm font-bold text-gray-800 mb-2">{selectedService?.name}</p>
                                        <p className="text-xs text-gray-600 flex items-center gap-2 mb-1">
                                            <Calendar size={14} /> {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                        </p>
                                        <p className="text-xs text-gray-600 flex items-center gap-2">
                                            <Clock size={14} /> {selectedTime}
                                        </p>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-4">Um lembrete será enviado no WhatsApp.</p>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700"
                                    >
                                        Novo Agendamento
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* FOOTER - STICKY */}
                        {/* ALTERADO: Adicionei pb-[calc(...)] para somar padding + home bar */}
                        {step === 3 && selectedDate && selectedTime && (
                            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-3">
                                <div className="bg-blue-50 p-3 rounded-lg">
                                    <p className="font-bold text-gray-800 text-sm">{selectedService?.name}</p>
                                    <p className="text-xs text-gray-600">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')} às {selectedTime}</p>
                                    <p className="text-sm font-bold text-blue-600 mt-1">R$ {parseFloat(selectedService?.price).toFixed(0)}</p>
                                </div>
                                <button
                                    onClick={handleFinish}
                                    disabled={loading}
                                    className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={18} /> Confirmar Agendamento
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            );
        }