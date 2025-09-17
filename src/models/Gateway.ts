import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { ParkingLot } from './ParkingLot';
import { User } from './User';
import { Node } from './Node';

@Entity()
@Index(['isActive', 'createdAt'])
@Index(['linkedAdmin', 'isActive'])
export class Gateway {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ParkingLot, parkingLot => parkingLot.gateways, { onDelete: 'CASCADE', nullable: true })
    parkingLot: ParkingLot;

    // Admin who linked this gateway to their account
    @ManyToOne(() => User, user => user.linkedGateways, { nullable: true })
    linkedAdmin: User;

    // Super admin who created this gateway
    @ManyToOne(() => User, { nullable: true })
    createdBy: User;

    @OneToMany(() => Node, node => node.gateway)
    nodes: Node[];

    @Column({ unique: true })
    chirpstackGatewayId: string;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', nullable: true })
    location: string;

    @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
    latitude: number;

    @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
    longitude: number;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: false })
    isLinked: boolean; // Whether it's linked to an admin

    @Column({ type: 'timestamptz', nullable: true })
    lastSeen: Date;

    @Column({ type: 'timestamptz', nullable: true })
    linkedAt: Date;

    @Column({ type: 'json', nullable: true })
    metadata: Record<string, any>; // Additional gateway data

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Virtual properties
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
}