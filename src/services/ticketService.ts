import { AppDataSource } from '../data-source';
import { SupportTicket, TicketStatus, TicketPriority, TicketCategory } from '../models/SupportTicket';
import { TicketMessage, MessageSenderType } from '../models/TicketMessage';
import { User } from '../models/User';
import { FindOptionsWhere, ILike, In } from 'typeorm';
import { emailService } from './emailService';

interface CreateTicketDTO {
  userId: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
  attachments?: string[];
}

interface UpdateTicketDTO {
  title?: string;
  description?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  status?: TicketStatus;
  assignedToId?: string | null;
}

interface CreateMessageDTO {
  ticketId: string;
  senderId: string;
  message: string;
  attachments?: string[];
}

interface GetTicketsQuery {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  userId?: string;
  assignedToId?: string;
  search?: string;
}

interface TicketStatistics {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  unresolvedTickets: number;
  closedTickets: number;
  averageResponseTime?: number;
  averageResolutionTime?: number;
  ticketsByCategory: Record<string, number>;
  ticketsByPriority: Record<string, number>;
}

class TicketService {
  private ticketRepository = AppDataSource.getRepository(SupportTicket);
  private messageRepository = AppDataSource.getRepository(TicketMessage);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Create a new support ticket
   */
  async createTicket(data: CreateTicketDTO): Promise<SupportTicket> {
    const ticket = this.ticketRepository.create({
      userId: data.userId,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority || 'medium',
      attachments: data.attachments || [],
      status: 'open',
    });

    const savedTicket = await this.ticketRepository.save(ticket);

    // Send email notification to super admins
    await this.notifyNewTicket(savedTicket);

    return this.getTicketById(savedTicket.id);
  }

