import { Request, Response } from 'express';
import { gatewayService, CreateGatewayData, CreateNodeData } from '../services/gatewayService';
import { AuthRequest } from '../middleware/auth';
import { validatePositiveInteger, validateCoordinates, validateRequired, validateUuidParam, validateUuid } from '../utils/validation';
import { logger } from '../services/loggerService';

// Validation helpers
const validateGatewayInput = (data: any) => {
    const errors: string[] = [];
    
    if (!data.chirpstackGatewayId) errors.push('ChirpStack Gateway ID is required');
    if (!data.name) errors.push('Gateway name is required');
    
    if (data.latitude && !validateCoordinates(data.latitude, 'latitude')) {
        errors.push('Invalid latitude value');
    }
    if (data.longitude && !validateCoordinates(data.longitude, 'longitude')) {
        errors.push('Invalid longitude value');
    }
    
    return errors;
};

const validateNodeInput = (data: any) => {
    const errors: string[] = [];
    
    if (!data.chirpstackDeviceId) errors.push('ChirpStack Device ID is required');
    if (!data.name) errors.push('Node name is required');
    if (!data.gatewayId || !validatePositiveInteger(data.gatewayId)) {
        errors.push('Valid Gateway ID is required');
    }
    
    if (data.latitude && !validateCoordinates(data.latitude, 'latitude')) {
        errors.push('Invalid latitude value');
    }
    if (data.longitude && !validateCoordinates(data.longitude, 'longitude')) {
        errors.push('Invalid longitude value');
    }
    
    return errors;
};

// Super Admin Controllers

/**
 * Create a new gateway (Super Admin only)
 */
export const createGateway = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { chirpstackGatewayId, name, description, location, latitude, longitude, metadata } = req.body;
        
        // Validation
        const validationErrors = validateGatewayInput(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        const gatewayData: CreateGatewayData = {
            chirpstackGatewayId,
            name,
            description,
            location,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined,
            createdBy: req.user!,
            metadata: metadata || {}
        };

        const gateway = await gatewayService.createGateway(gatewayData);

        return res.status(201).json({
            success: true,
            message: 'Gateway created successfully',
            data: gateway
        });
    } catch (error) {
        logger.error('Create gateway error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        });
    }
};

/**
 * Get all gateways with nodes (Super Admin only)
 */
export const getAllGateways = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { includeInactive = 'false' } = req.query;
        const gateways = await gatewayService.getAllGateways(includeInactive === 'true');

        return res.json({
            success: true,
            data: gateways,
            count: gateways.length
        });
    } catch (error) {
        logger.error('Get all gateways error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get gateway by ID with all nodes (Super Admin only)
 */
export const getGatewayById = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;

        if (!validatePositiveInteger(id)) {
            return res.status(400).json({
                success: false,
                message: 'Valid gateway ID is required'
            });
        }

        const gateway = await gatewayService.getGatewayById(id);
        if (!gateway) {
            return res.status(404).json({
                success: false,
                message: 'Gateway not found'
            });
        }

        return res.json({
            success: true,
            data: gateway
        });
    } catch (error) {
        logger.error('Get gateway by ID error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Update gateway (Super Admin only)
 */
export const updateGateway = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;
        const { name, description, location, latitude, longitude, isActive, metadata } = req.body;

        if (!validatePositiveInteger(id)) {
            return res.status(400).json({
                success: false,
                message: 'Valid gateway ID is required'
            });
        }

        // Validation for coordinates if provided
        if (latitude && !validateCoordinates(latitude, 'latitude')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid latitude value'
            });
        }
        if (longitude && !validateCoordinates(longitude, 'longitude')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid longitude value'
            });
        }

        const updateData = {
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(location !== undefined && { location }),
            ...(latitude !== undefined && { latitude: parseFloat(latitude) }),
            ...(longitude !== undefined && { longitude: parseFloat(longitude) }),
            ...(isActive !== undefined && { isActive }),
            ...(metadata && { metadata })
        };

        const gateway = await gatewayService.updateGateway(id, updateData);

        return res.json({
            success: true,
            message: 'Gateway updated successfully',
            data: gateway
        });
    } catch (error) {
        logger.error('Update gateway error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        });
    }
};

/**
 * Delete gateway (Super Admin only)
 */
export const deleteGateway = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;

        if (!validatePositiveInteger(id)) {
            return res.status(400).json({
                success: false,
                message: 'Valid gateway ID is required'
            });
        }

        await gatewayService.deleteGateway(id);

        return res.json({
            success: true,
            message: 'Gateway deleted successfully'
        });
    } catch (error) {
        logger.error('Delete gateway error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        });
    }
};

// Admin Controllers

/**
 * Get available gateways for linking (Admin only)
 */
export const getAvailableGateways = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const gateways = await gatewayService.getAvailableGateways();

        return res.json({
            success: true,
            data: gateways,
            count: gateways.length
        });
    } catch (error) {
        logger.error('Get available gateways error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Link gateway to admin account (Admin only)
 */
export const linkGateway = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { gatewayId } = req.body;
        const adminId = req.user!.id;

        if (!gatewayId || !validatePositiveInteger(gatewayId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid gateway ID is required'
            });
        }

        const gateway = await gatewayService.linkGatewayToAdmin({
            gatewayId: gatewayId,
            adminId
        });

        return res.json({
            success: true,
            message: 'Gateway linked successfully',
            data: gateway
        });
    } catch (error) {
        logger.error('Link gateway error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        });
    }
};

