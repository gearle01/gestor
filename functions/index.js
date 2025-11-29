const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { MercadoPagoConfig, Payment } = require('mercadopago');

// Inicializa o Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Segredos
const stripeSecret = defineSecret("STRIPE_SECRET");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const mpAccessToken = defineSecret("MP_ACCESS_TOKEN");

// Constantes do Projeto
const PROJECT_ID = 'gestor-25758';
const APP_ID = 'gestor-6040299391d8ecfb5972a8ade78c88bde8f50bdd';
const APPDATA_PATH = 'artifacts';

// Helpers de Caminho
const getUserPaymentHistoryPath = (uid) => `${APPDATA_PATH}/${APP_ID}/users/${uid}/payments/history`;
const getUserProfilePath = (uid) => `${APPDATA_PATH}/${APP_ID}/users/${uid}/settings/profile`;

// 🎟️ FUNÇÃO 1: Verificar e gerar cupom para novo usuário
exports.getFirstPurchaseCoupon = onCall({ secrets: [stripeSecret] }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Usuário não autenticado');

    const stripe = require('stripe')(stripeSecret.value());
    const uid = request.auth.uid;

    try {
        // 1. Verificar se o usuário já tem um pagamento registrado (usando o caminho que você pediu)
        const userPaymentRef = db.doc(getUserPaymentHistoryPath(uid));
        const userPaymentSnap = await userPaymentRef.get();

        // Se o usuário já tem histórico de pagamento, retorna nulo (sem cupom)
        if (userPaymentSnap.exists && userPaymentSnap.data().couponUsed === true) {
            return {
                success: true,
                coupon: null,
                message: 'Cupom já foi utilizado para este usuário'
            };
        }

        // 2. Se é primeira vez, verifica se cupom existe no Stripe
        try {
            await stripe.coupons.retrieve('PRIMEIRA8');
            return {
                success: true,
                coupon: 'PRIMEIRA8',
                message: 'Cupom válido para primeira compra'
            };
        } catch (error) {
            // Se cupom não existe, cria um novo
            await stripe.coupons.create({
                id: 'PRIMEIRA8',
                percent_off: 80, // 80% de desconto
                duration: 'repeating',
                duration_in_months: 1,
                max_redemptions: 999
            });

            return {
                success: true,
                coupon: 'PRIMEIRA8',
                message: 'Cupom criado e aplicado'
            };
        }

    } catch (error) {
        console.error('Erro ao gerar cupom:', error);
        throw new HttpsError('internal', 'Erro ao processar cupom');
    }
});

// 🎟️ FUNÇÃO 2: Registrar uso do cupom
exports.markCouponAsUsed = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Usuário não autenticado');

    const uid = request.auth.uid;
    const { subscriptionId, amount } = request.data;

    try {
        await db.doc(getUserPaymentHistoryPath(uid)).set({
            couponUsed: true,
            couponUsedAt: admin.firestore.FieldValue.serverTimestamp(),
            subscriptionId: subscriptionId || null,
            firstPaymentAmount: amount || null,
            paymentMethod: 'stripe'
        }, { merge: true });

        return { success: true, message: 'Cupom registrado como utilizado' };
    } catch (error) {
        console.error('Erro ao marcar cupom:', error);
        throw new HttpsError('internal', 'Erro ao registrar cupom');
    }
});

// 💳 FUNÇÃO 3: Criar assinatura com cupom (Stripe)
exports.createStripeSubscription = onCall({ secrets: [stripeSecret] }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Usuário não autenticado');

    const stripe = require('stripe')(stripeSecret.value());
    const uid = request.auth.uid;
    const { token, email, planId, couponCode } = request.data;

    if (!token || !email || !planId) {
        throw new HttpsError('invalid-argument', 'Dados obrigatórios faltando');
    }

    try {
        // 1. Verificar se cupom já foi usado por este usuário
        let applyCoupon = null;

        if (couponCode) {
            const userPaymentSnap = await db.doc(getUserPaymentHistoryPath(uid)).get();
            // Se NÃO existe ou NÃO usou cupom, aplica
            if (!userPaymentSnap.exists || !userPaymentSnap.data().couponUsed) {
                applyCoupon = couponCode;
            }
        }

        // 2. Criar ou buscar cliente Stripe
        let customer;
        const existingCustomers = await stripe.customers.list({ email: email, limit: 1 });

        if (existingCustomers.data.length > 0) {
            customer = existingCustomers.data[0];
        } else {
            customer = await stripe.customers.create({
                email: email,
                metadata: { firebaseUID: uid }
            });
        }

        // 3. Criar fonte de pagamento
        const paymentMethod = await stripe.paymentMethods.create({
            type: 'card',
            card: { token: token }
        });

        await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });

        // 4. Criar assinatura
        const subscriptionParams = {
            customer: customer.id,
            items: [{ price: planId }],
            default_payment_method: paymentMethod.id,
            metadata: { firebaseUID: uid }
        };

        if (applyCoupon) {
            subscriptionParams.coupon = applyCoupon;
        }

        const subscription = await stripe.subscriptions.create(subscriptionParams);

        // 5. Registrar cupom como usado NO BANCO DE DADOS
        if (applyCoupon) {
            await db.doc(getUserPaymentHistoryPath(uid)).set({
                couponUsed: true,
                couponCode: applyCoupon,
                couponUsedAt: admin.firestore.FieldValue.serverTimestamp(),
                subscriptionId: subscription.id,
                customerId: customer.id,
                firstPaymentAmount: subscription.items.data[0].price.unit_amount / 100,
                paymentMethod: 'stripe'
            }, { merge: true });
        }

        // 6. Atualizar perfil do usuário
        await db.doc(getUserProfilePath(uid)).set({
            isPaid: true,
            paymentMethod: 'stripe',
            customerId: customer.id,
            subscriptionId: subscription.id,
            paymentDate: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return {
            success: true,
            subscriptionId: subscription.id,
            couponApplied: !!applyCoupon,
            message: applyCoupon ? 'Assinatura criada com cupom!' : 'Assinatura criada com sucesso!'
        };

    } catch (error) {
        console.error('Erro ao criar assinatura:', error);
        throw new HttpsError('internal', error.message || 'Erro ao processar pagamento');
    }
});

