import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../models/User';

export interface AuthRequest extends Request {
    user?: User;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.sendStatus(401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOne({ where: { id: decoded.userId, isActive: true } });

        if (!user) {
            return res.sendStatus(403);
        }

        req.user = user;
        next();
    } catch (error) {
        return res.sendStatus(403);
    }
};

export const requireRole = (roles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
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