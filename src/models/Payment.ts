import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from './User';
import { Subscription } from './Subscription';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
export type PaymentMethod =
    | 'stripe'
    | 'paypal'
    | 'razorpay'
    | 'manual'
    | 'bank_transfer'
    | 'cashfree';
export type PaymentType = 'subscription' | 'subscription_upgrade' | 'one_time' | 'refund' | 'credit';

@Entity()
@Index(['user', 'status'])
@Index(['status', 'createdAt'])
@Index(['paymentMethod', 'status'])
@Index(['transactionId'], { unique: true })
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    transactionId: string; // External payment gateway transaction ID

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    @ManyToOne(() => Subscription, { nullable: true })
    subscription: Subscription;

    @Column({ type: 'enum', enum: ['subscription', 'subscription_upgrade', 'one_time', 'refund', 'credit'] })
    type: PaymentType;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({ type: 'varchar', length: 3, default: 'USD' })
    currency: string;

    @Column({ type: 'enum', enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'] })
    status: PaymentStatus;

    @Column({
        type: 'enum',
        enum: ['stripe', 'paypal', 'razorpay', 'manual', 'bank_transfer', 'cashfree']
    })
    paymentMethod: PaymentMethod;

    @Column({ type: 'text', nullable: true })
    paymentMethodDetails: string; // JSON string with payment method specific details

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', nullable: true })
    failureReason: string;

    @Column({ type: 'json', nullable: true })
    metadata: Record<string, any>; // Additional payment data

    @Column({ type: 'date', nullable: true })
    processedAt: Date;

    @Column({ type: 'date', nullable: true })
    refundedAt: Date;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    refundAmount: number;

    @Column({ type: 'text', nullable: true })
    refundReason: string;

    @Column({ type: 'text', nullable: true })
    receiptUrl: string; // URL to payment receipt

    @Column({ type: 'text', nullable: true })
    invoiceUrl: string; // URL to invoice

    @Column({ type: 'boolean', default: false })
    isTest: boolean; // For testing payments

    @Column({ type: 'boolean', default: false })
    isDeleted: boolean;

    @Column({ type: 'date', nullable: true })
    deletedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Virtual properties and methods
    get isSuccessful(): boolean {
        return this.status === 'completed';
    }

    get isPending(): boolean {
        return this.status === 'pending' || this.status === 'processing';
    }

    get isFailed(): boolean {
        return this.status === 'failed' || this.status === 'cancelled';
    }

    get isRefunded(): boolean {
        return this.status === 'refunded';
    }

    get formattedAmount(): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: this.currency
        }).format(this.amount);
    }

    get formattedRefundAmount(): string {
        if (this.refundAmount) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: this.currency
            }).format(this.refundAmount);
        }
        return 'N/A';
    }

    // Check if payment can be refunded
    canRefund(): boolean {
        return this.status === 'completed' && !this.isRefunded;
    }

    // Get payment status color for UI
    getStatusColor(): string {
        switch (this.status) {
            case 'completed':
                return 'success';
            case 'pending':
            case 'processing':
                return 'warning';
            case 'failed':
            case 'cancelled':
                return 'danger';
            case 'refunded':
                return 'info';
            default:
                return 'secondary';
        }
    }

    // Get payment method display name
    getPaymentMethodDisplayName(): string {
        switch (this.paymentMethod) {
            case 'stripe':
                return 'Credit Card (Stripe)';
            case 'paypal':
                return 'PayPal';
            case 'razorpay':
                return 'Razorpay';
            case 'manual':
                return 'Manual Payment';
            case 'bank_transfer':
                return 'Bank Transfer';
            case 'cashfree':
                return 'Cashfree';
            default:
                return 'Unknown';
        }
    }
}
