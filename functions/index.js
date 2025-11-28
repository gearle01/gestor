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

// 1. Criar Assinatura de Cartão (STRIPE) - COM SUPORTE A CUPOM
exports.createStripeSubscription = onCall({ secrets: [stripeSecret] }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login necessário.');

    const stripe = require('stripe')(stripeSecret.value());
    const uid = request.auth.uid;
    // 👇 Recebe o couponCode do frontend
    const { token, email, planId, couponCode } = request.data;

    try {
        const customer = await stripe.customers.create({
            email: email,
            source: token,
            metadata: { firebaseUid: uid }
        });

        // Configuração da assinatura
        const subParams = {
            customer: customer.id,
            items: [{ price: planId }],
            expand: ['latest_invoice.payment_intent'],
        };

        // 👇 Se tiver cupom, adiciona aos parâmetros
        if (couponCode) {
            // Verifica se é um código de promoção (Promotion Code) ou Cupom direto
            // Aqui assumimos que você está enviando o ID do cupom ou o código promocional
            // Para simplificar, vamos tentar aplicar como cupom direto:
            subParams.coupon = couponCode;
        }

        const subscription = await stripe.subscriptions.create(subParams);

        // Libera o acesso (mantém a lógica de 30 dias que você já tinha)
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
        // Retorna erro amigável se o cupom for inválido
        throw new HttpsError('internal', error.message);
    }
});

// 2. Gerar PIX (MERCADO PAGO) - COM LÓGICA DE CUPOM
exports.generatePixCharge = onCall({ secrets: [mpAccessToken] }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login necessário.');

    const client = new MercadoPagoConfig({ accessToken: mpAccessToken.value() });
    const payment = new Payment(client);

    const uid = request.auth.uid;

    // 👇 1. MUDANÇA: Agora aceitamos também o 'couponCode'
    const { email, couponCode } = request.data;

    // 👇 2. MUDANÇA: Removemos o 'const FIXED_AMOUNT_REAIS = 9.99'
    // E criamos uma variável que pode mudar SE o cupom for válido.
    let amount = 9.99; // Preço padrão continua sendo 9.99

    // O Backend verifica o cupom. Isso é seguro!
    // O usuário não escolhe o preço, ele só apresenta um cupom.
    if (couponCode === 'PRIMEIRA8') {
        amount = 1.99; // O próprio servidor autoriza o desconto
    }

    try {
        const body = {
            transaction_amount: amount, // 👇 Usa a variável 'amount' (1.99 ou 9.99)
            description: `Assinatura Sistema (Mensal) ${couponCode ? '- Promo' : ''}`,
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
        // ✅ COMO DEVE FICAR:
        if (event.type === 'customer.subscription.deleted' || event.type === 'invoice.payment_failed') {
            await db.doc(getUserProfilePath(uid)).set({
                isPaid: false,
                // ADICIONE ESTA LINHA ABAIXO: 👇
                paymentDueDate: admin.firestore.Timestamp.now(),
                dueDays: 0
            }, { merge: true });
            console.log(`❌ Assinatura Stripe cancelada/falhou: ${uid}`);
        }
    }
    res.json({ received: true });
});