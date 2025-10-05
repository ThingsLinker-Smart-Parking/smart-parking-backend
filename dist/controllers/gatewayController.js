"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGatewayStatus = exports.updateNodeStatus = exports.getGatewayStatistics = exports.getGatewayNodes = exports.createNode = exports.getLinkedGateways = exports.unlinkGateway = exports.linkGateway = exports.getAvailableGateways = exports.deleteGateway = exports.updateGateway = exports.getGatewayById = exports.getAllGateways = exports.createGateway = void 0;
const gatewayService_1 = require("../services/gatewayService");
const validation_1 = require("../utils/validation");
const loggerService_1 = require("../services/loggerService");
// Validation helpers
const validateGatewayInput = (data) => {
    const errors = [];
    if (!data.chirpstackGatewayId)
        errors.push('ChirpStack Gateway ID is required');
    if (!data.name)
        errors.push('Gateway name is required');
    if (data.latitude && !(0, validation_1.validateCoordinates)(data.latitude, 'latitude')) {
        errors.push('Invalid latitude value');
    }
    if (data.longitude && !(0, validation_1.validateCoordinates)(data.longitude, 'longitude')) {
        errors.push('Invalid longitude value');
    }
    return errors;
};
const validateNodeInput = (data) => {
    const errors = [];
    if (!data.chirpstackDeviceId)
        errors.push('ChirpStack Device ID is required');
    if (!data.name)
        errors.push('Node name is required');
    if (!data.gatewayId || !(0, validation_1.validateUuid)(data.gatewayId)) {
        errors.push('Valid Gateway ID is required');
    }
    if (data.latitude && !(0, validation_1.validateCoordinates)(data.latitude, 'latitude')) {
        errors.push('Invalid latitude value');
    }
    if (data.longitude && !(0, validation_1.validateCoordinates)(data.longitude, 'longitude')) {
        errors.push('Invalid longitude value');
    }
    return errors;
};
// Super Admin Controllers
/**
 * Create a new gateway (Super Admin only)
 */
const createGateway = async (req, res) => {
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
        const gatewayData = {
            chirpstackGatewayId,
            name,
            description,
            location,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined,
            createdBy: req.user,
            metadata: metadata || {}
        };
        const gateway = await gatewayService_1.gatewayService.createGateway(gatewayData);
        return res.status(201).json({
            success: true,
            message: 'Gateway created successfully',
            data: gateway
        });
    }
    catch (error) {
        loggerService_1.logger.error('Create gateway error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        });
    }
};
exports.createGateway = createGateway;
/**
 * Get all gateways with nodes (Super Admin only)
 */
const getAllGateways = async (req, res) => {
    try {
        const { includeInactive = 'false' } = req.query;
        const gateways = await gatewayService_1.gatewayService.getAllGateways(includeInactive === 'true');
        return res.json({
            success: true,
            data: gateways,
            count: gateways.length
        });
    }
    catch (error) {
        loggerService_1.logger.error('Get all gateways error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.getAllGateways = getAllGateways;
/**
 * Get gateway by ID with all nodes (Super Admin only)
 */
const getGatewayById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!(0, validation_1.validateUuid)(id)) {
            return res.status(400).json({
                success: false,
                message: 'Valid gateway ID is required'
            });
        }
        const gateway = await gatewayService_1.gatewayService.getGatewayById(id);
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
    }
    catch (error) {
        loggerService_1.logger.error('Get gateway by ID error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.getGatewayById = getGatewayById;
/**
 * Update gateway (Super Admin only)
 */
const updateGateway = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, location, latitude, longitude, isActive, metadata } = req.body;
        if (!(0, validation_1.validateUuid)(id)) {
            return res.status(400).json({
                success: false,
                message: 'Valid gateway ID is required'
            });
        }
        // Validation for coordinates if provided
        if (latitude && !(0, validation_1.validateCoordinates)(latitude, 'latitude')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid latitude value'
            });
        }
        if (longitude && !(0, validation_1.validateCoordinates)(longitude, 'longitude')) {
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
        const gateway = await gatewayService_1.gatewayService.updateGateway(id, updateData);
        return res.json({
            success: true,
            message: 'Gateway updated successfully',
            data: gateway
        });
    }
    catch (error) {
        loggerService_1.logger.error('Update gateway error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        });
    }
};
exports.updateGateway = updateGateway;
/**
 * Delete gateway (Super Admin only)
 */
