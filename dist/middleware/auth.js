"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.optionallyAuthenticateToken = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const data_source_1 = require("../data-source");
const User_1 = require("../models/User");
const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const loadUserFromToken = async (token) => {
    const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
    return userRepository.findOne({ where: { id: decoded.userId, isActive: true } });
};
const enforceReadOnlyUser = (req, res) => {
    if (!req.user) {
        return false;
    }
    const method = req.method.toUpperCase();
    const isReadOnlyMethod = READ_ONLY_METHODS.has(method);
    if (req.user.role === 'user' && !isReadOnlyMethod) {
        res.status(403).json({
            success: false,
            message: 'Insufficient permissions',
            code: 'READ_ONLY_USER'
        });
        return true;
    }
    return false;
};
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.sendStatus(401);
    }
    try {
        const user = await loadUserFromToken(token);
        if (!user) {
            return res.sendStatus(403);
        }
        req.user = user;
        if (enforceReadOnlyUser(req, res)) {
            return;
        }
        next();
    }
    catch (error) {
        return res.sendStatus(403);
    }
};
exports.authenticateToken = authenticateToken;
const optionallyAuthenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return next();
    }
    try {
        const user = await loadUserFromToken(token);
        if (!user) {
            return res.sendStatus(403);
        }
        req.user = user;
        if (enforceReadOnlyUser(req, res)) {
            return;
        }
        next();
    }
    catch (error) {
        return res.sendStatus(403);
    }
};
exports.optionallyAuthenticateToken = optionallyAuthenticateToken;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        // Super admins can access any role-protected endpoint
        if (req.user.role === 'super_admin') {
            return next();
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        next();
    };
};
exports.requireRole = requireRole;
