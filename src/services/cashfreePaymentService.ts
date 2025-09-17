import axios from 'axios';
import { env } from '../config/environment';
import { logger } from './loggerService';

export interface CashfreeOrderPayload {
  orderId: string;
  amount: number;
  currency: string;
  customerId: string;
  customerEmail: string;
  customerPhone?: string;
  customerName?: string;
  returnUrl?: string;
  orderNote?: string;
  orderTags?: Record<string, string>;
}

export interface CashfreeOrderResponse {
  order_id: string;
  cf_order_id: number;
  payment_session_id: string;
  order_token: string;
  order_status: string;
  order_amount: number;
  order_currency: string;
}

export class CashfreePaymentService {
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor() {
    this.apiVersion = env.CASHFREE_API_VERSION;
    this.baseUrl =
      env.CASHFREE_ENVIRONMENT === 'PRODUCTION'
        ? 'https://api.cashfree.com/pg'
        : 'https://sandbox.cashfree.com/pg';
  }

  async createOrder(payload: CashfreeOrderPayload): Promise<CashfreeOrderResponse> {
    if (!env.CASHFREE_CLIENT_ID || !env.CASHFREE_CLIENT_SECRET) {
      throw new Error('Cashfree credentials are not configured.');
    }

    const body = {
      order_id: payload.orderId,
      order_amount: Number(payload.amount.toFixed(2)),
      order_currency: payload.currency,
      order_note: payload.orderNote,
      customer_details: {
        customer_id: payload.customerId,
        customer_email: payload.customerEmail,
        customer_phone: payload.customerPhone || '9999999999',
        customer_name: payload.customerName,
      },
      order_meta: {
        return_url:
          payload.returnUrl ||
          `${env.CASHFREE_RETURN_URL}?order_id={order_id}`,
      },
      order_tags: payload.orderTags,
    };

    try {
      const response = await axios.post<CashfreeOrderResponse>(
        `${this.baseUrl}/orders`,
        body,
        {
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'x-api-version': this.apiVersion,
            'x-client-id': env.CASHFREE_CLIENT_ID,
            'x-client-secret': env.CASHFREE_CLIENT_SECRET,
          },
          timeout: env.EXTERNAL_API_TIMEOUT,
        },
      );

      return response.data;
    } catch (error: any) {
      const responseData = error?.response?.data;
      logger.error('Cashfree order creation failed', {
        error: responseData || error.message,
      });
      throw new Error(
        responseData?.message || 'Failed to create Cashfree payment session',
      );
    }
  }

  async getOrder(orderId: string): Promise<any | null> {
    if (!env.CASHFREE_CLIENT_ID || !env.CASHFREE_CLIENT_SECRET) {
      throw new Error('Cashfree credentials are not configured.');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/orders/${orderId}`, {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-version': this.apiVersion,
          'x-client-id': env.CASHFREE_CLIENT_ID,
          'x-client-secret': env.CASHFREE_CLIENT_SECRET,
        },
        timeout: env.EXTERNAL_API_TIMEOUT,
      });

      return response.data;
    } catch (error: any) {
      const responseData = error?.response?.data;
      logger.warn('Cashfree get order failed', {
        orderId,
        error: responseData || error.message,
      });
      throw new Error(responseData?.message || 'Failed to fetch Cashfree order');
    }
  }

}

export const cashfreePaymentService = new CashfreePaymentService();