// 💠 FUNÇÃO 4: Gerar PIX (Mercado Pago) - Adaptado para nova lógica de cupom
exports.generatePixCharge = onCall({ secrets: [mpAccessToken] }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login necessário.');

    const client = new MercadoPagoConfig({ accessToken: mpAccessToken.value() });
    const payment = new Payment(client);
    const uid = request.auth.uid;
    const { email, couponCode } = request.data;

    // Verificar cupom usando a mesma lógica do Stripe
    let amount = 9.99;
    let couponApplied = false;

    if (couponCode === 'PRIMEIRA8') {
        const userPaymentSnap = await db.doc(getUserPaymentHistoryPath(uid)).get();
        if (!userPaymentSnap.exists || !userPaymentSnap.data().couponUsed) {
            amount = 1.99;
            couponApplied = true;
        }
    }

    try {
        const body = {
            transaction_amount: amount,
            description: `Assinatura Sistema${couponApplied ? ' - Promo 1ª Compra' : ''}`,
            payment_method_id: 'pix',
            payer: { email: email },
            metadata: {
                firebase_uid: uid,
                coupon_applied: couponApplied,
                coupon_code: couponApplied ? couponCode : null
            },
            notification_url: `https://us-central1-${PROJECT_ID}.cloudfunctions.net/handleMercadoPagoWebhook`
        };

        const result = await payment.create({ body });
        const pointOfInteraction = result.point_of_interaction.transaction_data;

        return {
            qrCodeBase64: pointOfInteraction.qr_code_base64,
            pixCode: pointOfInteraction.qr_code,
            paymentId: result.id,
            couponApplied: couponApplied,
            amount: amount
        };

    } catch (error) {
        console.error("Erro Mercado Pago:", error);
        throw new HttpsError('internal', error.message || 'Erro ao gerar Pix');
    }
});

// 🔔 WEBHOOKS (Mercado Pago e Stripe)
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
            const couponApplied = paymentData.metadata.coupon_applied === true;

            if (uid) {
                // Atualizar perfil
                const newDate = new Date();
                newDate.setDate(newDate.getDate() + 30);
                await db.doc(getUserProfilePath(uid)).set({
                    isPaid: true,
                    paymentDueDate: admin.firestore.Timestamp.fromDate(newDate),
                    dueDays: 30,
                    paymentMethod: 'pix_mercadopago'
                }, { merge: true });

                // Registrar uso do cupom se aplicável
                if (couponApplied) {
                    await db.doc(getUserPaymentHistoryPath(uid)).set({
                        couponUsed: true,
                        couponCode: paymentData.metadata.coupon_code,
                        couponUsedAt: admin.firestore.FieldValue.serverTimestamp(),
                        paymentMethod: 'pix_mercadopago'
                    }, { merge: true });
                }
                console.log(`✅ PIX MP aprovado: ${uid}`);
            }
        }
    } catch (error) {
        console.error("Erro Webhook MP:", error);
    }
    res.status(200).send('OK');
});

exports.handleStripeWebhook = onRequest({ secrets: [stripeSecret, stripeWebhookSecret] }, async (req, res) => {
    const stripe = require('stripe')(stripeSecret.value());
    let event;

    try {
        const signature = req.headers['stripe-signature'];
        event = stripe.webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret.value());
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const object = event.data.object;
    let uid;

    if (object.customer) {
        try {
            const customer = await stripe.customers.retrieve(object.customer);
            uid = customer.metadata.firebaseUid;
        } catch (e) { console.log('Cliente Stripe não encontrado'); }
    }

    if (uid) {
        if (event.type === 'invoice.payment_succeeded') {
            const newDate = new Date();
            newDate.setDate(newDate.getDate() + 30);
            await db.doc(getUserProfilePath(uid)).set({
                isPaid: true,
                paymentDueDate: admin.firestore.Timestamp.fromDate(newDate),
                dueDays: 30
            }, { merge: true });
        }
        if (event.type === 'customer.subscription.deleted' || event.type === 'invoice.payment_failed') {
            await db.doc(getUserProfilePath(uid)).set({
                isPaid: false,
                paymentDueDate: admin.firestore.Timestamp.now(),
                dueDays: 0
            }, { merge: true });
        }
    }
    res.json({ received: true });
});