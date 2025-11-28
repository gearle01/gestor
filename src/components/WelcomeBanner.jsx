import React from 'react';
import { Gift, X, ArrowRight } from 'lucide-react';

export default function WelcomeBanner({ onClose, onSubscribe }) {
    return (
        // 👇 MUDEI AQUI: De 'indigo/purple' para 'blue-600/blue-800'
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 mx-4 lg:mx-8 mt-4 rounded-xl shadow-lg relative animate-in slide-in-from-top-2">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="bg-white/20 p-3 rounded-full hidden sm:block">
                    <Gift size={32} className="text-white" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-xl">Bem-vindo ao Gestor!</h3>
                    {/* 👇 Ajustei os textos secundários para blue-100 */}
                    <p className="text-blue-100 text-sm mt-1 mb-3">
                        Você tem <span className="font-bold text-white">15 dias grátis</span>.
                        Mas você pode garantir seu desconto exclusivo de primeira compra agora mesmo!
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-white/10 border border-white/20 rounded-lg p-2 px-3">
                            <span className="text-xs uppercase text-blue-200 mr-2">Cupom:</span>
                            <span className="font-mono font-bold text-white tracking-widest">PRIMEIRA8</span>
                        </div>

                        <button
                            onClick={onSubscribe}
                            // 👇 Botão agora tem texto azul para combinar
                            className="bg-white text-blue-700 hover:bg-blue-50 font-bold py-2 px-4 rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-2 text-sm"
                        >
                            Assinar por R$ 1,99 <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}