const deleteGateway = async (req, res) => {
    try {
        const { id } = req.params;
        if (!(0, validation_1.validateUuid)(id)) {
            return res.status(400).json({
                success: false,
                message: 'Valid gateway ID is required'
            });
        }
        await gatewayService_1.gatewayService.deleteGateway(id);
        return res.json({
            success: true,
            message: 'Gateway deleted successfully'
        });
    }
    catch (error) {
        loggerService_1.logger.error('Delete gateway error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        });
    }
};
exports.deleteGateway = deleteGateway;
// Admin Controllers
/**
 * Get available gateways for linking (Admin only)
 */
const getAvailableGateways = async (req, res) => {
    try {
        const gateways = await gatewayService_1.gatewayService.getAvailableGateways();
        return res.json({
            success: true,
            data: gateways,
            count: gateways.length
        });
    }
    catch (error) {
        loggerService_1.logger.error('Get available gateways error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.getAvailableGateways = getAvailableGateways;
/**
 * Link gateway to admin account (Admin only)
 */
const linkGateway = async (req, res) => {
    try {
        const { gatewayId } = req.body;
        const adminId = req.user.id;
        if (!gatewayId || !(0, validation_1.validateUuid)(gatewayId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid gateway ID is required'
            });
        }
        const gateway = await gatewayService_1.gatewayService.linkGatewayToAdmin({
            gatewayId: gatewayId,
            adminId
        });
        return res.json({
            success: true,
            message: 'Gateway linked successfully',
            data: gateway
        });
    }
    catch (error) {
        loggerService_1.logger.error('Link gateway error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        });
    }
};
exports.linkGateway = linkGateway;
/**
 * Unlink gateway from admin account (Admin only)
 */
const unlinkGateway = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;
        if (!(0, validation_1.validateUuid)(id)) {
            return res.status(400).json({
                success: false,
                message: 'Valid gateway ID is required'
            });
        }
        const gateway = await gatewayService_1.gatewayService.unlinkGatewayFromAdmin(id, adminId);
        return res.json({
            success: true,
            message: 'Gateway unlinked successfully',
            data: gateway
        });
    }
    catch (error) {
        loggerService_1.logger.error('Unlink gateway error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        });
    }
};
exports.unlinkGateway = unlinkGateway;
/**
 * Get admin's linked gateways (Admin only)
 */
const getLinkedGateways = async (req, res) => {
    try {
        const adminId = req.user.id;
        const gateways = await gatewayService_1.gatewayService.getAdminLinkedGateways(adminId);
        return res.json({
            success: true,
            data: gateways,
            count: gateways.length
        });
    }
    catch (error) {
        loggerService_1.logger.error('Get linked gateways error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.getLinkedGateways = getLinkedGateways;
/**
 * Create node under gateway (Admin only)
 */
const createNode = async (req, res) => {
    try {
        const { gatewayId, chirpstackDeviceId, name, description, latitude, longitude, metadata } = req.body;
        const adminId = req.user.id;
        // Validation
        const validationErrors = validateNodeInput(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }
        const nodeData = {
            gatewayId: gatewayId,
            chirpstackDeviceId,
            name,
            description,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined,
            adminId,
            metadata: metadata || {}
        };
        const node = await gatewayService_1.gatewayService.createNode(nodeData);
        return res.status(201).json({
            success: true,
            message: 'Node created successfully',
            data: node
        });
    }
    catch (error) {
        loggerService_1.logger.error('Create node error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        });
    }
};
exports.createNode = createNode;
/**
 * Get gateway nodes
 */
const getGatewayNodes = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.role === 'super_admin' ? undefined : req.user.id;
        if (!(0, validation_1.validateUuid)(id)) {
            return res.status(400).json({
                success: false,
                message: 'Valid gateway ID is required'
            });
        }
        const nodes = await gatewayService_1.gatewayService.getGatewayNodes(id, adminId);
        return res.json({
            success: true,
            data: nodes,
            count: nodes.length
        });
    }
    catch (error) {
        loggerService_1.logger.error('Get gateway nodes error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.getGatewayNodes = getGatewayNodes;
/**
 * Get gateway statistics
 */
const getGatewayStatistics = async (req, res) => {
    try {
        const { gatewayId } = req.query;
        const adminId = req.user.role === 'super_admin' ? undefined : req.user.id;
        const gatewayIdString = gatewayId ? gatewayId : undefined;
        if (gatewayId && !(0, validation_1.validateUuid)(gatewayIdString)) {
            return res.status(400).json({
                success: false,
                message: 'Valid gateway ID is required'
            });
        }
        const statistics = await gatewayService_1.gatewayService.getGatewayStatistics(gatewayIdString, adminId);
        return res.json({
            success: true,
            data: statistics
        });
    }
    catch (error) {
        loggerService_1.logger.error('Get gateway statistics error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.getGatewayStatistics = getGatewayStatistics;
// Webhook endpoints for ChirpStack integration
/**
 * Update node status via ChirpStack webhook
 * Auto-creates node if not exists with status='unassigned' and autoCreated=true
 */
const updateNodeStatus = async (req, res) => {
    try {
        const { deviceId, metadata } = req.body;
        if (!deviceId) {
            return res.status(400).json({
                success: false,
                message: 'Device ID is required'
            });
        }
        let node = await gatewayService_1.gatewayService.updateNodeStatus(deviceId, metadata || {});
        if (!node) {
            // Node not found - cannot auto-create because nodes require parking slot
            // Log the attempt for admin to manually create the node
            loggerService_1.logger.warn('Node not found in webhook, cannot auto-create (requires parking slot)', {
                deviceId,
                metadata
            });
            return res.status(404).json({
                success: false,
                message: 'Node not found. Nodes must be manually created and assigned to parking slots.',
                deviceId
            });
        }
        return res.json({
            success: true,
            message: 'Node status updated successfully',
            data: { deviceId, status: node.status, lastSeen: node.lastSeen }
        });
    }
    catch (error) {
        loggerService_1.logger.error('Update node status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.updateNodeStatus = updateNodeStatus;
/**
 * Update gateway status via ChirpStack webhook
 * Auto-creates gateway if not exists with status='unassigned' and autoCreated=true
 */
const updateGatewayStatus = async (req, res) => {
    try {
        const { gatewayId, metadata } = req.body;
        if (!gatewayId) {
            return res.status(400).json({
                success: false,
                message: 'Gateway ID is required'
            });
        }
        let gateway = await gatewayService_1.gatewayService.updateGatewayStatus(gatewayId, metadata || {});
        if (!gateway) {
            // Auto-create gateway if not exists
            const { AppDataSource } = await Promise.resolve().then(() => __importStar(require('../data-source')));
            const { Gateway } = await Promise.resolve().then(() => __importStar(require('../models/Gateway')));
            const gatewayRepository = AppDataSource.getRepository(Gateway);
            // Create gateway with unassigned status
            gateway = gatewayRepository.create({
                chirpstackGatewayId: gatewayId,
                name: `Auto-Gateway ${gatewayId.substring(0, 8)}`,
                description: 'Auto-created from webhook',
                isActive: true,
                isLinked: false,
                linkedAdmin: null,
                createdBy: null,
                lastSeen: new Date(),
                metadata: {
                    ...metadata,
                    status: 'unassigned',
                    autoCreated: true,
                    createdAt: new Date().toISOString()
                }
            });
            gateway = await gatewayRepository.save(gateway);
            loggerService_1.logger.info('Auto-created gateway from webhook', {
                gatewayId,
                gatewayDbId: gateway.id,
                status: 'unassigned'
            });
            return res.status(201).json({
                success: true,
                message: 'Gateway auto-created successfully',
                data: {
                    gatewayId,
                    gatewayDbId: gateway.id,
                    status: 'unassigned',
                    autoCreated: true,
                    lastSeen: gateway.lastSeen
                }
            });
        }
        return res.json({
            success: true,
            message: 'Gateway status updated successfully',
            data: { gatewayId, status: gateway.status, lastSeen: gateway.lastSeen }
        });
    }
    catch (error) {
        loggerService_1.logger.error('Update gateway status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.updateGatewayStatus = updateGatewayStatus;
