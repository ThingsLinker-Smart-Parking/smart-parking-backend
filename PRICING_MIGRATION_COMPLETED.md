# Per-Device Pricing Migration - COMPLETED ✅

**Date:** October 19, 2025
**Migration Type:** Subscription Business Model Update

## Summary

Successfully migrated the subscription pricing model from a complex "base price + per-node pricing" structure to a simplified "per-device pricing" model at **$1.50 per device per month**.

## What Changed

### Backend Updates

#### 1. Database Schema Changes
- **SubscriptionPlan Model** ([src/models/SubscriptionPlan.ts](src/models/SubscriptionPlan.ts))
  - Removed: `basePricePerMonth`, `basePricePerYear`, `basePricePerQuarter`
  - Removed: `pricePerNodePerMonth`, `pricePerNodePerYear`, `quarterlyNodePrice`
  - Added: `pricePerDevicePerMonth` (default: $1.50)
  - Added: `pricePerDevicePerYear` (default: $15.00)
  - Added: `pricePerDevicePerQuarter` (default: $4.00)

- **Subscription Model** ([src/models/Subscription.ts](src/models/Subscription.ts))
  - Added: `deviceCount` field (integer, default: 1)

#### 2. Model Methods Updated
- `getTotalPriceForCycle(cycle, deviceCount)` - Calculate total based on device count
- `getDevicePriceForCycle(cycle)` - Get per-device price for billing cycle
- `getFormattedPrices(cycle, deviceCount)` - Format prices in USD and INR
- `getYearlyDiscount()` - Calculate yearly discount percentage

#### 3. Controller Updates
- **subscriptionController.ts** - Updated plan ordering to use `pricePerDevicePerMonth`
- **subscriptionPlanController.ts** - Complete rewrite of pricing transformation
  - Updated `getAllSubscriptionPlans` - New pricing structure in response
  - Updated `getSubscriptionPlanById` - Per-device pricing details
  - Updated `createSubscriptionPlan` - New pricing fields
  - Updated `getSubscriptionPlanStats` - Statistics based on per-device pricing

#### 4. Migration Scripts
- **migratePricingModel.ts** - Database schema migration script
  - Adds `deviceCount` column to subscriptions
  - Removes old pricing columns from subscription_plan
  - Adds new per-device pricing columns

- **seedSimpleSubscriptionPlans.ts** - New seed script for "Pay Per Device" plan
  - Replaces old multi-tier plan system
  - Single plan with per-device pricing
  - Generous limits (100 gateways, 500 lots, 100K slots)

#### 5. Files Renamed/Archived
- `seedSubscriptionPlans.ts` → `seedSubscriptionPlans.ts.old` (backup)
- Updated `package.json` script: `seed:plans` now uses `seedSimpleSubscriptionPlans.ts`

## New Pricing Model

### Per-Device Rates
- **Monthly:** $1.50 per device
- **Quarterly:** $4.00 per device ($1.33/month - 11% savings)
- **Yearly:** $15.00 per device ($1.25/month - 17% savings)

### Examples
- 10 devices: $15/month, $150/year
- 50 devices: $75/month, $750/year
- 100 devices: $150/month, $1,500/year

### Exchange Rate
- USD to INR: 83.00 (configurable)

## Migration Steps Executed

1. ✅ Updated SubscriptionPlan model (removed old fields, added new fields)
2. ✅ Updated Subscription model (added deviceCount)
3. ✅ Updated SubscriptionPlan methods
4. ✅ Updated subscriptionController.ts
5. ✅ Updated subscriptionPlanController.ts (all endpoints)
6. ✅ Created migratePricingModel.ts script
7. ✅ Ran database migration
8. ✅ Created seedSimpleSubscriptionPlans.ts
9. ✅ Seeded database with new plan
10. ✅ Updated package.json scripts
11. ✅ TypeScript compilation successful
12. ✅ Backend build successful

## API Response Changes

