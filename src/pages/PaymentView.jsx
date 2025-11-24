import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { CreditCard, QrCode, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function PaymentView({ user }) {
    const stripe = useStripe();
    const elements = useElements();
    const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' or 'pix'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [pixData, setPixData] = useState(null);

    const handleCardSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        if (!stripe || !elements) {
            setLoading(false);
            return;
        }

        const cardElement = elements.getElement(CardElement);

        try {
            const { error, token } = await stripe.createToken(cardElement);

            if (error) {
                setError(error.message);
                setLoading(false);
                return;
            }

            const createSubscription = httpsCallable(functions, 'createStripeSubscription');
            const response = await createSubscription({ token: token.id, email: user.email, uid: user.uid });

            if (response.data.success) {
                setSuccess(true);
            } else {
                setError(response.data.message || 'Erro ao processar assinatura.');
            }
        } catch (err) {
            console.error(err);
            setError('Erro interno ao processar pagamento.');
        }
        setLoading(false);
    };

    const handlePixGenerate = async () => {
        setLoading(true);
        setError(null);
        setPixData(null);

        try {
            const generatePix = httpsCallable(functions, 'generatePixCharge');
            const response = await generatePix({ email: user.email, uid: user.uid });

            if (response.data.success) {
                setPixData(response.data);
            } else {
                setError(response.data.message || 'Erro ao gerar Pix.');
            }
        } catch (err) {
            console.error(err);
            setError('Erro ao conectar com servidor.');
        }
        setLoading(false);
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Pagamento Confirmado!</h2>
                <p className="text-gray-600 mb-6">Sua assinatura está ativa. O acesso foi liberado.</p>
                <button onClick={() => window.location.reload()} className="px-6 py-2 bg-azuri-600 text-white rounded-lg font-medium hover:bg-azuri-700 transition-colors">
                    Atualizar Sistema
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100 my-8">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Regularize sua Assinatura</h2>
                <p className="text-gray-500 mt-2">Escolha uma forma de pagamento para continuar usando o sistema.</p>
            </div>

            <div className="flex gap-4 mb-8 justify-center">
                <button
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 transition-all ${paymentMethod === 'card'
                            ? 'border-azuri-600 bg-azuri-50 text-azuri-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                >
                    <CreditCard size={20} />
                    Cartão de Crédito (Recorrente)
                </button>
                <button
                    onClick={() => setPaymentMethod('pix')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 transition-all ${paymentMethod === 'pix'
                            ? 'border-azuri-600 bg-azuri-50 text-azuri-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                >
                    <QrCode size={20} />
                    Pix (Avulso)
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                    <AlertTriangle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {paymentMethod === 'card' ? (
                <form onSubmit={handleCardSubmit} className="space-y-6">
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <CardElement
                            options={{
                                style: {
                                    base: {
                                        fontSize: '16px',
                                        color: '#424770',
                                        '::placeholder': { color: '#aab7c4' },
                                    },
                                    invalid: { color: '#9e2146' },
                                },
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!stripe || loading}
                        className="w-full py-3 bg-azuri-600 text-white rounded-lg font-bold hover:bg-azuri-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Assinar Agora'}
                    </button>
                </form>
            ) : (
                <div className="text-center space-y-6">
                    {!pixData ? (
                        <button
                            onClick={handlePixGenerate}
                            disabled={loading}
                            className="w-full py-3 bg-azuri-600 text-white rounded-lg font-bold hover:bg-azuri-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Gerar Cobrança Pix'}
                        </button>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="p-4 bg-white border border-gray-200 rounded-lg inline-block">
                                <img src={pixData.qrCodeUrl} alt="QR Code Pix" className="w-48 h-48 mx-auto" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-gray-500 font-medium">Código Copia e Cola</p>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        value={pixData.pixCode}
                                        className="flex-1 p-2 bg-gray-100 rounded border border-gray-200 text-xs font-mono"
                                    />
                                    <button
                                        onClick={() => navigator.clipboard.writeText(pixData.pixCode)}
                                        className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 text-sm font-medium"
                                    >
                                        Copiar
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-azuri-600 bg-azuri-50 p-3 rounded-lg">
                                Após o pagamento, aguarde alguns instantes e recarregue a página.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
