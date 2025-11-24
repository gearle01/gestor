import React, { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { CreditCard, QrCode, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function PaymentView({ user }) {
    const stripe = useStripe();
    const elements = useElements();
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [pixData, setPixData] = useState(null);

    // ⬇️ CONFIGURAÇÕES ⬇️
    const STRIPE_PLAN_ID = 'price_1SX2Kg2UNhTPKWTwta3RPfLI';
    // Atenção: Lógica de segurança está no backend, este valor é apenas ilustrativo se precisar mostrar
    const PIX_AMOUNT_DISPLAY = "R$ 9,99";

    // 🔥 NOVO: Listener Automático de Sucesso 🔥
    // Assim que o 'user' for atualizado pelo App.jsx (via webhook), isso roda:
    useEffect(() => {
        if (user && user.isPaid === true) {
            setSuccess(true);
            setPixData(null); // Limpa o QR Code para mostrar o sucesso
        }
    }, [user]);

    const handleCardSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        if (!stripe || !elements) { setLoading(false); return; }
        const cardElement = elements.getElement(CardElement);
        try {
            const { error, token } = await stripe.createToken(cardElement);
            if (error) { setError(error.message); setLoading(false); return; }

            const createSubscription = httpsCallable(functions, 'createStripeSubscription');
            const response = await createSubscription({
                token: token.id, email: user.email, uid: user.uid, planId: STRIPE_PLAN_ID
            });
            if (response.data.success) {
                // Não precisamos setar success aqui manualmente, 
                // pois o webhook vai atualizar o user e o useEffect acima vai pegar!
                // Mas podemos deixar como fallback.
                setSuccess(true);
            } else {
                setError(response.data.message || 'Erro ao processar assinatura.');
            }
        } catch (err) { console.error(err); setError(err.message); }
        setLoading(false);
    };

    const handlePixGenerate = async () => {
        setLoading(true);
        setError(null);
        setPixData(null);

        try {
            const generatePix = httpsCallable(functions, 'generatePixCharge');
            // Backend define o preço, enviamos apenas email/uid
            const response = await generatePix({ email: user.email });

            if (response.data.pixCode) {
                setPixData(response.data);
            } else {
                setError('Não foi possível gerar o Pix. Tente novamente.');
            }
        } catch (err) {
            console.error("Erro PIX:", err);
            setError(err.message || 'Erro ao conectar com servidor.');
        }
        setLoading(false);
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Pagamento Confirmado!</h2>
                <p className="text-gray-600 mb-6 text-lg">Obrigado! Seu acesso foi renovado com sucesso.</p>
                <div className="text-sm text-gray-400 animate-pulse">
                    Redirecionando para o Dashboard...
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100 my-8">
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Regularize sua Assinatura</h2>

            <div className="flex gap-4 mb-8 justify-center">
                <button onClick={() => setPaymentMethod('card')} className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 ${paymentMethod === 'card' ? 'border-azuri-600 bg-azuri-50 text-azuri-700' : 'border-gray-200'}`}>
                    <CreditCard size={20} /> Cartão (Stripe)
                </button>
                <button onClick={() => setPaymentMethod('pix')} className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 ${paymentMethod === 'pix' ? 'border-azuri-600 bg-azuri-50 text-azuri-700' : 'border-gray-200'}`}>
                    <QrCode size={20} /> Pix (Mercado Pago)
                </button>
            </div>

            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700"><AlertTriangle size={20} /> {error}</div>}

            {paymentMethod === 'card' ? (
                <form onSubmit={handleCardSubmit} className="space-y-6">
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50"><CardElement options={{ style: { base: { fontSize: '16px' } } }} /></div>
                    <button type="submit" disabled={!stripe || loading} className="w-full py-3 bg-azuri-600 text-white rounded-lg font-bold hover:bg-azuri-700 transition-colors">
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Assinar com Cartão'}
                    </button>
                </form>
            ) : (
                <div className="text-center space-y-6">
                    {!pixData ? (
                        <button onClick={handlePixGenerate} disabled={loading} className="w-full py-3 bg-azuri-600 text-white rounded-lg font-bold hover:bg-azuri-700 transition-colors">
                            {loading ? <Loader2 className="animate-spin mx-auto" /> : `Gerar PIX (${PIX_AMOUNT_DISPLAY})`}
                        </button>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <p className="text-green-700 font-semibold bg-green-50 p-2 rounded">Aguardando pagamento... A tela atualizará sozinha!</p>
                            <div className="p-4 bg-white border border-gray-200 rounded-lg inline-block shadow-inner">
                                <img src={`data:image/jpeg;base64,${pixData.qrCodeBase64}`} alt="QR Code Pix" className="w-48 h-48 mx-auto" />
                            </div>
                            <div className="flex gap-2">
                                <input readOnly value={pixData.pixCode} className="flex-1 p-2 bg-gray-100 rounded text-xs font-mono border" />
                                <button onClick={() => navigator.clipboard.writeText(pixData.pixCode)} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded font-medium">Copiar</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}