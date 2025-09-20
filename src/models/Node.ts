import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from './User';
import { ParkingSlot } from './ParkingSlot';

@Entity()
@Index(['isActive', 'lastSeen'])
@Index(['admin', 'isActive'])
export class Node {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, user => user.nodes, { onDelete: 'CASCADE' })
    admin: User;

    @OneToOne(() => ParkingSlot, parkingSlot => parkingSlot.node, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn()
    parkingSlot: ParkingSlot;

    @Column({ unique: true })
    chirpstackDeviceId: string;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
    latitude: number;

    @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
    longitude: number;

    @Column({ type: 'timestamptz', nullable: true })
    lastSeen: Date;

    @Column({ default: true })
    isActive: boolean;

    // Removed isAssigned as nodes are always assigned to a slot

    @Column({ type: 'json', nullable: true })
    metadata: Record<string, any>; // Sensor data, battery level, etc.

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Simplified status properties
    get isOnline(): boolean {
        if (!this.lastSeen) return false;
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        return this.lastSeen > fiveMinutesAgo;
    }

    get status(): 'online' | 'offline' | 'inactive' {
        if (!this.isActive) return 'inactive';
        return this.isOnline ? 'online' : 'offline';
    }

    get batteryLevel(): number | null {
        return this.metadata?.batteryLevel || null;
    }

    get distance(): number | null {
        return this.metadata?.distance || null;
    }

    get percentage(): number | null {
        return this.metadata?.percentage || null;
    }

    // Enhanced slot status based on ChirpStack data and percentage
    get slotStatus(): 'available' | 'occupied' | 'unknown' | null {
        // Check if we have ChirpStack sensor state first
        const sensorState = this.metadata?.state;
        if (sensorState === 'FREE') return 'available';
        if (sensorState === 'OCCUPIED') return 'occupied';

        // Fallback to percentage-based logic
        const percentage = this.percentage;
        if (percentage === null) return null;

        if (percentage >= 80) return 'available';
        if (percentage < 60) return 'occupied';
        return 'unknown'; // Between 60-80% is indeterminate
    }

    get signalQuality(): 'excellent' | 'good' | 'fair' | 'poor' | null {
        return this.metadata?.signalQuality || null;
    }

    get rssi(): number | null {
        return this.metadata?.rssi || null;
    }

    get snr(): number | null {
        return this.metadata?.snr || null;
    }

    get gatewayId(): string | null {
        return this.metadata?.gatewayId || null;
    }

    get lastChirpStackUpdate(): string | null {
        return this.metadata?.lastChirpStackUpdate || null;
    }
}