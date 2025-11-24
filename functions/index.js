// Adicione HttpsError na importação
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

// Inicializa o Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Definição dos Segredos
const stripeSecret = defineSecret("STRIPE_SECRET");
const webhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// --- CONFIGURAÇÕES DO SEU APP ---
const APP_ID = 'gestor-6040299391d8ecfb5972a8ade78c88bde8f50bdd';
const APPDATA_PATH = 'artifacts';

const getUserProfilePath = (uid) => `${APPDATA_PATH}/${APP_ID}/users/${uid}/settings/profile`;

// 1. Criar Assinatura de Cartão (Sintaxe V2)
exports.createStripeSubscription = onCall({ secrets: [stripeSecret] }, async (request) => {
    // Na V2, 'data' e 'auth' vêm dentro do objeto 'request'
    if (!request.auth) {
        throw new https.HttpsError('unauthenticated', 'Login necessário.');
    }

    const stripe = require('stripe')(stripeSecret.value());
    const uid = request.auth.uid;
    const { token, email, planId } = request.data;

    try {
        const customer = await stripe.customers.create({
            email: email,
            source: token,
            metadata: { firebaseUid: uid }
        });

        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: planId }],
            expand: ['latest_invoice.payment_intent'],
        });

        await db.doc(getUserProfilePath(uid)).set({
            stripeCustomerId: customer.id,
            stripeSubscriptionId: subscription.id,
            paymentMethod: 'credit_card'
        }, { merge: true });

        return { subscriptionId: subscription.id, success: true };
    } catch (error) {
        console.error("Erro ao criar assinatura:", error);
        // Na V2, HttpsError deve ser importado ou usado via require se necessário, 
        // mas lançar erro normal também funciona e retorna INTERNAL para o cliente
        throw new Error(error.message);
    }
});

// 2. Gerar PIX (Versão Corrigida e Nativa)
exports.generatePixCharge = onCall({ secrets: [stripeSecret] }, async (request) => {
    if (!request.auth) {
        throw new Error('Login necessário.');
    }

    const stripe = require('stripe')(stripeSecret.value());
    const uid = request.auth.uid;
    const { amount } = request.data;

    try {
        // Criamos e confirmamos a intenção de pagamento imediatamente
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'brl',
            payment_method_types: ['pix'],
            payment_method_data: { type: 'pix' },
            confirm: true, // Isso força a geração do QR Code agora
            // O return_url é obrigatório para confirmar, mas não será usado pois vamos exibir o QR Code na tela
            return_url: 'https://checkout.stripe.com/pay',
            metadata: { firebaseUid: uid },
        });

        // A estrutura de resposta do Pix nativo fica em 'next_action.pix_display_qr_code'
        const pixData = paymentIntent.next_action.pix_display_qr_code;

        return {
            qrCodeUrl: pixData.image_url_png, // URL da imagem gerada pelo Stripe
            pixCode: pixData.data            // O código "Copia e Cola"
        };
    } catch (error) {
        console.error("Erro ao gerar Pix:", error);
        throw new Error(error.message);
    }
});

// 3. O Webhook (Sintaxe V2)
exports.handleStripeWebhook = onRequest({ secrets: [stripeSecret, webhookSecret] }, async (req, res) => {
    const stripe = require('stripe')(stripeSecret.value());
    let event;

    try {
        const signature = req.headers['stripe-signature'];
        event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret.value());
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const object = event.data.object;
    let uid;

    if (object.customer) {
        try {
            const customer = await stripe.customers.retrieve(object.customer);
            uid = customer.metadata.firebaseUid;
        } catch (e) {
            console.log('Cliente não encontrado');
        }
    } else if (object.metadata && object.metadata.firebaseUid) {
        uid = object.metadata.firebaseUid;
    }

    if (uid) {
        if (event.type === 'invoice.payment_succeeded' || event.type === 'payment_intent.succeeded') {
            const newDate = new Date();
            newDate.setDate(newDate.getDate() + 30);

            await db.doc(getUserProfilePath(uid)).set({
                isPaid: true,
                paymentDueDate: admin.firestore.Timestamp.fromDate(newDate),
                dueDays: 30
            }, { merge: true });

            console.log(`Pagamento confirmado para usuário ${uid}.`);
        }

        if (event.type === 'customer.subscription.deleted') {
            await db.doc(getUserProfilePath(uid)).set({
                isPaid: false,
                dueDays: 0
            }, { merge: true });
        }
    }

    res.json({ received: true });
});