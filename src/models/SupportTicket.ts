import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { User } from './User';
import { TicketMessage } from './TicketMessage';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'unresolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory =
  | 'technical'
  | 'billing'
  | 'feature_request'
  | 'bug_report'
  | 'general'
  | 'other';

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  ticketNumber!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 50 })
  category!: TicketCategory;

  @Column({ type: 'varchar', length: 20, default: 'medium' })
  priority!: TicketPriority;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status!: TicketStatus;

  @Column({ type: 'uuid', nullable: true })
  assignedToId!: string | null;

  @ManyToOne(() => User, { eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo!: User | null;

  @Column({ type: 'text', array: true, default: '{}' })
  attachments!: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  closedAt!: Date | null;

  @OneToMany(() => TicketMessage, (message) => message.ticket)
  messages!: TicketMessage[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  async generateTicketNumber() {
    if (!this.ticketNumber) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
      this.ticketNumber = `TICKET-${year}${month}-${random}`;
    }
  }

  // Helper method to update status
  updateStatus(status: TicketStatus): void {
    this.status = status;
    if (status === 'resolved') {
      this.resolvedAt = new Date();
    } else if (status === 'closed') {
      this.closedAt = new Date();
    }
  }

  // Check if ticket can receive new messages
  canReceiveMessages(): boolean {
    return this.status !== 'closed';
  }

  // Get ticket age in days
  getAgeInDays(): number {
    const now = new Date();
    const created = new Date(this.createdAt);
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
