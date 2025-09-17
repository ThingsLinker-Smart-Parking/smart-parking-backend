import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, BeforeInsert } from 'typeorm';
import { User } from './User';
import crypto from 'crypto';

@Entity()
export class PasswordResetToken {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    token!: string;

    @Column()
    hashedToken!: string;

    @Column({ type: 'timestamp' })
    expiresAt!: Date;

    @Column({ default: false })
    isUsed!: boolean;

    @Column({ nullable: true })
    usedAt?: Date;

    @Column({ nullable: true })
    ipAddress?: string;

    @Column({ nullable: true })
    userAgent?: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user!: User;

    @CreateDateColumn()
    createdAt!: Date;

    @BeforeInsert()
    hashToken() {
        // Hash the token for database storage
        this.hashedToken = crypto.createHash('sha256').update(this.token).digest('hex');
    }

    // Generate a cryptographically secure token
    static generateToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    // Check if token is expired
    isExpired(): boolean {
        return new Date() > this.expiresAt;
    }

    // Check if token is valid (not used and not expired)
    isValid(): boolean {
        return !this.isUsed && !this.isExpired();
    }

    // Mark token as used
    markAsUsed(ipAddress?: string, userAgent?: string): void {
        this.isUsed = true;
        this.usedAt = new Date();
        if (ipAddress) this.ipAddress = ipAddress;
        if (userAgent) this.userAgent = userAgent;
    }

    // Verify token against the stored hash
    static verifyToken(plainToken: string, hashedToken: string): boolean {
        const hash = crypto.createHash('sha256').update(plainToken).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedToken));
    }
}