"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const ticketController_1 = require("../controllers/ticketController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Ensure uploads directory exists
const uploadsDir = path_1.default.join(process.cwd(), 'uploads', 'tickets');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const fileFilter = (req, file, cb) => {
    // Allow images and documents
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx/;
    const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
        return cb(null, true);
    }
    else {
        cb(new Error('Only images and documents are allowed'));
    }
};
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 5, // Max 5 files
    },
    fileFilter,
});
/**
 * @swagger
 * tags:
 *   name: Support Tickets
 *   description: Support ticket management endpoints
 */
/**
 * @swagger
 * /api/tickets:
 *   post:
 *     summary: Create a new support ticket
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 minLength: 20
 *                 maxLength: 2000
 *               category:
 *                 type: string
 *                 enum: [technical, billing, feature_request, bug_report, general, other]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth_1.authenticateToken, upload.array('attachments', 5), ticketController_1.createTicket);
/**
 * @swagger
 * /api/tickets:
 *   get:
 *     summary: Get all tickets with filters
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, resolved, unresolved, closed]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [technical, billing, feature_request, bug_report, general, other]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tickets fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth_1.authenticateToken, ticketController_1.getAllTickets);
/**
 * @swagger
 * /api/tickets/statistics:
 *   get:
 *     summary: Get ticket statistics
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/statistics', auth_1.authenticateToken, ticketController_1.getStatistics);
/**
 * @swagger
 * /api/tickets/unread-count:
 *   get:
 *     summary: Get unread message count
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/unread-count', auth_1.authenticateToken, ticketController_1.getUnreadCount);
/**
 * @swagger
 * /api/tickets/{ticketId}:
 *   get:
 *     summary: Get ticket by ID
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Ticket not found
 */
router.get('/:ticketId', auth_1.authenticateToken, ticketController_1.getTicketById);
/**
 * @swagger
 * /api/tickets/{ticketId}:
 *   put:
 *     summary: Update ticket
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [technical, billing, feature_request, bug_report, general, other]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               status:
 *                 type: string
 *                 enum: [open, in_progress, resolved, unresolved, closed]
 *               assignedToId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ticket updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Ticket not found
 */
router.put('/:ticketId', auth_1.authenticateToken, ticketController_1.updateTicket);
/**
 * @swagger
 * /api/tickets/{ticketId}:
 *   delete:
 *     summary: Delete (close) ticket
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket closed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Ticket not found
 */
router.delete('/:ticketId', auth_1.authenticateToken, ticketController_1.deleteTicket);
/**
 * @swagger
 * /api/tickets/{ticketId}/messages:
 *   get:
 *     summary: Get all messages in a ticket
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Ticket not found
 */
router.get('/:ticketId/messages', auth_1.authenticateToken, ticketController_1.getTicketMessages);
/**
 * @swagger
 * /api/tickets/{ticketId}/messages:
 *   post:
 *     summary: Send a message in a ticket
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid input or ticket closed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Ticket not found
 */
router.post('/:ticketId/messages', auth_1.authenticateToken, upload.array('attachments', 5), ticketController_1.sendMessage);
/**
 * @swagger
 * /api/tickets/{ticketId}/messages/read:
 *   post:
 *     summary: Mark messages as read
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageIds
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Messages marked as read
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/:ticketId/messages/read', auth_1.authenticateToken, ticketController_1.markMessagesAsRead);
exports.default = router;
