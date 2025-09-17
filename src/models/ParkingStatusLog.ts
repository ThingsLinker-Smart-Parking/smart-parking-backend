import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { ParkingSlot } from './ParkingSlot';

@Entity()
@Index(['parkingSlot', 'detectedAt'])
@Index(['status', 'detectedAt'])
export class ParkingStatusLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ParkingSlot, parkingSlot => parkingSlot.statusLogs, { onDelete: 'CASCADE' })
    parkingSlot: ParkingSlot;

    @Column({ type: 'varchar' })
    status: 'available' | 'occupied' | 'unknown' | 'reserved';

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    detectedAt: Date;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    distance: number | null; // Distance in cm

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    percentage: number | null; // Occupancy percentage

    @Column({ type: 'integer', nullable: true })
    batteryLevel: number | null; // Battery level (0-100)

    @Column({ type: 'varchar', nullable: true })
    signalQuality: 'excellent' | 'good' | 'fair' | 'poor' | null; // Signal quality

    @Column({ type: 'json', nullable: true })
    metadata?: Record<string, any>; // ChirpStack data, RSSI, SNR, gateway info, etc.

    @CreateDateColumn()
    createdAt: Date;
}