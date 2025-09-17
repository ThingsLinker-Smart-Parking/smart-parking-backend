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

    // Base pricing in USD
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    basePricePerMonth: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    basePricePerYear: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    basePricePerQuarter: number;

    // Per-node pricing in USD
    @Column({ type: 'decimal', precision: 10, scale: 2, default: 2.00 })
    pricePerNodePerMonth: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 20.00 })
    pricePerNodePerYear: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    pricePerNodePerQuarter: number;

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

    // Virtual properties for calculated values
    get monthlyPrice(): number {
        return this.basePricePerMonth;
    }

    get yearlyPrice(): number {
        return this.basePricePerYear;
    }

    get quarterlyPrice(): number {
        return this.basePricePerQuarter || (this.basePricePerMonth * 3);
    }

    get quarterlyNodePrice(): number {
        return this.pricePerNodePerQuarter || (this.pricePerNodePerMonth * 3);
    }

    // Get price for specific billing cycle
    getPriceForCycle(cycle: BillingCycle): number {
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
    getNodePriceForCycle(cycle: BillingCycle): number {
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
    getTotalPriceForCycle(cycle: BillingCycle, nodeCount: number = 0): number {
        const basePrice = this.getPriceForCycle(cycle);
        const nodePrice = this.getNodePriceForCycle(cycle) * nodeCount;
        return basePrice + nodePrice;
    }

    // Get price in INR
    getPriceInInr(cycle: BillingCycle, nodeCount: number = 0): number {
        const usdPrice = this.getTotalPriceForCycle(cycle, nodeCount);
        return usdPrice * this.usdToInrRate;
    }

    // Get formatted price in both currencies
    getFormattedPrices(cycle: BillingCycle, nodeCount: number = 0): { usd: string; inr: string } {
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
    hasFeature(feature: string): boolean {
        return this.features?.includes(feature) || false;
    }

    // Get discount percentage for yearly billing
    getYearlyDiscount(): number {
        const monthlyTotal = this.basePricePerMonth * 12;
        if (monthlyTotal > 0) {
            return Math.round(((monthlyTotal - this.basePricePerYear) / monthlyTotal) * 100);
        }
        return 0;
    }

    // Update exchange rate (super admin only)
    updateExchangeRate(newRate: number): void {
        this.usdToInrRate = newRate;
    }
}