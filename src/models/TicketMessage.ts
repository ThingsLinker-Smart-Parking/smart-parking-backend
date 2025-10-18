import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { SupportTicket } from './SupportTicket';

export type MessageSenderType = 'user' | 'admin' | 'super_admin' | 'system';

@Entity('ticket_messages')
export class TicketMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  ticketId!: string;

  @ManyToOne(() => SupportTicket, (ticket) => ticket.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket!: SupportTicket;

  @Column({ type: 'uuid' })
  senderId!: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender!: User;

  @Column({ type: 'varchar', length: 20 })
  senderType!: MessageSenderType;

  @Column({ type: 'varchar', length: 200, nullable: true })
  senderName!: string | null;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'text', array: true, default: '{}' })
  attachments!: string[];

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt!: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Mark message as read
  markAsRead(): void {
    this.isRead = true;
    this.readAt = new Date();
  }

  // Determine sender type from user role
  static getSenderType(userRole: string): MessageSenderType {
    switch (userRole) {
      case 'super_admin':
        return 'super_admin';
      case 'admin':
        return 'admin';
      case 'user':
        return 'user';
      default:
        return 'user';
    }
  }
}
