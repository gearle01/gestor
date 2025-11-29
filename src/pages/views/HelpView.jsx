import React from 'react';
import { Card } from '../../components/UI.jsx';
import {
    Calendar, Users, DollarSign, Globe, FileText,
    Settings, ShieldAlert, TrendingUp, Camera, Repeat, CheckCircle, Clock
} from 'lucide-react';

export const HelpView = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Central de Ajuda</h2>
                <p className="text-gray-500">Descubra como aproveitar ao máximo o seu sistema.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 1. AGENDA INTELIGENTE */}
                <Card className="border-l-4 !border-azuri-500">
                    <h3 className="font-bold text-lg mb-3 text-gray-800 flex items-center gap-2">
                        <Calendar className="text-azuri-600" /> Agenda Inteligente
                    </h3>
                    <ul className="space-y-3 text-sm text-gray-600">
                        <li className="flex gap-2">
                            <Clock size={16} className="text-azuri-500 flex-shrink-0 mt-0.5" />
                            <span><strong>Linha do Tempo & Auto-Scroll:</strong> A agenda rola automaticamente para o horário atual ao abrir. Uma linha azul marca o minuto exato.</span>
                        </li>
                        <li className="flex gap-2">
                            <Clock size={16} className="text-azuri-500 flex-shrink-0 mt-0.5" />
                            <span><strong>Modo 24h:</strong> Alterne entre visualização comercial e 24 horas usando o botão (Sol/Lua) no topo da agenda.</span>
                        </li>
                        <li className="flex gap-2">
                            <Repeat size={16} className="text-azuri-500 flex-shrink-0 mt-0.5" />
                            <span><strong>Agendamento Recorrente:</strong> Crie agendamentos que se repetem automaticamente (semanal ou quinzenalmente).</span>
                        </li>
                        <li className="flex gap-2">
                            <DollarSign size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                            <span><strong>Checkout Integrado:</strong> Ao finalizar um atendimento, você pode adicionar produtos vendidos e o sistema já baixa do estoque e lança no financeiro.</span>
                        </li>
                        <li className="flex gap-2">
                            <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                            <span><strong>Notificações Inteligentes:</strong> O sistema agora avisa sobre sucessos e erros com mensagens discretas no canto da tela, sem interromper seu fluxo.</span>
                        </li>
                    </ul>
                </Card>

                {/* 2. AGENDAMENTO ONLINE (LINK PÚBLICO) */}
                <Card className="border-l-4 border-purple-500">
                    <h3 className="font-bold text-lg mb-3 text-gray-800 flex items-center gap-2">
                        <Globe className="text-purple-600" /> Agendamento Online
                    </h3>
                    <ul className="space-y-3 text-sm text-gray-600">
                        <li className="flex gap-2">
                            <Globe size={16} className="text-purple-500 flex-shrink-0 mt-0.5" />
                            <span><strong>Link Público:</strong> Envie seu link exclusivo para clientes agendarem sozinhos. O sistema verifica sua disponibilidade em tempo real.</span>
                        </li>
                        <li className="flex gap-2">
                            <ShieldAlert size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                            <span><strong>Shadow Ban (Bloqueio):</strong> Clientes bloqueados podem acessar o link, mas verão a agenda como "Lotada", evitando constrangimentos.</span>
                        </li>
                    </ul>
                </Card>

                {/* 3. GESTÃO DE CLIENTES */}
                <Card className="border-l-4 border-green-500">
                    <h3 className="font-bold text-lg mb-3 text-gray-800 flex items-center gap-2">
                        <Users className="text-green-600" /> Clientes & Prontuário
                    </h3>
                    <ul className="space-y-3 text-sm text-gray-600">
                        <li className="flex gap-2">
                            <FileText size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                            <span><strong>Anamnese Digital:</strong> Registre alergias, preferências e histórico médico de cada cliente.</span>
                        </li>
                        <li className="flex gap-2">
                            <Camera size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                            <span><strong>Galeria de Fotos:</strong> Salve fotos de "Antes e Depois" diretamente no perfil do cliente (funcionalidade segura).</span>
                        </li>
                    </ul>
                </Card>

                {/* 4. FINANCEIRO & METAS */}
                <Card className="border-l-4 border-yellow-500">
                    <h3 className="font-bold text-lg mb-3 text-gray-800 flex items-center gap-2">
                        <TrendingUp className="text-yellow-600" /> Financeiro
                    </h3>
                    <ul className="space-y-3 text-sm text-gray-600">
                        <li className="flex gap-2">
                            <DollarSign size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                            <span><strong>Meta Mensal:</strong> Defina quanto quer faturar no mês e acompanhe o progresso na barra animada do Dashboard.</span>
                        </li>
                        <li className="flex gap-2">
                            <FileText size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                            <span><strong>Relatórios PDF:</strong> Gere relatórios de fluxo de caixa prontos para impressão ou envio.</span>
                        </li>
                    </ul>
                </Card>

            </div>

            {/* DICA PRO */}
            <div className="bg-azuri-50 p-6 rounded-xl border border-azuri-100 flex items-start gap-4">
                <div className="bg-white p-3 rounded-full text-azuri-600 shadow-sm">
                    <Settings size={24} />
                </div>
                <div>
                    <h4 className="font-bold text-azuri-800 text-lg">Configurações do Negócio</h4>
                    <p className="text-azuri-700 text-sm mt-1">
                        Não se esqueça de configurar seus <strong>dias e horários de trabalho</strong> na aba "Configurações".
                        Isso afeta diretamente quais horários aparecem disponíveis no seu Link de Agendamento Público.
                    </p>
                </div>
            </div>
        </div>
    );
};
