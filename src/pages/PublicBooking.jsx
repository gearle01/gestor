import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, doc, getDoc, orderBy } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { Calendar, Clock, User, CheckCircle, Scissors, ChevronLeft, AlertCircle, Ban } from 'lucide-react';

// Componentes simples internos para não depender do UI.jsx (caso mude o estilo público)
const StepTitle = ({ children }) => <h2 className="text-xl font-bold text-gray-800 mb-4">{children}</h2>;

export default function PublicBooking() {
    const { uid } = useParams(); // Pega o ID da Barbearia da URL
    const [step, setStep] = useState(1);
    const [businessName, setBusinessName] = useState('Carregando...');

    // Dados do Agendamento
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState(null);
    const [clientData, setClientData] = useState({ name: '', phone: '' });
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');

    // Estados de Controle
    const [loading, setLoading] = useState(true);
    const [isBlockedUser, setIsBlockedUser] = useState(false); // O segredo do Shadow Ban

    // 1. Carregar dados da Empresa e Serviços
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Busca Nome da Empresa
                const userDoc = await getDoc(doc(db, 'artifacts', appId, 'users', uid, 'settings', 'profile'));
                if (userDoc.exists()) {
                    setBusinessName(userDoc.data().businessName || 'Agendamento Online');
                }

                // Busca Serviços
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

    // 2. Lógica do Shadow Ban (Verifica se está bloqueado ao avançar do Passo 2)
    const handleIdentifyClient = async (e) => {
        e.preventDefault();
        if (!clientData.name || !clientData.phone) return alert('Preencha todos os campos!');

        setLoading(true);
        try {
            // Verifica se esse telefone já existe na lista de bloqueados
            const q = query(
                collection(db, 'artifacts', appId, 'users', uid, 'clients'),
                where('phone', '==', clientData.phone),
                where('isBlocked', '==', true) // Só busca se estiver bloqueado
            );

            const snap = await getDocs(q);

            if (!snap.empty) {
                // 🚨 USUÁRIO ESTÁ NA LISTA NEGRA!
                // Ativamos o modo fantasma: ele vai para o próximo passo, mas não verá horários.
                setIsBlockedUser(true);
            } else {
                setIsBlockedUser(false);
            }

            setStep(3); // Avança para a escolha de horário
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // 3. Finalizar Agendamento
    const handleFinish = async () => {
        if (!selectedDate || !selectedTime) return;

        // Se for usuário bloqueado tentando burlar, paramos aqui (segurança extra)
        if (isBlockedUser) {
            alert("Ocorreu um erro ao processar seu agendamento. Tente novamente mais tarde.");
            return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'artifacts', appId, 'users', uid, 'appointments'), {
                client: clientData.name,
                clientPhone: clientData.phone,
                service: selectedService.name,
                servicePrice: selectedService.price,
                date: selectedDate,
                time: selectedTime,
                createdAt: new Date().toISOString(),
                status: 'scheduled'
            });
            setStep(4); // Sucesso
        } catch (error) {
            alert("Erro ao agendar. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    // Gerador de Horários (Simples para demonstração)
    // No futuro, isso deve checar o banco para ver o que já está ocupado
    const generateTimeSlots = () => {
        // 😈 SE FOR BLOQUEADO, RETORNA LISTA VAZIA (SHADOW BAN)
        if (isBlockedUser) return [];

        const slots = [];
        for (let i = 9; i <= 18; i++) {
            slots.push(`${i}:00`);
            slots.push(`${i}:30`);
        }
        return slots;
    };

    if (loading && step === 1) return <div className="h-screen flex items-center justify-center text-azuri-600">Carregando agenda...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden min-h-[500px] flex flex-col">

                {/* Cabeçalho */}
                <div className="bg-azuri-600 p-6 text-white text-center">
                    <h1 className="text-xl font-bold">{businessName}</h1>
                    <p className="text-azuri-100 text-sm">Agendamento Online</p>
                </div>

                {/* Conteúdo Dinâmico (Wizard) */}
                <div className="p-6 flex-1 flex flex-col">

                    {/* PASSO 1: ESCOLHA O SERVIÇO */}
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right duration-300">
                            <StepTitle>1. Qual serviço deseja?</StepTitle>
                            <div className="space-y-3">
                                {services.map(srv => (
                                    <button
                                        key={srv.id}
                                        onClick={() => { setSelectedService(srv); setStep(2); }}
                                        className="w-full flex justify-between items-center p-4 border border-gray-100 rounded-xl hover:border-azuri-500 hover:bg-azuri-50 transition-all group text-left shadow-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-gray-100 p-2 rounded-lg text-gray-500 group-hover:text-azuri-600 group-hover:bg-white transition-colors">
                                                <Scissors size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">{srv.name}</p>
                                                <p className="text-xs text-gray-500">{srv.duration ? `${srv.duration} min` : 'Duração padrão'}</p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-azuri-600">R$ {parseFloat(srv.price).toFixed(2)}</span>
                                    </button>
                                ))}
                                {services.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum serviço disponível.</p>}
                            </div>
                        </div>
                    )}

                    {/* PASSO 2: IDENTIFICAÇÃO (FILTRO) */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right duration-300">
                            <button onClick={() => setStep(1)} className="text-gray-400 hover:text-gray-600 mb-4 flex items-center text-sm"><ChevronLeft size={16} /> Voltar</button>
                            <StepTitle>2. Seus dados</StepTitle>
                            <p className="text-gray-500 text-sm mb-6">Precisamos do seu contato para confirmar o agendamento.</p>

                            <form onSubmit={handleIdentifyClient} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Seu Nome</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 text-gray-400" size={18} />
                                        <input
                                            required
                                            className="w-full pl-10 p-3 border border-gray-200 rounded-lg outline-none focus:border-azuri-500 transition-colors"
                                            placeholder="Ex: João Silva"
                                            value={clientData.name}
                                            onChange={e => setClientData({ ...clientData, name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Seu WhatsApp</label>
                                    <input
                                        required
                                        type="tel"
                                        className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-azuri-500 transition-colors"
                                        placeholder="(00) 00000-0000"
                                        value={clientData.phone}
                                        onChange={e => setClientData({ ...clientData, phone: e.target.value })}
                                    />
                                </div>
                                <button type="submit" className="w-full bg-azuri-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-azuri-700 transition-transform active:scale-95 mt-4">
                                    Ver Horários Disponíveis
                                </button>
                            </form>
                        </div>
                    )}

                    {/* PASSO 3: ESCOLHA DATA E HORÁRIO (FINAL) */}
                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right duration-300">
                            <button onClick={() => setStep(2)} className="text-gray-400 hover:text-gray-600 mb-4 flex items-center text-sm"><ChevronLeft size={16} /> Voltar</button>
                            <StepTitle>3. Escolha o horário</StepTitle>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Para quando?</label>
                                <input
                                    type="date"
                                    className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-azuri-500"
                                    value={selectedDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={e => setSelectedDate(e.target.value)}
                                />
                            </div>

                            {selectedDate && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Horários Livres</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {generateTimeSlots().map(time => (
                                            <button
                                                key={time}
                                                onClick={() => setSelectedTime(time)}
                                                className={`py-2 px-1 rounded-lg text-sm font-medium border transition-colors ${selectedTime === time ? 'bg-azuri-600 text-white border-azuri-600' : 'bg-white text-gray-600 border-gray-200 hover:border-azuri-300'}`}
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                    {/* 😈 MENSAGEM FANTASMA SE BLOQUEADO */}
                                    {generateTimeSlots().length === 0 && (
                                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                            <AlertCircle className="mx-auto text-gray-400 mb-2" />
                                            <p className="text-gray-500 font-medium">Agenda lotada para esta data.</p>
                                            <p className="text-xs text-gray-400">Tente selecionar outro dia.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedDate && selectedTime && (
                                <div className="mt-6 border-t border-gray-100 pt-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-sm text-gray-500">Total a pagar no local:</span>
                                        <span className="text-xl font-bold text-azuri-700">R$ {parseFloat(selectedService.price).toFixed(2)}</span>
                                    </div>
                                    <button onClick={handleFinish} disabled={loading} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-700 transition-transform active:scale-95 flex justify-center items-center gap-2">
                                        {loading ? 'Confirmando...' : 'Confirmar Agendamento'} <CheckCircle size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PASSO 4: SUCESSO */}
                    {step === 4 && (
                        <div className="text-center animate-in zoom-in duration-500 flex flex-col items-center justify-center h-full">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 shadow-sm">
                                <CheckCircle size={40} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Agendado com Sucesso!</h2>
                            <p className="text-gray-600 mb-6">Te esperamos dia <strong>{new Date(selectedDate).toLocaleDateString('pt-BR')}</strong> às <strong>{selectedTime}</strong>.</p>
                            <button onClick={() => window.location.reload()} className="text-azuri-600 font-bold hover:underline">
                                Fazer outro agendamento
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
