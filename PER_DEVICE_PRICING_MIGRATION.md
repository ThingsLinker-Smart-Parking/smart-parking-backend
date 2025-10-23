# Per-Device Pricing Model Migration

## Overview
Migrating from a complex base price + per-node pricing model to a simple per-device pricing model at **$1.5 per device per month**.

## Changes Made

### 1. Database Model Changes

#### SubscriptionPlan Model
**Removed:**
- `basePricePerMonth`
- `basePricePerYear`
- `basePricePerQuarter`
- `pricePerNodePerMonth`
- `pricePerNodePerYear`
- `pricePerNodePerQuarter`

**Added:**
- `pricePerDevicePerMonth: 1.50` (default)
- `pricePerDevicePerYear: 15.00` (default, 16.67% savings)
- `pricePerDevicePerQuarter: 4.00` (default, 11.11% savings)

#### Subscription Model
**Added:**
- `deviceCount: number` - Number of devices user is paying for

### 2. Method Updates

#### SubscriptionPlan Methods
- `getDevicePriceForCycle(cycle)` - Get per-device price for billing cycle
- `getTotalPriceForCycle(cycle, deviceCount)` - Calculate total based on device count
- `getPriceInInr(cycle, deviceCount)` - Get total price in INR
- `getFormattedPrices(cycle, deviceCount)` - Get formatted prices in USD and INR

### 3. Frontend Changes Needed

#### Subscription UI
- Add device count slider (1-1000 devices)
- Real-time price calculation display
- Show per-device cost breakdown
- Update payment flow to include device count

#### Example UI:
```
Number of Devices: [slider: 1 ----●---- 1000]  50 devices

Pricing:
- Per device: $1.50/month
- Total monthly: $75.00/month
- Total yearly: $750.00/year (save 16.67%)
```

### 4. Files That Need Updates

**Controllers:**
- `src/controllers/subscriptionController.ts`
- `src/controllers/subscriptionPlanController.ts`

**Scripts:**
- `src/scripts/seedSubscriptionPlans.ts`

**Services:**
- Any services that calculate subscription pricing

## Migration Steps

1. ✅ Update SubscriptionPlan model
2. ✅ Update Subscription model
3. ✅ Update SubscriptionPlan methods
4. ⏳ Update controllers
5. ⏳ Update seed scripts
6. ⏳ Create database migration
7. ⏳ Update frontend UI
8. ⏳ Test end-to-end flow

## Pricing Examples

| Devices | Monthly | Quarterly | Yearly | Yearly Savings |
|---------|---------|-----------|--------|----------------|
| 10      | $15     | $40       | $150   | $30 (16.67%)   |
| 50      | $75     | $200      | $750   | $150 (16.67%)  |
| 100     | $150    | $400      | $1,500 | $300 (16.67%)  |
| 500     | $750    | $2,000    | $7,500 | $1,500 (16.67%)|

## Backend API Changes

### Create/Update Subscription
**New Request Body:**
```json
{
  "planId": "uuid",
  "billingCycle": "monthly|yearly|quarterly",
  "deviceCount": 50
}
```

**Response includes:**
```json
{
  "deviceCount": 50,
  "amount": 75.00,
  "pricePerDevice": 1.50
}
```

## Testing Checklist

- [ ] Create subscription with device count
- [ ] Update device count (increase/decrease)
- [ ] Price calculation is correct for all cycles
- [ ] Payment integration works
- [ ] Subscription limits work
- [ ] UI slider works smoothly
- [ ] Real-time price updates
