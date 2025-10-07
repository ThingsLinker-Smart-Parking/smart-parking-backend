import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../models/User';

export interface AuthRequest extends Request {
    user?: User;
}

const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const loadUserFromToken = async (token: string): Promise<User | null> => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const userRepository = AppDataSource.getRepository(User);
    return userRepository.findOne({ where: { id: decoded.userId, isActive: true } });
};

const enforceReadOnlyUser = (req: AuthRequest, res: Response): boolean => {
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

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
    } catch (error) {
        return res.sendStatus(403);
    }
};

export const optionallyAuthenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
