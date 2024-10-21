import { Injectable } from '@nestjs/common';
import { envs } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto';
import { Request, Response } from 'express';

@Injectable()
export class PaymentsService {

    private readonly stripe = new Stripe(
        envs.stripeSecret
    )

    async createPaymentSession(paymentSessionDto: PaymentSessionDto) {

        const { currency, items, orderId } = paymentSessionDto

        const lineItems = items.map(item => {
            return {
                price_data: {
                    currency: currency,
                    product_data: {
                        name: item.name,
                    },
                    unit_amount: Math.round(item.price * 100), // 20 dolares el numero se envia sin decimales.
                },
                quantity: item.quantity,
            }
        })

        const session = await this.stripe.checkout.sessions.create({
            //colocar aqui el id de mi orden
            payment_intent_data: {
                metadata: {
                    orderId
                }
            },

            line_items: lineItems,
            mode: 'payment',
            success_url: envs.stripeSuccessUrl,
            cancel_url: envs.stripeCancelUrl,
        })

        return session
    }

    async stripeWebhook(req: Request, res: Response) {
        const sig = req.headers['stripe-signature']

        let event: Stripe.Event
        const endpointSecret = envs.stripeEndpointSecret

        try {
            event = this.stripe.webhooks.constructEvent(req['rawBody'], sig, endpointSecret)
        } catch (err) {
            res.status(400).send(`Webhook Error: ${err.message}`)
            return
        }

        switch (event.type) {
            case 'charge.succeeded':
                const chargeSucceded = event.data.object;
                //TODO llamar nuestro microservicio

                console.log({
                    metadata: chargeSucceded.metadata,
                    orderId: chargeSucceded.metadata.orderId
                })
                break;

            default:
                console.log(`Evento ${event.type} not handled.`)
        }

        return res.status(200).json({ sig })
    }

}
