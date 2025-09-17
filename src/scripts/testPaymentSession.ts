import 'reflect-metadata';
import request from 'supertest';
import app from '../app';
import { AppDataSource } from '../data-source';

const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'Admin@123';
const PLAN_ID = '555079c7-e50d-4424-8437-17b1f956ae23';

async function run() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    if (!loginRes.body?.success) {
      console.error('Login failed', loginRes.body);
      return;
    }

    const token = loginRes.body.data.token;
    console.log('Obtained admin token');

    const sessionRes = await request(app)
      .post('/api/subscriptions/payments/session')
      .set('Authorization', `Bearer ${token}`)
      .send({
        planId: PLAN_ID,
        billingCycle: 'monthly',
        nodeCount: 0,
      });

    console.log('Payment session response:', JSON.stringify(sessionRes.body, null, 2));
  } catch (error) {
    console.error('Test payment session failed:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

run();
