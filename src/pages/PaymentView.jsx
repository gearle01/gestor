import React, { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { CreditCard, QrCode, CheckCircle, AlertTriangle, Loader2, Tag } from 'lucide-react';

export default function PaymentView({ user }) {
    const stripe = useStripe();
    const elements = useElements();
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [pixData, setPixData] = useState(null);

    // 🔥 CONFIGURAÇÃO DO CUPOM AUTOMÁTICO 🔥
    const [coupon, setCoupon] = useState('PRIMEIRA8');

    // ⬇️ CONFIGURAÇÕES ⬇️
    const STRIPE_PLAN_ID = 'price_1SX2Kg2UNhTPKWTwta3RPfLI';
    const PIX_AMOUNT_DISPLAY = "R$ 9,99";

    if (!user || !user.uid || !user.email) {
        return (
            <div className="flex items-center justify-center h-full text-red-600 p-4">
                <AlertTriangle className="mr-2" />
                <span className="font-bold">Erro de Segurança: Usuário não autenticado. Faça login novamente.</span>
            </div>
        );
    }

    useEffect(() => {
        if (user && user.isPaid === true && user.paymentMethod) {
            setSuccess(true);
            setPixData(null);
        }
    }, [user]);

    const handleCardSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        if (!user?.uid) {
            setError("Sessão inválida. Recarregue a página.");
            setLoading(false);
            return;
        }

        if (!stripe || !elements) { setLoading(false); return; }
        const cardElement = elements.getElement(CardElement);
        try {
            const { error, token } = await stripe.createToken(cardElement);
            if (error) { setError(error.message); setLoading(false); return; }

            const createSubscription = httpsCallable(functions, 'createStripeSubscription');
            const response = await createSubscription({
                token: token.id,
                email: user.email,
                uid: user.uid,
                planId: STRIPE_PLAN_ID,
                couponCode: coupon // 👇 Envia o cupom automático
            });
            if (response.data.success) {
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
            const response = await generatePix({ email: user.email, couponCode: coupon });

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
                    {/* 👇 VISUALIZAÇÃO DO CUPOM APLICADO */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex items-start gap-3">
                        <Tag className="text-green-600 mt-1" size={20} />
                        <div>
                            <p className="font-bold text-green-800 text-sm">Cupom de Primeira Compra Ativo!</p>
                            <p className="text-green-700 text-xs mt-1">
                                O código <span className="font-mono bg-white px-1 rounded border border-green-300">{coupon}</span> foi aplicado.
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-gray-400 line-through text-sm">R$ 9,99</span>
                                <span className="font-bold text-lg text-green-700">R$ 1,99</span>
                                <span className="text-xs text-green-600 font-medium bg-white px-2 py-0.5 rounded-full border border-green-200">1º Mês</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50"><CardElement options={{ style: { base: { fontSize: '16px' } } }} /></div>
                    <button type="submit" disabled={!stripe || loading} className="w-full py-3 bg-azuri-600 text-white rounded-lg font-bold hover:bg-azuri-700 transition-colors">
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Assinar Agora (R$ 1,99)'}
                    </button>
                    <p className="text-xs text-center text-gray-400">Após o primeiro mês, o valor volta para R$ 9,99/mês.</p>
                </form>
            ) : (
                <div className="text-center space-y-6">
                    {/* 👇 MOSTRA O CUPOM TAMBÉM NA ABA DO PIX (VISUAL) */}
                    {coupon === 'PRIMEIRA8' && !pixData && (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200 mb-4 inline-block w-full text-left">
                            <p className="font-bold text-green-800 text-sm flex items-center gap-2">
                                <Tag size={16} /> Cupom Aplicado no PIX!
                            </p>
                            <p className="text-green-700 text-xs mt-1">
                                Aproveite o preço promocional de <strong>R$ 1,99</strong>.
                            </p>
                        </div>
                    )}

                    {!pixData ? (
                        <button onClick={handlePixGenerate} disabled={loading} className="w-full py-3 bg-azuri-600 text-white rounded-lg font-bold hover:bg-azuri-700 transition-colors">
                            {/* 👇 O botão agora mostra o valor correto (1,99 ou 9,99) */}
                            {loading ? <Loader2 className="animate-spin mx-auto" /> : `Gerar PIX (${coupon === 'PRIMEIRA8' ? "R$ 1,99" : "R$ 9,99"})`}
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