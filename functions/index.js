const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { MercadoPagoConfig, Payment } = require('mercadopago');

// Inicializa o Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Segredos (Stripe + Mercado Pago)
const stripeSecret = defineSecret("STRIPE_SECRET");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET"); // Necessário para renovação
const mpAccessToken = defineSecret("MP_ACCESS_TOKEN");

// --- CONFIGURAÇÕES ---
const PROJECT_ID = 'gestor-25758';
const APP_ID = 'gestor-6040299391d8ecfb5972a8ade78c88bde8f50bdd';
const APPDATA_PATH = 'artifacts';

const getUserProfilePath = (uid) => `${APPDATA_PATH}/${APP_ID}/users/${uid}/settings/profile`;

// 1. Criar Assinatura de Cartão (STRIPE)
exports.createStripeSubscription = onCall({ secrets: [stripeSecret] }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login necessário.');

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

        // Libera o primeiro mês imediatamente
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + 30);

        await db.doc(getUserProfilePath(uid)).set({
            stripeCustomerId: customer.id,
            stripeSubscriptionId: subscription.id,
            paymentMethod: 'credit_card',
            isPaid: true,
            paymentDueDate: admin.firestore.Timestamp.fromDate(newDate),
            dueDays: 30
        }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error("Erro Stripe:", error);
        throw new HttpsError('internal', error.message);
    }
});

// 2. Gerar PIX (MERCADO PAGO)
// 2. Gerar PIX (MERCADO PAGO) - VERSÃO SEGURA
exports.generatePixCharge = onCall({ secrets: [mpAccessToken] }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login necessário.');

    const client = new MercadoPagoConfig({ accessToken: mpAccessToken.value() });
    const payment = new Payment(client);

    const uid = request.auth.uid;
    const { email } = request.data;

    // 🔒 SEGURANÇA: O preço é definido AQUI no backend, não vem do frontend.
    const FIXED_AMOUNT_REAIS = 9.99; // R$ 9,99

    try {
        const body = {
            transaction_amount: FIXED_AMOUNT_REAIS,
            description: 'Assinatura Sistema (Mensal)',
            payment_method_id: 'pix',
            payer: {
                email: email
            },
            metadata: {
                firebase_uid: uid
            },
            notification_url: `https://us-central1-${PROJECT_ID}.cloudfunctions.net/handleMercadoPagoWebhook`
        };

        const result = await payment.create({ body });

        const pointOfInteraction = result.point_of_interaction.transaction_data;

        return {
            qrCodeBase64: pointOfInteraction.qr_code_base64,
            pixCode: pointOfInteraction.qr_code,
            paymentId: result.id
        };
    } catch (error) {
        console.error("Erro Mercado Pago:", error);
        throw new HttpsError('internal', error.message || 'Erro ao gerar Pix');
    }
});

// 3. Webhook do Mercado Pago (Para PIX)
exports.handleMercadoPagoWebhook = onRequest({ secrets: [mpAccessToken] }, async (req, res) => {
    const type = req.body.type || req.query.type;
    const dataId = req.body.data?.id || req.query['data.id'];

    if (type !== 'payment' || !dataId) return res.status(200).send('OK');

    try {
        const client = new MercadoPagoConfig({ accessToken: mpAccessToken.value() });
        const payment = new Payment(client);
        const paymentData = await payment.get({ id: dataId });

        if (paymentData.status === 'approved') {
            const uid = paymentData.metadata.firebase_uid;
            if (uid) {
                const newDate = new Date();
                newDate.setDate(newDate.getDate() + 30);
                await db.doc(getUserProfilePath(uid)).set({
                    isPaid: true,
                    paymentDueDate: admin.firestore.Timestamp.fromDate(newDate),
                    dueDays: 30,
                    paymentMethod: 'pix_mercadopago'
                }, { merge: true });
                console.log(`✅ PIX MP aprovado: ${uid}`);
            }
        }
    } catch (error) {
        console.error("Erro Webhook MP:", error);
    }
    res.status(200).send('OK');
});

// 4. Webhook do Stripe (Para Renovação de Cartão)
exports.handleStripeWebhook = onRequest({ secrets: [stripeSecret, stripeWebhookSecret] }, async (req, res) => {
    const stripe = require('stripe')(stripeSecret.value());
    let event;

    try {
        const signature = req.headers['stripe-signature'];
        event = stripe.webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret.value());
    } catch (err) {
        console.error(`Webhook Stripe Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const object = event.data.object;
    let uid;

    // Tenta encontrar o UID
    if (object.customer) {
        try {
            const customer = await stripe.customers.retrieve(object.customer);
            uid = customer.metadata.firebaseUid;
        } catch (e) { console.log('Cliente Stripe não encontrado'); }
    }

    if (uid) {
        // Renovação de Assinatura com Sucesso
        if (event.type === 'invoice.payment_succeeded') {
            const newDate = new Date();
            newDate.setDate(newDate.getDate() + 30);

            await db.doc(getUserProfilePath(uid)).set({
                isPaid: true,
                paymentDueDate: admin.firestore.Timestamp.fromDate(newDate),
                dueDays: 30
            }, { merge: true });
            console.log(`✅ Renovação Stripe confirmada: ${uid}`);
        }

        // Cancelamento ou Falha
        if (event.type === 'customer.subscription.deleted' || event.type === 'invoice.payment_failed') {
            await db.doc(getUserProfilePath(uid)).set({
                isPaid: false,
                dueDays: 0
            }, { merge: true });
            console.log(`❌ Assinatura Stripe cancelada/falhou: ${uid}`);
        }
    }
    res.json({ received: true });
});