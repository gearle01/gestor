import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { Card, Button, Input } from '../../components/UI.jsx';

export const SettingsView = ({ user, onSaveSettings }) => {
    const [formData, setFormData] = useState({
        businessName: user?.businessName || '',
        userName: user?.userName || '',
        email: user?.email || '',
        workStart: user?.workStart || '09:00',
        workEnd: user?.workEnd || '19:00',
        workDays: user?.workDays || { 0: false, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true }
    });

    const daysOfWeek = [
        { id: 1, label: 'Seg' }, { id: 2, label: 'Ter' }, { id: 3, label: 'Qua' },
        { id: 4, label: 'Qui' }, { id: 5, label: 'Sex' }, { id: 6, label: 'Sáb' }, { id: 0, label: 'Dom' },
    ];

    const handleDayToggle = (dayId) => {
        setFormData(prev => ({
            ...prev,
            workDays: { ...prev.workDays, [dayId]: !prev.workDays[dayId] }
        }));
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Configurações</h2>
            <Card>
                <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Dados da Empresa</h3>
                <Input label="Nome da Empresa" value={formData.businessName} onChange={e => setFormData({ ...formData, businessName: e.target.value })} />
                <Input label="Seu Nome" value={formData.userName} onChange={e => setFormData({ ...formData, userName: e.target.value })} />
            </Card>

            <Card>
                <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                    <Clock size={20} /> Horário de Funcionamento
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <Input label="Abertura" type="time" value={formData.workStart} onChange={e => setFormData({ ...formData, workStart: e.target.value })} />
                    <Input label="Fechamento" type="time" value={formData.workEnd} onChange={e => setFormData({ ...formData, workEnd: e.target.value })} />
                </div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Dias de Atendimento</h4>
                <div className="flex gap-2 flex-wrap">
                    {daysOfWeek.map(day => (
                        <button
                            key={day.id}
                            onClick={() => handleDayToggle(day.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${formData.workDays[day.id]
                                ? 'bg-azuri-600 text-white border-azuri-600'
                                : 'bg-white text-gray-400 border-gray-200'
                                }`}
                        >
                            {day.label}
                        </button>
                    ))}
                </div>
            </Card>
            <Button onClick={() => onSaveSettings(formData)} className="w-full py-3">Salvar Alterações</Button>
        </div>
    );
};
