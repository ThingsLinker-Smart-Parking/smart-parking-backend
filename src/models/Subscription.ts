import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { User } from './User';
import { SubscriptionPlan, BillingCycle } from './SubscriptionPlan';
import { Payment } from './Payment';

export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'cancelled' | 'suspended' | 'trial';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';

@Entity()
@Index(['admin', 'status'])
@Index(['status', 'endDate'])
@Index(['paymentStatus', 'status'])
export class Subscription {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, user => user.subscriptions, { onDelete: 'CASCADE' })
    admin: User;

    @ManyToOne(() => SubscriptionPlan, { eager: true })
    plan: SubscriptionPlan;

    @Column({ type: 'enum', enum: ['monthly', 'yearly', 'quarterly'] })
    billingCycle: BillingCycle;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({ type: 'int', default: 1 })
    deviceCount: number; // Number of devices (nodes) user is paying for

    @Column({ type: 'date' })
    startDate: Date;

    @Column({ type: 'date' })
    endDate: Date;

    @Column({ type: 'date', nullable: true })
    trialEndDate: Date;

    @Column({ type: 'date', nullable: true })
    nextBillingDate: Date;

    @Column({ type: 'enum', enum: ['pending', 'active', 'expired', 'cancelled', 'suspended', 'trial'] })
    status: SubscriptionStatus;

    @Column({ type: 'enum', enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'] })
    paymentStatus: PaymentStatus;

    @Column({ type: 'int', default: 0 })
    gatewayLimit: number;

    @Column({ type: 'int', default: 0 })
    parkingLotLimit: number;

    @Column({ type: 'int', default: 0 })
    floorLimit: number;

    @Column({ type: 'int', default: 0 })
    parkingSlotLimit: number;

    @Column({ type: 'int', default: 0 })
    userLimit: number;

    @Column({ type: 'boolean', default: true })
    autoRenew: boolean;

    @Column({ type: 'text', nullable: true })
    cancellationReason: string;

    @Column({ type: 'date', nullable: true })
    cancelledAt: Date;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'json', nullable: true })
    metadata: Record<string, any>; // Additional custom data

    @Column({ type: 'boolean', default: false })
    isDeleted: boolean;

    @Column({ type: 'date', nullable: true })
    deletedAt: Date;

    @OneToMany(() => Payment, payment => payment.subscription)
    payments: Payment[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Virtual properties and methods
    get isActive(): boolean {
        return this.status === 'active' || this.status === 'trial';
    }

    get isExpired(): boolean {
        return new Date() > this.endDate;
    }

    get isTrial(): boolean {
        return this.status === 'trial' && this.trialEndDate && new Date() <= this.trialEndDate;
    }

    get daysUntilExpiry(): number {
        const today = new Date();
        const expiry = new Date(this.endDate);
        const diffTime = expiry.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    get isNearExpiry(): boolean {
        return this.daysUntilExpiry <= 7;
    }

    get isOverdue(): boolean {
        return this.paymentStatus === 'pending' && this.daysUntilExpiry < 0;
    }

    // Calculate next billing date
    calculateNextBillingDate(): Date {
        const nextDate = new Date(this.endDate);
        switch (this.billingCycle) {
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'quarterly':
                nextDate.setMonth(nextDate.getMonth() + 3);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
        }
        return nextDate;
    }

    // Check if subscription can be renewed
    canRenew(): boolean {
        return this.status === 'active' && this.autoRenew && !this.isExpired;
    }

    // Get current usage percentage
    getUsagePercentage(resource: 'gateways' | 'parkingLots' | 'floors' | 'parkingSlots' | 'users'): number {
        const limits = {
            gateways: this.gatewayLimit,
            parkingLots: this.parkingLotLimit,
            floors: this.floorLimit,
            parkingSlots: this.parkingSlotLimit,
            users: this.userLimit
        };
        
        // This would need to be calculated based on actual usage
        // For now, return 0 as placeholder
        return 0;
    }
}