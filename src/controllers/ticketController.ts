import { Response } from 'express';
import { ticketService } from '../services/ticketService';
import { AuthRequest } from '../middleware/auth';
import { TicketStatus, TicketPriority, TicketCategory } from '../models/SupportTicket';
import { getFileUrl, getFilename } from '../middleware/sftpUpload';

/**
 * Create a new support ticket
 * @route POST /api/tickets
 */
export const createTicket = async (req: AuthRequest, res: Response): Promise<Response> => {
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
    const attachments = req.files as Express.Multer.File[];
    const attachmentUrls = attachments?.map((file) => getFileUrl(getFilename(file))) || [];

    const ticket = await ticketService.createTicket({
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
  } catch (error: any) {
    console.error('Error creating ticket:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create ticket',
    });
  }
};

/**
 * Get all tickets with filters
 * @route GET /api/tickets
 */
export const getAllTickets = async (req: AuthRequest, res: Response): Promise<Response> => {
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
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      status: req.query.status as TicketStatus | undefined,
      category: req.query.category as TicketCategory | undefined,
      priority: req.query.priority as TicketPriority | undefined,
      userId: req.query.userId as string | undefined,
      assignedToId: req.query.assignedToId as string | undefined,
      search: req.query.search as string | undefined,
    };

    const result = await ticketService.getAllTickets(query, userId, userRole);

    return res.status(200).json({
      success: true,
      message: 'Tickets fetched successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch tickets',
    });
  }
};

/**
 * Get ticket by ID
 * @route GET /api/tickets/:ticketId
 */
export const getTicketById = async (req: AuthRequest, res: Response): Promise<Response> => {
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

    const ticket = await ticketService.getTicketById(ticketId);

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
  } catch (error: any) {
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

/**
 * Update ticket
 * @route PUT /api/tickets/:ticketId
 */
export const updateTicket = async (req: AuthRequest, res: Response): Promise<Response> => {
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

    const ticket = await ticketService.getTicketById(ticketId);

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

    const updatedTicket = await ticketService.updateTicket(ticketId, req.body);

    return res.status(200).json({
      success: true,
      message: 'Ticket updated successfully',
      data: updatedTicket,
    });
  } catch (error: any) {
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

/**
 * Delete ticket
 * @route DELETE /api/tickets/:ticketId
 */
export const deleteTicket = async (req: AuthRequest, res: Response): Promise<Response> => {
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

    const ticket = await ticketService.getTicketById(ticketId);

    // Authorization check: only ticket owner or super admin can delete
    if (userRole !== 'super_admin' && ticket.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    await ticketService.deleteTicket(ticketId);

    return res.status(200).json({
      success: true,
      message: 'Ticket closed successfully',
    });
  } catch (error: any) {
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

/**
 * Get ticket messages
 * @route GET /api/tickets/:ticketId/messages
 */
export const getTicketMessages = async (req: AuthRequest, res: Response): Promise<Response> => {
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

    const ticket = await ticketService.getTicketById(ticketId);

    // Authorization check
    if (userRole !== 'super_admin' && ticket.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const messages = await ticketService.getTicketMessages(ticketId);

    return res.status(200).json({
      success: true,
      message: 'Messages fetched successfully',
      data: messages,
    });
  } catch (error: any) {
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

/**
 * Send message in ticket
 * @route POST /api/tickets/:ticketId/messages
 */
export const sendMessage = async (req: AuthRequest, res: Response): Promise<Response> => {
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

    const ticket = await ticketService.getTicketById(ticketId);

    // Authorization check
    if (userRole !== 'super_admin' && ticket.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Get attachments from multer and generate public URLs
    const attachments = req.files as Express.Multer.File[];
    const attachmentUrls = attachments?.map((file) => getFileUrl(getFilename(file))) || [];

    const savedMessage = await ticketService.sendMessage({
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
  } catch (error: any) {
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

/**
 * Mark messages as read
 * @route POST /api/tickets/:ticketId/messages/read
 */
export const markMessagesAsRead = async (req: AuthRequest, res: Response): Promise<Response> => {
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

    await ticketService.markMessagesAsRead(messageIds);

    return res.status(200).json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark messages as read',
    });
  }
};

/**
 * Get ticket statistics
 * @route GET /api/tickets/statistics
 */
export const getStatistics = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const stats = await ticketService.getStatistics(userId, userRole);

    return res.status(200).json({
      success: true,
      message: 'Statistics fetched successfully',
      data: stats,
    });
  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch statistics',
    });
  }
};

/**
 * Get unread message count
 * @route GET /api/tickets/unread-count
 */
export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const count = await ticketService.getUnreadCount(userId);

    return res.status(200).json({
      success: true,
      message: 'Unread count fetched successfully',
      data: { count },
    });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch unread count',
    });
  }
};
