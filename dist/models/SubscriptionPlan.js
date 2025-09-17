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
    // Virtual properties for calculated values
    get monthlyPrice() {
        return this.basePricePerMonth;
    }
    get yearlyPrice() {
        return this.basePricePerYear;
    }
    get quarterlyPrice() {
        return this.basePricePerQuarter || (this.basePricePerMonth * 3);
    }
    get quarterlyNodePrice() {
        return this.pricePerNodePerQuarter || (this.pricePerNodePerMonth * 3);
    }
    // Get price for specific billing cycle
    getPriceForCycle(cycle) {
        switch (cycle) {
            case 'monthly':
                return this.basePricePerMonth;
            case 'yearly':
                return this.basePricePerYear;
            case 'quarterly':
                return this.basePricePerQuarter || (this.basePricePerMonth * 3);
            default:
                return this.basePricePerMonth;
        }
    }
    // Get per-node price for specific billing cycle
    getNodePriceForCycle(cycle) {
        switch (cycle) {
            case 'monthly':
                return this.pricePerNodePerMonth;
            case 'yearly':
                return this.pricePerNodePerYear;
            case 'quarterly':
                return this.quarterlyNodePrice;
            default:
                return this.pricePerNodePerMonth;
        }
    }
    // Calculate total price including nodes
    getTotalPriceForCycle(cycle, nodeCount = 0) {
        const basePrice = this.getPriceForCycle(cycle);
        const nodePrice = this.getNodePriceForCycle(cycle) * nodeCount;
        return basePrice + nodePrice;
    }
    // Get price in INR
    getPriceInInr(cycle, nodeCount = 0) {
        const usdPrice = this.getTotalPriceForCycle(cycle, nodeCount);
        return usdPrice * this.usdToInrRate;
    }
    // Get formatted price in both currencies
    getFormattedPrices(cycle, nodeCount = 0) {
        const usdPrice = this.getTotalPriceForCycle(cycle, nodeCount);
        const inrPrice = this.getPriceInInr(cycle, nodeCount);
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
        const monthlyTotal = this.basePricePerMonth * 12;
        if (monthlyTotal > 0) {
            return Math.round(((monthlyTotal - this.basePricePerYear) / monthlyTotal) * 100);
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
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "basePricePerMonth", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "basePricePerYear", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "basePricePerQuarter", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 2.00 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "pricePerNodePerMonth", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 20.00 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "pricePerNodePerYear", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "pricePerNodePerQuarter", void 0);
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
