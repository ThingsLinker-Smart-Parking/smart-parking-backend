"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketService = void 0;
const data_source_1 = require("../data-source");
const SupportTicket_1 = require("../models/SupportTicket");
const TicketMessage_1 = require("../models/TicketMessage");
const User_1 = require("../models/User");
const typeorm_1 = require("typeorm");
const emailService_1 = require("./emailService");
class TicketService {
    constructor() {
        this.ticketRepository = data_source_1.AppDataSource.getRepository(SupportTicket_1.SupportTicket);
        this.messageRepository = data_source_1.AppDataSource.getRepository(TicketMessage_1.TicketMessage);
        this.userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
    }
    /**
     * Create a new support ticket
     */
    async createTicket(data) {
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
    async getTicketById(ticketId) {
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
    async getAllTickets(query, requestingUserId, userRole) {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const skip = (page - 1) * limit;
        const where = {};
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
        let tickets;
        let total;
        if (query.search) {
            const searchQuery = this.ticketRepository
                .createQueryBuilder('ticket')
                .leftJoinAndSelect('ticket.user', 'user')
                .leftJoinAndSelect('ticket.assignedTo', 'assignedTo')
                .where('ticket.title ILIKE :search OR ticket.description ILIKE :search', {
                search: `%${query.search}%`,
            });
            // Apply other filters
            if (where.status)
                searchQuery.andWhere('ticket.status = :status', { status: where.status });
            if (where.category)
                searchQuery.andWhere('ticket.category = :category', { category: where.category });
            if (where.priority)
                searchQuery.andWhere('ticket.priority = :priority', { priority: where.priority });
            if (where.userId)
                searchQuery.andWhere('ticket.userId = :userId', { userId: where.userId });
            if (where.assignedToId)
                searchQuery.andWhere('ticket.assignedToId = :assignedToId', { assignedToId: where.assignedToId });
            [tickets, total] = await searchQuery
                .orderBy('ticket.createdAt', 'DESC')
                .skip(skip)
                .take(limit)
                .getManyAndCount();
        }
        else {
            [tickets, total] = await this.ticketRepository.findAndCount({
                where,
                relations: ['user', 'assignedTo'],
                order: { createdAt: 'DESC' },
                skip,
                take: limit,
            });
        }
        // Get message counts and unread counts for each ticket
        const ticketsWithCounts = await Promise.all(tickets.map(async (ticket) => {
            const messageCount = await this.messageRepository.count({
                where: { ticketId: ticket.id },
            });
            const unreadCount = await this.messageRepository.count({
                where: {
                    ticketId: ticket.id,
                    isRead: false,
                    senderId: requestingUserId ? (0, typeorm_1.In)([requestingUserId]) : undefined,
                },
            });
            return {
                ...ticket,
                messageCount,
                unreadCount,
            };
        }));
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
    async updateTicket(ticketId, data) {
        const ticket = await this.getTicketById(ticketId);
        if (data.title !== undefined)
            ticket.title = data.title;
        if (data.description !== undefined)
            ticket.description = data.description;
        if (data.category !== undefined)
            ticket.category = data.category;
        if (data.priority !== undefined)
            ticket.priority = data.priority;
        if (data.assignedToId !== undefined)
            ticket.assignedToId = data.assignedToId;
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
    async deleteTicket(ticketId) {
        const ticket = await this.getTicketById(ticketId);
        ticket.updateStatus('closed');
        await this.ticketRepository.save(ticket);
    }
    /**
     * Get ticket messages
     */
    async getTicketMessages(ticketId) {
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
    async sendMessage(data) {
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
            senderType: TicketMessage_1.TicketMessage.getSenderType(sender.role),
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
        });
    }
    /**
     * Mark messages as read
     */
    async markMessagesAsRead(messageIds) {
        await this.messageRepository.update({ id: (0, typeorm_1.In)(messageIds) }, { isRead: true, readAt: new Date() });
    }
    /**
     * Get ticket statistics
     */
    async getStatistics(userId, userRole) {
        const where = {};
        // Role-based filtering
        if (userRole !== 'super_admin' && userId) {
            where.userId = userId;
        }
        const [totalTickets, openTickets, inProgressTickets, resolvedTickets, unresolvedTickets, closedTickets, allTickets,] = await Promise.all([
            this.ticketRepository.count({ where }),
            this.ticketRepository.count({ where: { ...where, status: 'open' } }),
            this.ticketRepository.count({ where: { ...where, status: 'in_progress' } }),
            this.ticketRepository.count({ where: { ...where, status: 'resolved' } }),
            this.ticketRepository.count({ where: { ...where, status: 'unresolved' } }),
            this.ticketRepository.count({ where: { ...where, status: 'closed' } }),
            this.ticketRepository.find({ where }),
        ]);
        // Calculate tickets by category
        const ticketsByCategory = {};
        allTickets.forEach((ticket) => {
            ticketsByCategory[ticket.category] = (ticketsByCategory[ticket.category] || 0) + 1;
        });
        // Calculate tickets by priority
        const ticketsByPriority = {};
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
    async getUnreadCount(userId) {
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
                ticketId: (0, typeorm_1.In)(ticketIds),
                isRead: false,
                senderId: userId, // Messages not from the user
            },
        });
        return unreadCount;
    }
    /**
     * Send email notification for new ticket
     */
    async notifyNewTicket(ticket) {
        try {
            // Get all super admins
            const superAdmins = await this.userRepository.find({
                where: { role: 'super_admin', isActive: true },
            });
            const user = await this.userRepository.findOne({ where: { id: ticket.userId } });
            for (const admin of superAdmins) {
                await emailService_1.emailService.sendTicketNotification(admin.email, 'new_ticket', {
                    ticketNumber: ticket.ticketNumber,
                    title: ticket.title,
                    category: ticket.category,
                    priority: ticket.priority,
                    description: ticket.description,
                    userName: user?.getFullName() || 'Unknown User',
                    userEmail: user?.email || '',
                    ticketUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/${ticket.id}`,
                });
            }
        }
        catch (error) {
            console.error('Error sending new ticket notification:', error);
        }
    }
    /**
     * Send email notification for new message
     */
    async notifyNewMessage(ticket, message) {
        try {
            const sender = await this.userRepository.findOne({ where: { id: message.senderId } });
            // If message is from user/admin, notify assigned super admin or all super admins
            if (sender?.role !== 'super_admin') {
                if (ticket.assignedToId) {
                    const assignedAdmin = await this.userRepository.findOne({
                        where: { id: ticket.assignedToId },
                    });
                    if (assignedAdmin) {
                        await emailService_1.emailService.sendTicketNotification(assignedAdmin.email, 'new_message', {
                            ticketNumber: ticket.ticketNumber,
                            senderName: sender?.getFullName() || 'Unknown',
                            message: message.message,
                            ticketUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/${ticket.id}`,
                        });
                    }
                }
                else {
                    // Notify all super admins
                    const superAdmins = await this.userRepository.find({
                        where: { role: 'super_admin', isActive: true },
                    });
                    for (const admin of superAdmins) {
                        await emailService_1.emailService.sendTicketNotification(admin.email, 'new_message', {
                            ticketNumber: ticket.ticketNumber,
                            senderName: sender?.getFullName() || 'Unknown',
                            message: message.message,
                            ticketUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/${ticket.id}`,
                        });
                    }
                }
            }
            else {
                // If message is from super admin, notify ticket creator
                const ticketOwner = await this.userRepository.findOne({ where: { id: ticket.userId } });
                if (ticketOwner) {
                    await emailService_1.emailService.sendTicketNotification(ticketOwner.email, 'new_message', {
                        ticketNumber: ticket.ticketNumber,
                        senderName: sender?.getFullName() || 'Support Team',
                        message: message.message,
                        ticketUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/${ticket.id}`,
                    });
                }
            }
        }
        catch (error) {
            console.error('Error sending new message notification:', error);
        }
    }
    /**
     * Send email notification for status change
     */
    async notifyStatusChange(ticket, newStatus) {
        try {
            const ticketOwner = await this.userRepository.findOne({ where: { id: ticket.userId } });
            if (ticketOwner && ['resolved', 'unresolved', 'closed'].includes(newStatus)) {
                await emailService_1.emailService.sendTicketNotification(ticketOwner.email, 'status_changed', {
                    ticketNumber: ticket.ticketNumber,
                    title: ticket.title,
                    newStatus,
                    ticketUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/${ticket.id}`,
                });
            }
        }
        catch (error) {
            console.error('Error sending status change notification:', error);
        }
    }
}
exports.ticketService = new TicketService();
