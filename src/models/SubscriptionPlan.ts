import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';
import { Subscription } from './Subscription';
import { User } from './User';

export type BillingCycle = 'monthly' | 'yearly' | 'quarterly';
export type Currency = 'USD' | 'INR';

@Entity()
@Index(['isActive', 'sortOrder'])
@Index(['isPopular', 'isActive'])
export class SubscriptionPlan {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    // Per-device pricing in USD (simple model: $1.5 per device per month)
    @Column({ type: 'decimal', precision: 10, scale: 2, default: 1.50 })
    pricePerDevicePerMonth: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 15.00 })
    pricePerDevicePerYear: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 4.00 })
    pricePerDevicePerQuarter: number;

    // Exchange rate for INR (can be updated by super admin)
    @Column({ type: 'decimal', precision: 10, scale: 2, default: 75.00 })
    usdToInrRate: number;

    @Column({ type: 'enum', enum: ['monthly', 'yearly', 'quarterly'], default: 'monthly' })
    defaultBillingCycle: BillingCycle;

    // Resource limits
    @Column({ type: 'int', default: 0 })
    maxGateways: number;

    @Column({ type: 'int', default: 0 })
    maxParkingLots: number;

    @Column({ type: 'int', default: 0 })
    maxFloors: number;

    @Column({ type: 'int', default: 0 })
    maxParkingSlots: number;

    @Column({ type: 'int', default: 0 })
    maxUsers: number;

    @Column({ type: 'json', nullable: true })
    features: string[]; // Array of feature names

    @Column({ type: 'boolean', default: false })
    includesAnalytics: boolean;

    @Column({ type: 'boolean', default: false })
    includesSupport: boolean;

    @Column({ type: 'boolean', default: false })
    includesAPI: boolean;

    @Column({ type: 'boolean', default: false })
    includesCustomization: boolean;

    @Column({ type: 'int', default: 0 })
    sortOrder: number;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: false })
    isPopular: boolean;

    @Column({ default: false })
    isCustom: boolean;

    @Column({ type: 'boolean', default: false })
    isDeleted: boolean;

    @Column({ type: 'date', nullable: true })
    deletedAt: Date;

    // Created by super admin
    @ManyToOne(() => User, { nullable: true })
    createdBy: User;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Get per-device price for specific billing cycle
    getDevicePriceForCycle(cycle: BillingCycle): number {
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
    getTotalPriceForCycle(cycle: BillingCycle, deviceCount: number = 1): number {
        const pricePerDevice = this.getDevicePriceForCycle(cycle);
        return pricePerDevice * deviceCount;
    }

    // Get price in INR
    getPriceInInr(cycle: BillingCycle, deviceCount: number = 1): number {
        const usdPrice = this.getTotalPriceForCycle(cycle, deviceCount);
        return usdPrice * this.usdToInrRate;
    }

    // Get formatted price in both currencies
    getFormattedPrices(cycle: BillingCycle, deviceCount: number = 1): { usd: string; inr: string } {
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
    hasFeature(feature: string): boolean {
        return this.features?.includes(feature) || false;
    }

    // Get discount percentage for yearly billing
    getYearlyDiscount(): number {
        const monthlyTotal = this.pricePerDevicePerMonth * 12;
        if (monthlyTotal > 0) {
            return Math.round(((monthlyTotal - this.pricePerDevicePerYear) / monthlyTotal) * 100);
        }
        return 0;
    }

    // Update exchange rate (super admin only)
    updateExchangeRate(newRate: number): void {
        this.usdToInrRate = newRate;
    }
}