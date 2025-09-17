import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, BeforeInsert, BeforeUpdate, OneToMany, Generated } from 'typeorm';
import bcrypt from 'bcryptjs';
import { Node } from './Node';
import { ParkingLot } from './ParkingLot';
import { Subscription } from './Subscription';
import { Gateway } from './Gateway';

export type UserRole = 'super_admin' | 'admin' | 'user';

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    email!: string;

    @Column()
    passwordHash!: string;

    @Column()
    firstName!: string;

    @Column()
    lastName!: string;

    @Column({ type: 'varchar', default: 'user' })
    role!: UserRole;

    @Column({ default: false })
    isVerified!: boolean;

    @Column({type: 'varchar', nullable: true })
    otp!: string | null;

    @Column({ type: 'timestamp', nullable: true })
    otpExpiry!: Date | null;

    @Column({ default: true })
    isActive!: boolean;

    @OneToMany(() => ParkingLot, parkingLot => parkingLot.admin)
    parkingLots: ParkingLot[];

    @OneToMany(() => Subscription, subscription => subscription.admin)
    subscriptions: Subscription[];

    @OneToMany(() => Node, node => node.admin)
    nodes!: Node[];

    @OneToMany(() => Gateway, gateway => gateway.linkedAdmin)
    linkedGateways: Gateway[];

    @CreateDateColumn()
    createdAt!: Date;

    @BeforeInsert()
    async hashPassword() {
        this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    }

    @BeforeUpdate()
    async hashPasswordBeforeUpdate() {
        // Only hash if password has changed
        if (this.passwordHash && !this.passwordHash.startsWith('$2b$')) {
            this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
        }
    }

    // Generate OTP (6 digits) - Legacy method, prefer using otpService
    generateOtp(): void {
        this.otp = Math.floor(100000 + Math.random() * 900000).toString();
        this.otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry
    }

    // Validate OTP - Legacy method, prefer using otpService
    validateOtp(otp: string): boolean {
        if (!this.otp || !this.otpExpiry) return false;
        if (this.otpExpiry < new Date()) return false; // OTP expired
        return this.otp === otp;
    }

    // Clear OTP after use - Legacy method, prefer using otpService
    clearOtp(): void {
        this.otp = null;
        this.otpExpiry = null;
    }

    async validatePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.passwordHash);
    }

    // Get full name
    getFullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }

    // Check if user has specific role
    hasRole(role: UserRole): boolean {
        return this.role === role;
    }

    // Check if user is admin or super admin
    isAdmin(): boolean {
        return this.role === 'admin' || this.role === 'super_admin';
    }
}