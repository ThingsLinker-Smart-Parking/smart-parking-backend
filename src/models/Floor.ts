import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, OneToMany } from 'typeorm';
import { ParkingLot } from './ParkingLot';
import { ParkingSlot } from './ParkingSlot';

@Entity()
export class Floor {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ParkingLot, parkingLot => parkingLot.floors, { onDelete: 'CASCADE' })
    parkingLot: ParkingLot;

    @Column()
    name: string;

    @Column({ nullable: true })
    level: number;

    @OneToMany(() => ParkingSlot, parkingSlot => parkingSlot.floor)
    parkingSlots: ParkingSlot[];

    @CreateDateColumn()
    createdAt: Date;
}