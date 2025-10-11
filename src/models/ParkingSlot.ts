import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, OneToOne, OneToMany } from 'typeorm';
import { Floor } from './Floor';
import { Node } from './Node';
import { ParkingStatusLog } from './ParkingStatusLog';

@Entity()
export class ParkingSlot {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Floor, floor => floor.parkingSlots, { onDelete: 'CASCADE' })
    floor: Floor;

    @Column()
    name: string;

    @Column({ default: false })
    isReservable: boolean;

    @Column({ type: 'varchar', default: 'unknown' })
    status: 'available' | 'occupied' | 'unknown' | 'unmonitored' | 'reserved';

    @Column({ type: 'timestamptz', nullable: true })
    statusUpdatedAt: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    lastMessageReceivedAt: Date | null;

    @Column({ type: 'varchar', nullable: true })
    lastSensorState: 'FREE' | 'OCCUPIED' | 'UNKNOWN' | null;

    @Column({ type: 'numeric', precision: 7, scale: 2, nullable: true })
    lastDistanceCm: number | null;

    @Column({ type: 'varchar', nullable: true })
    lastGatewayId: string | null;

    @OneToOne(() => Node, node => node.parkingSlot, { nullable: true })
    node: Node | null;

    @OneToMany(() => ParkingStatusLog, statusLog => statusLog.parkingSlot)
    statusLogs: ParkingStatusLog[];

    @CreateDateColumn()
    createdAt: Date;
}
