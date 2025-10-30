import multer from 'multer';
import sftpStorage from 'multer-sftp';
import path from 'path';

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
    return sftpStorage({
      sftp: {
        host: process.env.SFTP_HOST!,
        port: parseInt(process.env.SFTP_PORT!),
        username: process.env.SFTP_USERNAME!,
        password: process.env.SFTP_PASSWORD!,
      },
      destination: function (req: any, file: Express.Multer.File, cb: any) {
        cb(null, process.env.SFTP_UPLOAD_PATH!);
      },
      filename: function (req: any, file: Express.Multer.File, cb: any) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const filename = uniqueSuffix + path.extname(file.originalname);
        cb(null, filename);
      },
    });
  } catch (error) {
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
  const uploadsDir = path.join(process.cwd(), 'uploads', 'tickets');

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });
};

/**
 * File filter for allowed file types
 */
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow images and documents
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, JPG, PNG, GIF, WEBP) and documents (PDF, DOC, DOCX) are allowed'));
  }
};

/**
 * Create multer upload instance with SFTP or local storage
 */
const storage = createSftpStorage() || createLocalStorage();

export const upload = multer({
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
export const getFileUrl = (filename: string): string => {
  // If SFTP is configured, use the SFTP base URL
  if (process.env.SFTP_BASE_URL && process.env.SFTP_HOST) {
    return `${process.env.SFTP_BASE_URL}${filename}`;
  }

  // Fallback to local URL
  return `/uploads/tickets/${filename}`;
};

/**
 * Helper function to extract filename from multer file object
 */
export const getFilename = (file: Express.Multer.File): string => {
  return file.filename;
};
