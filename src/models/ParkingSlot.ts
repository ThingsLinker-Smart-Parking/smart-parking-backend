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

    @OneToOne(() => Node, node => node.parkingSlot, { nullable: true })
    node: Node | null;

    @OneToMany(() => ParkingStatusLog, statusLog => statusLog.parkingSlot)
    statusLogs: ParkingStatusLog[];

    @CreateDateColumn()
    createdAt: Date;
}