/**
 * Unlink gateway from admin account (Admin only)
 */
export const unlinkGateway = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;
        const adminId = req.user!.id;

        if (!validatePositiveInteger(id)) {
            return res.status(400).json({
                success: false,
                message: 'Valid gateway ID is required'
            });
        }

        const gateway = await gatewayService.unlinkGatewayFromAdmin(id, adminId);

        return res.json({
            success: true,
            message: 'Gateway unlinked successfully',
            data: gateway
        });
    } catch (error) {
        logger.error('Unlink gateway error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        });
    }
};

/**
 * Get admin's linked gateways (Admin only)
 */
export const getLinkedGateways = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const adminId = req.user!.id;
        const gateways = await gatewayService.getAdminLinkedGateways(adminId);

        return res.json({
            success: true,
            data: gateways,
            count: gateways.length
        });
    } catch (error) {
        logger.error('Get linked gateways error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Assign gateway to parking lot (Admin only)
 */
export const assignGatewayToParkingLot = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;
        const { parkingLotId } = req.body;
        const adminId = req.user!.id;

        if (!validatePositiveInteger(id) || !validatePositiveInteger(parkingLotId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid gateway ID and parking lot ID are required'
            });
        }

        const gateway = await gatewayService.assignGatewayToParkingLot(
            id,
            parkingLotId,
            adminId
        );

        return res.json({
            success: true,
            message: 'Gateway assigned to parking lot successfully',
            data: gateway
        });
    } catch (error) {
        logger.error('Assign gateway to parking lot error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        });
    }
};

/**
 * Create node under gateway (Admin only)
 */
export const createNode = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { gatewayId, chirpstackDeviceId, name, description, latitude, longitude, metadata } = req.body;
        const adminId = req.user!.id;

        // Validation
        const validationErrors = validateNodeInput(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        const nodeData: CreateNodeData = {
            gatewayId: gatewayId,
            chirpstackDeviceId,
            name,
            description,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined,
            adminId,
            metadata: metadata || {}
        };

        const node = await gatewayService.createNode(nodeData);

        return res.status(201).json({
            success: true,
            message: 'Node created successfully',
            data: node
        });
    } catch (error) {
        logger.error('Create node error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        });
    }
};

/**
 * Get gateway nodes
 */
export const getGatewayNodes = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;
        const adminId = req.user!.role === 'super_admin' ? undefined : req.user!.id;

        if (!validatePositiveInteger(id)) {
            return res.status(400).json({
                success: false,
                message: 'Valid gateway ID is required'
            });
        }

        const nodes = await gatewayService.getGatewayNodes(id, adminId);

        return res.json({
            success: true,
            data: nodes,
            count: nodes.length
        });
    } catch (error) {
        logger.error('Get gateway nodes error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get gateway statistics
 */
export const getGatewayStatistics = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { gatewayId } = req.query;
        const adminId = req.user!.role === 'super_admin' ? undefined : req.user!.id;

        const gatewayIdString = gatewayId ? (gatewayId as string) : undefined;
        if (gatewayId && !validateUuid(gatewayIdString!)) {
            return res.status(400).json({
                success: false,
                message: 'Valid gateway ID is required'
            });
        }

        const statistics = await gatewayService.getGatewayStatistics(gatewayIdString, adminId);

        return res.json({
            success: true,
            data: statistics
        });
    } catch (error) {
        logger.error('Get gateway statistics error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Webhook endpoints for ChirpStack integration

/**
 * Update node status via ChirpStack webhook
 */
export const updateNodeStatus = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { deviceId, metadata } = req.body;

        if (!deviceId) {
            return res.status(400).json({
                success: false,
                message: 'Device ID is required'
            });
        }

        const node = await gatewayService.updateNodeStatus(deviceId, metadata || {});
        
        if (!node) {
            return res.status(404).json({
                success: false,
                message: 'Node not found'
            });
        }

        return res.json({
            success: true,
            message: 'Node status updated successfully',
            data: { deviceId, status: node.status, lastSeen: node.lastSeen }
        });
    } catch (error) {
        logger.error('Update node status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Update gateway status via ChirpStack webhook
 */
export const updateGatewayStatus = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { gatewayId, metadata } = req.body;

        if (!gatewayId) {
            return res.status(400).json({
                success: false,
                message: 'Gateway ID is required'
            });
        }

        const gateway = await gatewayService.updateGatewayStatus(gatewayId, metadata || {});
        
        if (!gateway) {
            return res.status(404).json({
                success: false,
                message: 'Gateway not found'
            });
        }

        return res.json({
            success: true,
            message: 'Gateway status updated successfully',
            data: { gatewayId, status: gateway.status, lastSeen: gateway.lastSeen }
        });
    } catch (error) {
        logger.error('Update gateway status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};