"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFilename = exports.getFileUrl = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const multer_sftp_1 = __importDefault(require("multer-sftp"));
const path_1 = __importDefault(require("path"));
/**
 * SFTP Storage Configuration for file uploads
 * Uploads files directly to hosting service instead of local storage
 */
const createSftpStorage = () => {
    // Validate required environment variables
    const requiredVars = ['SFTP_HOST', 'SFTP_PORT', 'SFTP_USERNAME', 'SFTP_PASSWORD', 'SFTP_UPLOAD_PATH'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        console.warn(`⚠️  SFTP upload disabled: Missing environment variables: ${missingVars.join(', ')}`);
        console.warn('⚠️  Falling back to local storage');
        return null;
    }
    try {
        return (0, multer_sftp_1.default)({
            sftp: {
                host: process.env.SFTP_HOST,
                port: parseInt(process.env.SFTP_PORT),
                username: process.env.SFTP_USERNAME,
                password: process.env.SFTP_PASSWORD,
            },
            destination: function (req, file, cb) {
                cb(null, process.env.SFTP_UPLOAD_PATH);
            },
            filename: function (req, file, cb) {
                // Generate unique filename with timestamp
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                const filename = uniqueSuffix + path_1.default.extname(file.originalname);
                cb(null, filename);
            },
        });
    }
    catch (error) {
        console.error('❌ Error creating SFTP storage:', error);
        console.warn('⚠️  Falling back to local storage');
        return null;
    }
};
/**
 * Fallback local storage configuration
 */
const createLocalStorage = () => {
    const fs = require('fs');
    const uploadsDir = path_1.default.join(process.cwd(), 'uploads', 'tickets');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    return multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadsDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
        },
    });
};
/**
 * File filter for allowed file types
 */
const fileFilter = (req, file, cb) => {
    // Allow images and documents
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx/;
    const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
        return cb(null, true);
    }
    else {
        cb(new Error('Only images (JPEG, JPG, PNG, GIF, WEBP) and documents (PDF, DOC, DOCX) are allowed'));
    }
};
/**
 * Create multer upload instance with SFTP or local storage
 */
const storage = createSftpStorage() || createLocalStorage();
exports.upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB default
        files: 5, // Max 5 files
    },
    fileFilter,
});
/**
 * Helper function to generate public URL for uploaded files
 */
const getFileUrl = (filename) => {
    // If SFTP is configured, use the SFTP base URL
    if (process.env.SFTP_BASE_URL && process.env.SFTP_HOST) {
        return `${process.env.SFTP_BASE_URL}${filename}`;
    }
    // Fallback to local URL
    return `/uploads/tickets/${filename}`;
};
exports.getFileUrl = getFileUrl;
/**
 * Helper function to extract filename from multer file object
 */
const getFilename = (file) => {
    return file.filename;
};
exports.getFilename = getFilename;
