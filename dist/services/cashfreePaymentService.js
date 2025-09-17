"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cashfreePaymentService = exports.CashfreePaymentService = void 0;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("../config/environment");
const loggerService_1 = require("./loggerService");
class CashfreePaymentService {
    constructor() {
        this.apiVersion = environment_1.env.CASHFREE_API_VERSION;
        this.baseUrl =
            environment_1.env.CASHFREE_ENVIRONMENT === 'PRODUCTION'
                ? 'https://api.cashfree.com/pg'
                : 'https://sandbox.cashfree.com/pg';
    }
    async createOrder(payload) {
        if (!environment_1.env.CASHFREE_CLIENT_ID || !environment_1.env.CASHFREE_CLIENT_SECRET) {
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
                return_url: payload.returnUrl ||
                    `${environment_1.env.CASHFREE_RETURN_URL}?order_id={order_id}`,
            },
            order_tags: payload.orderTags,
        };
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/orders`, body, {
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'x-api-version': this.apiVersion,
                    'x-client-id': environment_1.env.CASHFREE_CLIENT_ID,
                    'x-client-secret': environment_1.env.CASHFREE_CLIENT_SECRET,
                },
                timeout: environment_1.env.EXTERNAL_API_TIMEOUT,
            });
            return response.data;
        }
        catch (error) {
            const responseData = error?.response?.data;
            loggerService_1.logger.error('Cashfree order creation failed', {
                error: responseData || error.message,
            });
            throw new Error(responseData?.message || 'Failed to create Cashfree payment session');
        }
    }
    async getOrder(orderId) {
        if (!environment_1.env.CASHFREE_CLIENT_ID || !environment_1.env.CASHFREE_CLIENT_SECRET) {
            throw new Error('Cashfree credentials are not configured.');
        }
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/orders/${orderId}`, {
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'x-api-version': this.apiVersion,
                    'x-client-id': environment_1.env.CASHFREE_CLIENT_ID,
                    'x-client-secret': environment_1.env.CASHFREE_CLIENT_SECRET,
                },
                timeout: environment_1.env.EXTERNAL_API_TIMEOUT,
            });
            return response.data;
        }
        catch (error) {
            const responseData = error?.response?.data;
            loggerService_1.logger.warn('Cashfree get order failed', {
                orderId,
                error: responseData || error.message,
            });
            throw new Error(responseData?.message || 'Failed to fetch Cashfree order');
        }
    }
}
exports.CashfreePaymentService = CashfreePaymentService;
exports.cashfreePaymentService = new CashfreePaymentService();