### Before (Old Model)
```json
{
  "pricing": {
    "monthly": {
      "base": 29.99,
      "perNode": 2.00
    },
    "yearly": {
      "base": 299.99,
      "perNode": 20.00
    }
  }
}
```

### After (New Model)
```json
{
  "pricing": {
    "perDevice": {
      "monthly": 1.50,
      "yearly": 15.00,
      "quarterly": 4.00
    },
    "formatted": {
      "monthly": { "usd": "$1.50", "inr": "₹124.50" },
      "yearly": { "usd": "$15.00", "inr": "₹1,245.00" },
      "quarterly": { "usd": "$4.00", "inr": "₹332.00" }
    },
    "discount": {
      "yearly": 17
    }
  }
}
```

## Testing

### Backend API Endpoints
All subscription plan endpoints tested and working:
- `GET /api/subscription-plans` - Lists plans with new pricing
- `GET /api/subscription-plans/:id` - Shows per-device pricing
- `POST /api/subscription-plans` - Creates plans with new structure
- `PUT /api/subscription-plans/:id` - Updates pricing fields
- `GET /api/subscription-plans/stats` - Statistics with per-device pricing

### Database
- Migration script ran successfully
- New plan seeded successfully
- Existing subscriptions preserved
- Foreign key constraints maintained

## Next Steps (Frontend)

The following frontend updates are still needed:

1. **Subscription Plans Page** - Update to show per-device pricing
2. **Device Count Slider** - Add UI to select device count (1-100+)
3. **Real-time Price Calculator** - Show total based on device count
4. **Subscription Creation** - Send deviceCount in API request
5. **Subscription Management** - Allow users to increase/decrease device count
6. **Payment Flow** - Update Cashfree integration to use new pricing

## Rollback Instructions

If needed, you can rollback using the migration down method:

```bash
# Rollback database changes
npm run migration:revert

# Restore old seed script
mv src/scripts/seedSubscriptionPlans.ts.old src/scripts/seedSubscriptionPlans.ts

# Update package.json
# Change seed:plans script back to seedSubscriptionPlans.ts

# Restore old model code from git
git checkout HEAD -- src/models/SubscriptionPlan.ts
git checkout HEAD -- src/models/Subscription.ts
git checkout HEAD -- src/controllers/subscriptionPlanController.ts
```

## Files Modified

### Models
- [src/models/SubscriptionPlan.ts](src/models/SubscriptionPlan.ts)
- [src/models/Subscription.ts](src/models/Subscription.ts)

### Controllers
- [src/controllers/subscriptionController.ts](src/controllers/subscriptionController.ts)
- [src/controllers/subscriptionPlanController.ts](src/controllers/subscriptionPlanController.ts)

### Scripts
- [src/scripts/migratePricingModel.ts](src/scripts/migratePricingModel.ts) (NEW)
- [src/scripts/seedSimpleSubscriptionPlans.ts](src/scripts/seedSimpleSubscriptionPlans.ts) (NEW)
- [src/scripts/seedSubscriptionPlans.ts.old](src/scripts/seedSubscriptionPlans.ts.old) (ARCHIVED)

### Migrations
- [src/migrations/1760889000000-UpdateSubscriptionPlanToPerDevicePricing.ts](src/migrations/1760889000000-UpdateSubscriptionPlanToPerDevicePricing.ts) (NEW)

### Configuration
- [package.json](package.json) - Updated seed:plans script

## Notes

- Old subscription plans with existing subscriptions are preserved
- New "Pay Per Device" plan created successfully
- All TypeScript compilation errors resolved
- Backend build successful
- Ready for frontend integration

## Contact

For questions or issues, refer to:
- [PER_DEVICE_PRICING_MIGRATION.md](PER_DEVICE_PRICING_MIGRATION.md) - Original migration plan
- [API_ENDPOINT_GUIDE.md](API_ENDPOINT_GUIDE.md) - API documentation