  /**
   * Get ticket by ID
   */
  async getTicketById(ticketId: string): Promise<SupportTicket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['user', 'assignedTo'],
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return ticket;
  }

  /**
   * Get all tickets with filters and pagination
   */
  async getAllTickets(query: GetTicketsQuery, requestingUserId?: string, userRole?: string) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<SupportTicket> = {};

    // Role-based filtering
    if (userRole !== 'super_admin') {
      // Regular users and admins can only see their own tickets
      where.userId = requestingUserId;
    }

    // Apply filters
    if (query.status) {
      where.status = query.status;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.assignedToId) {
      where.assignedToId = query.assignedToId;
    }

    // Search in title and description
    let tickets: SupportTicket[];
    let total: number;

    if (query.search) {
      const searchQuery = this.ticketRepository
        .createQueryBuilder('ticket')
        .leftJoinAndSelect('ticket.user', 'user')
        .leftJoinAndSelect('ticket.assignedTo', 'assignedTo')
        .where('ticket.title ILIKE :search OR ticket.description ILIKE :search', {
          search: `%${query.search}%`,
        });

      // Apply other filters
      if (where.status) searchQuery.andWhere('ticket.status = :status', { status: where.status });
      if (where.category) searchQuery.andWhere('ticket.category = :category', { category: where.category });
      if (where.priority) searchQuery.andWhere('ticket.priority = :priority', { priority: where.priority });
      if (where.userId) searchQuery.andWhere('ticket.userId = :userId', { userId: where.userId });
      if (where.assignedToId) searchQuery.andWhere('ticket.assignedToId = :assignedToId', { assignedToId: where.assignedToId });

      [tickets, total] = await searchQuery
        .orderBy('ticket.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();
    } else {
      [tickets, total] = await this.ticketRepository.findAndCount({
        where,
        relations: ['user', 'assignedTo'],
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });
    }

    // Get message counts and unread counts for each ticket
    const ticketsWithCounts = await Promise.all(
      tickets.map(async (ticket) => {
        const messageCount = await this.messageRepository.count({
          where: { ticketId: ticket.id },
        });

        const unreadCount = await this.messageRepository.count({
          where: {
            ticketId: ticket.id,
            isRead: false,
            senderId: requestingUserId ? In([requestingUserId]) : undefined,
          },
        });

        return {
          ...ticket,
          messageCount,
          unreadCount,
        };
      })
    );

    return {
      data: ticketsWithCounts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Update ticket
   */
  async updateTicket(ticketId: string, data: UpdateTicketDTO): Promise<SupportTicket> {
    const ticket = await this.getTicketById(ticketId);

    if (data.title !== undefined) ticket.title = data.title;
    if (data.description !== undefined) ticket.description = data.description;
    if (data.category !== undefined) ticket.category = data.category;
    if (data.priority !== undefined) ticket.priority = data.priority;
    if (data.assignedToId !== undefined) ticket.assignedToId = data.assignedToId;

    if (data.status !== undefined) {
      ticket.updateStatus(data.status);

      // Send notification on status change
      await this.notifyStatusChange(ticket, data.status);
    }

    await this.ticketRepository.save(ticket);
    return this.getTicketById(ticketId);
  }

  /**
   * Delete ticket (soft delete by closing)
   */
  async deleteTicket(ticketId: string): Promise<void> {
    const ticket = await this.getTicketById(ticketId);
    ticket.updateStatus('closed');
    await this.ticketRepository.save(ticket);
  }

  /**
   * Get ticket messages
   */
  async getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
    const messages = await this.messageRepository.find({
      where: { ticketId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });

    return messages;
  }

  /**
   * Send message in ticket
   */
  async sendMessage(data: CreateMessageDTO): Promise<TicketMessage> {
    const ticket = await this.getTicketById(data.ticketId);

    if (!ticket.canReceiveMessages()) {
      throw new Error('Cannot send messages to a closed ticket');
    }

    const sender = await this.userRepository.findOne({ where: { id: data.senderId } });
    if (!sender) {
      throw new Error('Sender not found');
    }

    const message = this.messageRepository.create({
      ticketId: data.ticketId,
      senderId: data.senderId,
      senderType: TicketMessage.getSenderType(sender.role),
      senderName: sender.getFullName(),
      message: data.message,
      attachments: data.attachments || [],
    });

    const savedMessage = await this.messageRepository.save(message);

    // Send email notification
    await this.notifyNewMessage(ticket, savedMessage);

    return this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['sender'],
    }) as Promise<TicketMessage>;
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(messageIds: string[]): Promise<void> {
    await this.messageRepository.update(
      { id: In(messageIds) },
      { isRead: true, readAt: new Date() }
    );
  }

  /**
   * Get ticket statistics
   */
  async getStatistics(userId?: string, userRole?: string): Promise<TicketStatistics> {
    const where: FindOptionsWhere<SupportTicket> = {};

    // Role-based filtering
    if (userRole !== 'super_admin' && userId) {
      where.userId = userId;
    }

    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      unresolvedTickets,
      closedTickets,
      allTickets,
    ] = await Promise.all([
      this.ticketRepository.count({ where }),
      this.ticketRepository.count({ where: { ...where, status: 'open' } }),
      this.ticketRepository.count({ where: { ...where, status: 'in_progress' } }),
      this.ticketRepository.count({ where: { ...where, status: 'resolved' } }),
      this.ticketRepository.count({ where: { ...where, status: 'unresolved' } }),
      this.ticketRepository.count({ where: { ...where, status: 'closed' } }),
      this.ticketRepository.find({ where }),
    ]);

    // Calculate tickets by category
    const ticketsByCategory: Record<string, number> = {};
    allTickets.forEach((ticket) => {
      ticketsByCategory[ticket.category] = (ticketsByCategory[ticket.category] || 0) + 1;
    });

    // Calculate tickets by priority
    const ticketsByPriority: Record<string, number> = {};
    allTickets.forEach((ticket) => {
      ticketsByPriority[ticket.priority] = (ticketsByPriority[ticket.priority] || 0) + 1;
    });

    return {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      unresolvedTickets,
      closedTickets,
      ticketsByCategory,
      ticketsByPriority,
    };
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    // Get all tickets for the user
    const userTickets = await this.ticketRepository.find({
      where: { userId },
      select: ['id'],
    });

    const ticketIds = userTickets.map((t) => t.id);

    if (ticketIds.length === 0) {
      return 0;
    }

    // Count unread messages in user's tickets (not sent by the user)
    const unreadCount = await this.messageRepository.count({
      where: {
        ticketId: In(ticketIds),
        isRead: false,
        senderId: userId, // Messages not from the user
      },
    });

    return unreadCount;
  }

  /**
   * Send email notification for new ticket
   */
  private async notifyNewTicket(ticket: SupportTicket): Promise<void> {
    try {
      // Get all super admins
      const superAdmins = await this.userRepository.find({
        where: { role: 'super_admin', isActive: true },
      });

      const user = await this.userRepository.findOne({ where: { id: ticket.userId } });

      for (const admin of superAdmins) {
        await emailService.sendTicketNotification(
          admin.email,
          'new_ticket',
          {
            ticketNumber: ticket.ticketNumber,
            title: ticket.title,
            category: ticket.category,
            priority: ticket.priority,
            description: ticket.description,
            userName: user?.getFullName() || 'Unknown User',
            userEmail: user?.email || '',
            ticketUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/${ticket.id}`,
          }
        );
      }
    } catch (error) {
      console.error('Error sending new ticket notification:', error);
    }
  }

  /**
   * Send email notification for new message
   */
  private async notifyNewMessage(ticket: SupportTicket, message: TicketMessage): Promise<void> {
    try {
      const sender = await this.userRepository.findOne({ where: { id: message.senderId } });

      // If message is from user/admin, notify assigned super admin or all super admins
      if (sender?.role !== 'super_admin') {
        if (ticket.assignedToId) {
          const assignedAdmin = await this.userRepository.findOne({
            where: { id: ticket.assignedToId },
          });
          if (assignedAdmin) {
            await emailService.sendTicketNotification(
              assignedAdmin.email,
              'new_message',
              {
                ticketNumber: ticket.ticketNumber,
                senderName: sender?.getFullName() || 'Unknown',
                message: message.message,
                ticketUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/${ticket.id}`,
              }
            );
          }
        } else {
          // Notify all super admins
          const superAdmins = await this.userRepository.find({
            where: { role: 'super_admin', isActive: true },
          });
          for (const admin of superAdmins) {
            await emailService.sendTicketNotification(
              admin.email,
              'new_message',
              {
                ticketNumber: ticket.ticketNumber,
                senderName: sender?.getFullName() || 'Unknown',
                message: message.message,
                ticketUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/${ticket.id}`,
              }
            );
          }
        }
      } else {
        // If message is from super admin, notify ticket creator
        const ticketOwner = await this.userRepository.findOne({ where: { id: ticket.userId } });
        if (ticketOwner) {
          await emailService.sendTicketNotification(
            ticketOwner.email,
            'new_message',
            {
              ticketNumber: ticket.ticketNumber,
              senderName: sender?.getFullName() || 'Support Team',
              message: message.message,
              ticketUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/${ticket.id}`,
            }
          );
        }
      }
    } catch (error) {
      console.error('Error sending new message notification:', error);
    }
  }

  /**
   * Send email notification for status change
   */
  private async notifyStatusChange(ticket: SupportTicket, newStatus: TicketStatus): Promise<void> {
    try {
      const ticketOwner = await this.userRepository.findOne({ where: { id: ticket.userId } });

      if (ticketOwner && ['resolved', 'unresolved', 'closed'].includes(newStatus)) {
        await emailService.sendTicketNotification(
          ticketOwner.email,
          'status_changed',
          {
            ticketNumber: ticket.ticketNumber,
            title: ticket.title,
            newStatus,
            ticketUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/${ticket.id}`,
          }
        );
      }
    } catch (error) {
      console.error('Error sending status change notification:', error);
    }
  }
}

export const ticketService = new TicketService();
