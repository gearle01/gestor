import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function PaymentBanner({ dueDays, onNavigate }) {
    if (dueDays > 3 || dueDays <= 0) return null; // Mostra apenas entre 1 e 3 dias restantes

    return (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6 mx-4 lg:mx-8 mt-4 flex items-center justify-between shadow-sm rounded-r-lg">
            <div className="flex items-center">
                <AlertTriangle className="text-orange-500 mr-3" size={24} />
                <div>
                    <p className="font-bold text-orange-800">Atenção: Sua assinatura vence em {dueDays} dia(s)!</p>
                    <p className="text-sm text-orange-700">Evite o bloqueio do sistema regularizando seu pagamento.</p>
                </div>
            </div>
            <button
                onClick={() => onNavigate('payment')}
                className="px-4 py-2 bg-orange-100 text-orange-700 font-bold rounded hover:bg-orange-200 transition-colors text-sm"
            >
                Regularizar Agora
            </button>
        </div>
    );
}
