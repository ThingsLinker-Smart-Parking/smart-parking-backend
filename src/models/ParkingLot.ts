import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, OneToMany } from 'typeorm';
import { User } from './User';
import { Gateway } from './Gateway';
import { Floor } from './Floor';

@Entity()
export class ParkingLot {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, user => user.parkingLots)
    admin: User;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ type: 'float', nullable: true })
    latitude: number;

    @Column({ type: 'float', nullable: true })
    longitude: number;

    @Column({ default: true, nullable: true })
    isActive: boolean;

    @Column({ type: 'varchar', nullable: true, unique: true })
    chirpstackApplicationId: string; // ChirpStack Application ID for MQTT topic subscription

    @Column({ type: 'varchar', nullable: true })
    chirpstackApplicationName: string; // Human-readable application name

    @OneToMany(() => Gateway, gateway => gateway.parkingLot)
    gateways: Gateway[];

    @OneToMany(() => Floor, floor => floor.parkingLot)
    floors: Floor[];

    @CreateDateColumn()
    createdAt: Date;
}