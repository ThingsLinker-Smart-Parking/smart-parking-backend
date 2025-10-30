"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnreadCount = exports.getStatistics = exports.markMessagesAsRead = exports.sendMessage = exports.getTicketMessages = exports.deleteTicket = exports.updateTicket = exports.getTicketById = exports.getAllTickets = exports.createTicket = void 0;
const ticketService_1 = require("../services/ticketService");
const sftpUpload_1 = require("../middleware/sftpUpload");
/**
 * Create a new support ticket
 * @route POST /api/tickets
 */
const createTicket = async (req, res) => {
    try {
        const { title, description, category, priority } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        // Validation
        if (!title || title.trim().length < 5) {
            return res.status(400).json({
                success: false,
                message: 'Title must be at least 5 characters long',
            });
        }
        if (!description || description.trim().length < 20) {
            return res.status(400).json({
                success: false,
                message: 'Description must be at least 20 characters long',
            });
        }
        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Category is required',
            });
        }
        // Get attachments from multer and generate public URLs
        const attachments = req.files;
        const attachmentUrls = attachments?.map((file) => (0, sftpUpload_1.getFileUrl)((0, sftpUpload_1.getFilename)(file))) || [];
        const ticket = await ticketService_1.ticketService.createTicket({
            userId,
            title: title.trim(),
            description: description.trim(),
            category,
            priority: priority || 'medium',
            attachments: attachmentUrls,
        });
        return res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            data: ticket,
        });
    }
    catch (error) {
        console.error('Error creating ticket:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create ticket',
        });
    }
};
exports.createTicket = createTicket;
/**
 * Get all tickets with filters
 * @route GET /api/tickets
 */
const getAllTickets = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        const query = {
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 10,
            status: req.query.status,
            category: req.query.category,
            priority: req.query.priority,
            userId: req.query.userId,
            assignedToId: req.query.assignedToId,
            search: req.query.search,
        };
        const result = await ticketService_1.ticketService.getAllTickets(query, userId, userRole);
        return res.status(200).json({
            success: true,
            message: 'Tickets fetched successfully',
            data: result,
        });
    }
    catch (error) {
        console.error('Error fetching tickets:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch tickets',
        });
    }
};
exports.getAllTickets = getAllTickets;
/**
 * Get ticket by ID
 * @route GET /api/tickets/:ticketId
 */
const getTicketById = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        const ticket = await ticketService_1.ticketService.getTicketById(ticketId);
        // Authorization check: users can only see their own tickets, super admins can see all
        if (userRole !== 'super_admin' && ticket.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Ticket fetched successfully',
            data: ticket,
        });
    }
    catch (error) {
        console.error('Error fetching ticket:', error);
        if (error.message === 'Ticket not found') {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch ticket',
        });
    }
};
exports.getTicketById = getTicketById;
/**
 * Update ticket
 * @route PUT /api/tickets/:ticketId
 */
const updateTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        const ticket = await ticketService_1.ticketService.getTicketById(ticketId);
        // Authorization check
        if (userRole !== 'super_admin' && ticket.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        // Only super admins can assign tickets or change status to certain values
        if (userRole !== 'super_admin') {
            if (req.body.assignedToId !== undefined) {
                return res.status(403).json({
                    success: false,
                    message: 'Only super admins can assign tickets',
                });
            }
            // Ticket creators can mark as resolved/unresolved, but only super admins can mark as in_progress or closed
            if (req.body.status && !['resolved', 'unresolved'].includes(req.body.status)) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only mark tickets as resolved or unresolved',
                });
            }
        }
        const updatedTicket = await ticketService_1.ticketService.updateTicket(ticketId, req.body);
        return res.status(200).json({
            success: true,
            message: 'Ticket updated successfully',
            data: updatedTicket,
        });
    }
    catch (error) {
        console.error('Error updating ticket:', error);
        if (error.message === 'Ticket not found') {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update ticket',
        });
    }
};
exports.updateTicket = updateTicket;
/**
 * Delete ticket
 * @route DELETE /api/tickets/:ticketId
 */
const deleteTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        const ticket = await ticketService_1.ticketService.getTicketById(ticketId);
        // Authorization check: only ticket owner or super admin can delete
        if (userRole !== 'super_admin' && ticket.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        await ticketService_1.ticketService.deleteTicket(ticketId);
        return res.status(200).json({
            success: true,
            message: 'Ticket closed successfully',
        });
    }
    catch (error) {
        console.error('Error deleting ticket:', error);
        if (error.message === 'Ticket not found') {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to close ticket',
        });
    }
};
exports.deleteTicket = deleteTicket;
/**
 * Get ticket messages
 * @route GET /api/tickets/:ticketId/messages
 */
const getTicketMessages = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        const ticket = await ticketService_1.ticketService.getTicketById(ticketId);
        // Authorization check
        if (userRole !== 'super_admin' && ticket.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        const messages = await ticketService_1.ticketService.getTicketMessages(ticketId);
        return res.status(200).json({
            success: true,
            message: 'Messages fetched successfully',
            data: messages,
        });
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        if (error.message === 'Ticket not found') {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch messages',
        });
    }
};
exports.getTicketMessages = getTicketMessages;
/**
 * Send message in ticket
 * @route POST /api/tickets/:ticketId/messages
 */
const sendMessage = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { message } = req.body;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message cannot be empty',
            });
        }
        const ticket = await ticketService_1.ticketService.getTicketById(ticketId);
        // Authorization check
        if (userRole !== 'super_admin' && ticket.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        // Get attachments from multer and generate public URLs
        const attachments = req.files;
        const attachmentUrls = attachments?.map((file) => (0, sftpUpload_1.getFileUrl)((0, sftpUpload_1.getFilename)(file))) || [];
        const savedMessage = await ticketService_1.ticketService.sendMessage({
            ticketId,
            senderId: userId,
            message: message.trim(),
            attachments: attachmentUrls,
        });
        return res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: savedMessage,
        });
    }
    catch (error) {
        console.error('Error sending message:', error);
        if (error.message === 'Ticket not found' || error.message === 'Cannot send messages to a closed ticket') {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to send message',
        });
    }
};
exports.sendMessage = sendMessage;
/**
 * Mark messages as read
 * @route POST /api/tickets/:ticketId/messages/read
 */
const markMessagesAsRead = async (req, res) => {
    try {
        const { messageIds } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message IDs are required',
            });
        }
        await ticketService_1.ticketService.markMessagesAsRead(messageIds);
        return res.status(200).json({
            success: true,
            message: 'Messages marked as read',
        });
    }
    catch (error) {
        console.error('Error marking messages as read:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to mark messages as read',
        });
    }
};
exports.markMessagesAsRead = markMessagesAsRead;
/**
 * Get ticket statistics
 * @route GET /api/tickets/statistics
 */
const getStatistics = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        const stats = await ticketService_1.ticketService.getStatistics(userId, userRole);
        return res.status(200).json({
            success: true,
            message: 'Statistics fetched successfully',
            data: stats,
        });
    }
    catch (error) {
        console.error('Error fetching statistics:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch statistics',
        });
    }
};
exports.getStatistics = getStatistics;
/**
 * Get unread message count
 * @route GET /api/tickets/unread-count
 */
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        const count = await ticketService_1.ticketService.getUnreadCount(userId);
        return res.status(200).json({
            success: true,
            message: 'Unread count fetched successfully',
            data: { count },
        });
    }
    catch (error) {
        console.error('Error fetching unread count:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch unread count',
        });
    }
};
exports.getUnreadCount = getUnreadCount;
