"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionPlan = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
let SubscriptionPlan = class SubscriptionPlan {
    // Get per-device price for specific billing cycle
    getDevicePriceForCycle(cycle) {
        switch (cycle) {
            case 'monthly':
                return this.pricePerDevicePerMonth;
            case 'yearly':
                return this.pricePerDevicePerYear;
            case 'quarterly':
                return this.pricePerDevicePerQuarter;
            default:
                return this.pricePerDevicePerMonth;
        }
    }
    // Calculate total price based on device count
    getTotalPriceForCycle(cycle, deviceCount = 1) {
        const pricePerDevice = this.getDevicePriceForCycle(cycle);
        return pricePerDevice * deviceCount;
    }
    // Get price in INR
    getPriceInInr(cycle, deviceCount = 1) {
        const usdPrice = this.getTotalPriceForCycle(cycle, deviceCount);
        return usdPrice * this.usdToInrRate;
    }
    // Get formatted price in both currencies
    getFormattedPrices(cycle, deviceCount = 1) {
        const usdPrice = this.getTotalPriceForCycle(cycle, deviceCount);
        const inrPrice = this.getPriceInInr(cycle, deviceCount);
        return {
            usd: new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(usdPrice),
            inr: new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(inrPrice)
        };
    }
    // Check if plan has specific feature
    hasFeature(feature) {
        return this.features?.includes(feature) || false;
    }
    // Get discount percentage for yearly billing
    getYearlyDiscount() {
        const monthlyTotal = this.pricePerDevicePerMonth * 12;
        if (monthlyTotal > 0) {
            return Math.round(((monthlyTotal - this.pricePerDevicePerYear) / monthlyTotal) * 100);
        }
        return 0;
    }
    // Update exchange rate (super admin only)
    updateExchangeRate(newRate) {
        this.usdToInrRate = newRate;
    }
};
exports.SubscriptionPlan = SubscriptionPlan;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SubscriptionPlan.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], SubscriptionPlan.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], SubscriptionPlan.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 1.50 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "pricePerDevicePerMonth", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 15.00 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "pricePerDevicePerYear", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 4.00 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "pricePerDevicePerQuarter", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 75.00 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "usdToInrRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['monthly', 'yearly', 'quarterly'], default: 'monthly' }),
    __metadata("design:type", String)
], SubscriptionPlan.prototype, "defaultBillingCycle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "maxGateways", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "maxParkingLots", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "maxFloors", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "maxParkingSlots", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "maxUsers", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], SubscriptionPlan.prototype, "features", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], SubscriptionPlan.prototype, "includesAnalytics", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], SubscriptionPlan.prototype, "includesSupport", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], SubscriptionPlan.prototype, "includesAPI", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], SubscriptionPlan.prototype, "includesCustomization", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], SubscriptionPlan.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], SubscriptionPlan.prototype, "isPopular", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], SubscriptionPlan.prototype, "isCustom", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], SubscriptionPlan.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Date)
], SubscriptionPlan.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    __metadata("design:type", User_1.User)
], SubscriptionPlan.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SubscriptionPlan.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SubscriptionPlan.prototype, "updatedAt", void 0);
exports.SubscriptionPlan = SubscriptionPlan = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.Index)(['isActive', 'sortOrder']),
    (0, typeorm_1.Index)(['isPopular', 'isActive'])
], SubscriptionPlan);
