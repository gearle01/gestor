import React, { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../firebase';
import { CreditCard, QrCode, CheckCircle, AlertTriangle, Loader2, Tag, Zap } from 'lucide-react';

export default function PaymentView({ user }) {
    const stripe = useStripe();
    const elements = useElements();
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [pixData, setPixData] = useState(null);

    // 🔐 NOVO: Estado do cupom seguro
    const [coupon, setCoupon] = useState(null);
    const [couponLoading, setCouponLoading] = useState(true);
    const [couponApplied, setCouponApplied] = useState(false);

    // ⬇️ CONFIGURAÇÕES ⬇️
    const STRIPE_PLAN_ID = 'price_1SX2Kg2UNhTPKWTwta3RPfLI';
    const REGULAR_PRICE = 9.99;
    const DISCOUNT_PRICE = 1.99;

    if (!user || !user.uid || !user.email) {
        return (
            <div className="flex items-center justify-center h-full text-red-600 p-4">
                <AlertTriangle className="mr-2" />
                <span className="font-bold">Erro de Segurança: Usuário não autenticado. Faça login novamente.</span>
            </div>
        );
    }

    // 🔐 NOVO: Carregar cupom do backend (seguro)
    useEffect(() => {
        const loadCoupon = async () => {
            setCouponLoading(true);
            try {
                const getFirstPurchaseCoupon = httpsCallable(functions, 'getFirstPurchaseCoupon');
                const response = await getFirstPurchaseCoupon();

                if (response.data.coupon) {
                    setCoupon(response.data.coupon);
                    setCouponApplied(true);
                } else {
                    setCoupon(null);
                    setCouponApplied(false);
                }
            } catch (error) {
                console.error('Erro ao carregar cupom:', error);
                setCoupon(null);
                setCouponApplied(false);
            } finally {
                setCouponLoading(false);
            }
        };

        loadCoupon();
    }, []);

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
                couponCode: coupon // 🔐 Cupom vem do backend
            });

            if (response.data.success) {
                setSuccess(true);
            } else {
                setError(response.data.message || 'Erro ao processar assinatura.');
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
        setLoading(false);
    };

    const handlePixGenerate = async () => {
        setLoading(true);
        setError(null);
        setPixData(null);

        try {
            const generatePix = httpsCallable(functions, 'generatePixCharge');
            const response = await generatePix({
                email: user.email,
                couponCode: coupon // 🔐 Cupom vem do backend
            });

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
                {couponApplied && (
                    <div className="text-sm text-green-600 mb-4 bg-green-50 p-3 rounded-lg border border-green-200">
                        ✓ Cupom de primeira compra foi aplicado com sucesso!
                    </div>
                )}
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
                <button onClick={() => setPaymentMethod('card')} className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 ${paymentMethod === 'card' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200'}`}>
                    <CreditCard size={20} /> Cartão (Stripe)
                </button>
                <button onClick={() => setPaymentMethod('pix')} className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 ${paymentMethod === 'pix' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200'}`}>
                    <QrCode size={20} /> Pix (Mercado Pago)
                </button>
            </div>

            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700"><AlertTriangle size={20} /> {error}</div>}

            {paymentMethod === 'card' ? (
                <form onSubmit={handleCardSubmit} className="space-y-6">
                    {/* 🔐 CUPOM SEGURO DO BACKEND */}
                    {couponLoading ? (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 animate-pulse flex items-center gap-3">
                            <Loader2 size={20} className="animate-spin text-gray-400" />
                            <span className="text-sm text-gray-600">Verificando cupom...</span>
                        </div>
                    ) : coupon && couponApplied ? (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex items-start gap-3">
                            <Zap className="text-green-600 mt-1 flex-shrink-0" size={24} />
                            <div>
                                <p className="font-bold text-green-800">🎉 Cupom de Primeira Compra Ativo!</p>
                                <p className="text-green-700 text-sm mt-1">
                                    Você receberá <span className="font-bold">80% de desconto</span> no primeiro mês.
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-gray-400 line-through text-sm">R$ {REGULAR_PRICE.toFixed(2)}</span>
                                    <span className="font-bold text-lg text-green-700">R$ {DISCOUNT_PRICE.toFixed(2)}</span>
                                    <span className="text-xs text-green-600 font-medium bg-white px-2 py-0.5 rounded-full border border-green-200">1º Mês</span>
                                </div>
                                <p className="text-xs text-green-600 mt-2">💡 Este cupom só pode ser usado uma vez!</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex items-start gap-3">
                            <Tag className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                            <div>
                                <p className="font-bold text-blue-800">Preço Regular</p>
                                <p className="text-blue-700 text-sm mt-1">
                                    <span className="font-bold text-lg">R$ {REGULAR_PRICE.toFixed(2)}</span> por mês
                                </p>
                                <p className="text-xs text-blue-600 mt-1">Você já utilizou seu cupom de primeira compra.</p>
                            </div>
                        </div>
                    )}

                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
                    </div>

                    <button
                        type="submit"
                        disabled={!stripe || loading || couponLoading}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Processando...
                            </>
                        ) : coupon && couponApplied ? (
                            `Assinar por R$ ${DISCOUNT_PRICE.toFixed(2)}`
                        ) : (
                            `Assinar por R$ ${REGULAR_PRICE.toFixed(2)}`
                        )}
                    </button>

                    <p className="text-xs text-center text-gray-500">
                        {coupon && couponApplied
                            ? `Após o primeiro mês, você será cobrado R$ ${REGULAR_PRICE.toFixed(2)}/mês.`
                            : 'Será cobrado automaticamente a cada mês.'
                        }
                    </p>
                </form>
            ) : (
                <div className="text-center space-y-6">
                    {coupon && couponApplied && (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200 inline-block">
                            <p className="font-bold text-green-800 text-sm flex items-center gap-2 justify-center">
                                <Zap size={16} /> Cupom Aplicado no PIX!
                            </p>
                            <p className="text-green-700 text-xs mt-1">
                                Aproveite o preço promocional de <strong>R$ {DISCOUNT_PRICE.toFixed(2)}</strong>.
                            </p>
                        </div>
                    )}

                    {!pixData ? (
                        <button
                            onClick={handlePixGenerate}
                            disabled={loading || couponLoading}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Gerando...
                                </>
                            ) : (
                                `Gerar PIX (R$ ${coupon && couponApplied ? DISCOUNT_PRICE.toFixed(2) : REGULAR_PRICE.toFixed(2)})`
                            )}
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