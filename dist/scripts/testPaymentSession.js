"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const data_source_1 = require("../data-source");
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'Admin@123';
const PLAN_ID = '555079c7-e50d-4424-8437-17b1f956ae23';
async function run() {
    try {
        if (!data_source_1.AppDataSource.isInitialized) {
            await data_source_1.AppDataSource.initialize();
        }
        const loginRes = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/login')
            .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
        if (!loginRes.body?.success) {
            console.error('Login failed', loginRes.body);
            return;
        }
        const token = loginRes.body.data.token;
        console.log('Obtained admin token');
        const sessionRes = await (0, supertest_1.default)(app_1.default)
            .post('/api/subscriptions/payments/session')
            .set('Authorization', `Bearer ${token}`)
            .send({
            planId: PLAN_ID,
            billingCycle: 'monthly',
            nodeCount: 0,
        });
        console.log('Payment session response:', JSON.stringify(sessionRes.body, null, 2));
    }
    catch (error) {
        console.error('Test payment session failed:', error);
    }
    finally {
        if (data_source_1.AppDataSource.isInitialized) {
            await data_source_1.AppDataSource.destroy();
        }
    }
}
run();
