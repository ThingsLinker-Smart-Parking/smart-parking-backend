"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNode = exports.getUnassignedNodes = exports.getNodesBySlots = exports.updateNodeStatus = exports.updateNode = exports.createNode = exports.getNode = exports.getNodes = void 0;
const data_source_1 = require("../data-source");
const Node_1 = require("../models/Node");
const ParkingSlot_1 = require("../models/ParkingSlot");
const ParkingStatusLog_1 = require("../models/ParkingStatusLog");
const loggerService_1 = require("../services/loggerService");
const typeorm_1 = require("typeorm");
/**
 * Get all nodes for the authenticated admin with pagination and filtering
 */
const getNodes = async (req, res) => {
    try {
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        // Extract query parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const slotId = req.query.slotId;
        // Calculate skip for pagination
        const skip = (page - 1) * limit;
        // Build where clause
        const whereClause = {
            admin: { id: req.user.id }
        };
        // Add slotId filter if provided
        if (slotId) {
            whereClause.parkingSlot = { id: slotId };
        }
        // Get nodes with pagination
        const [nodes, total] = await nodeRepository.findAndCount({
            where: whereClause,
            relations: ['parkingSlot', 'parkingSlot.floor', 'parkingSlot.floor.parkingLot'],
            order: { createdAt: 'DESC' },
            skip: skip,
            take: limit
        });
        const formattedNodes = nodes.map(node => ({
            id: node.id,
            name: node.name,
            chirpstackDeviceId: node.chirpstackDeviceId,
            description: node.description,
            status: node.status,
            isOnline: node.isOnline,
            lastSeen: node.lastSeen,
            batteryLevel: node.batteryLevel,
            distance: node.distance,
            percentage: node.percentage,
            slotStatus: node.slotStatus,
            parkingSlot: {
                id: node.parkingSlot.id,
                name: node.parkingSlot.name,
                floor: node.parkingSlot.floor.name,
                parkingLot: node.parkingSlot.floor.parkingLot.name
            },
            gateway: {
                id: node.gatewayId,
                name: node.gatewayId ? 'ChirpStack Gateway' : 'Not Connected'
            },
            createdAt: node.createdAt
        }));
        // Calculate pagination metadata
        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        return res.json({
            success: true,
            message: 'Nodes retrieved successfully',
            data: formattedNodes,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: total,
                itemsPerPage: limit,
                hasNextPage,
                hasPrevPage
            }
        });
    }
    catch (error) {
        loggerService_1.logger.error('Get nodes error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve nodes'
        });
    }
};
exports.getNodes = getNodes;
/**
 * Get a specific node by ID
 */
const getNode = async (req, res) => {
    const { nodeId } = req.params;
    try {
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        const node = await nodeRepository.findOne({
            where: {
                id: nodeId,
                admin: { id: req.user.id }
            },
            relations: ['parkingSlot', 'parkingSlot.floor', 'parkingSlot.floor.parkingLot']
        });
        if (!node) {
            return res.status(404).json({
                success: false,
                message: 'Node not found'
            });
        }
        return res.json({
            success: true,
            message: 'Node retrieved successfully',
            data: {
                id: node.id,
                name: node.name,
                chirpstackDeviceId: node.chirpstackDeviceId,
                description: node.description,
                status: node.status,
                isOnline: node.isOnline,
                lastSeen: node.lastSeen,
                batteryLevel: node.batteryLevel,
                distance: node.distance,
                percentage: node.percentage,
                slotStatus: node.slotStatus,
                parkingSlot: {
                    id: node.parkingSlot.id,
                    name: node.parkingSlot.name,
                    floor: node.parkingSlot.floor.name,
                    parkingLot: node.parkingSlot.floor.parkingLot.name
                },
                gateway: {
                    id: node.gatewayId,
                    name: node.gatewayId ? 'ChirpStack Gateway' : 'Not Connected'
                },
                metadata: node.metadata,
                createdAt: node.createdAt,
                updatedAt: node.updatedAt
            }
        });
    }
    catch (error) {
        loggerService_1.logger.error('Get node error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve node'
        });
    }
};
exports.getNode = getNode;
/**
 * Create a new node
 */
const createNode = async (req, res) => {
    const { name, chirpstackDeviceId, description, parkingSlotId, latitude, longitude } = req.body;
    try {
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        const parkingSlotRepository = data_source_1.AppDataSource.getRepository(ParkingSlot_1.ParkingSlot);
        // Check if ChirpStack Device ID is unique
        const existingNode = await nodeRepository.findOne({
            where: { chirpstackDeviceId }
        });
        if (existingNode) {
            return res.status(400).json({
                success: false,
                message: 'ChirpStack Device ID already exists'
            });
        }
        // Validate parking slot exists and belongs to admin
        const parkingSlot = await parkingSlotRepository.findOne({
            where: {
                id: parkingSlotId,
                floor: {
                    parkingLot: {
                        admin: { id: req.user.id }
                    }
                }
            },
            relations: ['node'] // Check if already has a node
        });
        if (!parkingSlot) {
            return res.status(404).json({
                success: false,
                message: 'Parking slot not found'
            });
        }
        if (parkingSlot.node) {
            return res.status(400).json({
                success: false,
                message: 'Parking slot already has a node assigned'
            });
        }
        // Create new node
        const newNode = nodeRepository.create({
            name,
            chirpstackDeviceId,
            description,
            latitude,
            longitude,
            admin: { id: req.user.id },
            parkingSlot,
            metadata: {}
        });
        const savedNode = await nodeRepository.save(newNode);
        loggerService_1.logger.info('Node created successfully', {
            nodeId: savedNode.id,
            adminId: req.user.id,
            chirpstackDeviceId
        });
        return res.status(201).json({
            success: true,
            message: 'Node created successfully',
            data: {
                id: savedNode.id,
                name: savedNode.name,
                chirpstackDeviceId: savedNode.chirpstackDeviceId,
                description: savedNode.description,
                status: savedNode.status,
                createdAt: savedNode.createdAt
            }
        });
    }
    catch (error) {
        loggerService_1.logger.error('Create node error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create node'
        });
    }
};
exports.createNode = createNode;
/**
 * Update node information (name, description, location, etc.)
 */
const updateNode = async (req, res) => {
    const { nodeId } = req.params;
    const { name, chirpstackDeviceId, description, parkingSlotId, latitude, longitude } = req.body;
    try {
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        const parkingSlotRepository = data_source_1.AppDataSource.getRepository(ParkingSlot_1.ParkingSlot);
        // Find the node
        const node = await nodeRepository.findOne({
            where: {
                id: nodeId,
                admin: { id: req.user.id }
            },
            relations: ['parkingSlot']
        });
        if (!node) {
            return res.status(404).json({
                success: false,
                message: 'Node not found'
            });
        }
        // Check if ChirpStack Device ID is unique (if being updated)
        if (chirpstackDeviceId && chirpstackDeviceId !== node.chirpstackDeviceId) {
            const existingNode = await nodeRepository.findOne({
                where: { chirpstackDeviceId }
            });
            if (existingNode && existingNode.id !== nodeId) {
                return res.status(400).json({
                    success: false,
                    message: 'ChirpStack Device ID already exists'
                });
            }
        }
        // Validate new parking slot if provided
        let newParkingSlot = null;
        if (parkingSlotId && parkingSlotId !== node.parkingSlot.id) {
            newParkingSlot = await parkingSlotRepository.findOne({
                where: {
                    id: parkingSlotId,
                    floor: {
                        parkingLot: {
                            admin: { id: req.user.id }
                        }
                    }
                },
                relations: ['node']
            });
            if (!newParkingSlot) {
                return res.status(404).json({
                    success: false,
                    message: 'Parking slot not found'
                });
            }
            if (newParkingSlot.node && newParkingSlot.node.id !== nodeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Parking slot already has another node assigned'
                });
            }
        }
        // Update node fields
        if (name !== undefined)
            node.name = name;
        if (chirpstackDeviceId !== undefined)
            node.chirpstackDeviceId = chirpstackDeviceId;
        if (description !== undefined)
            node.description = description;
        if (latitude !== undefined)
            node.latitude = latitude;
        if (longitude !== undefined)
            node.longitude = longitude;
        if (newParkingSlot)
            node.parkingSlot = newParkingSlot;
        const updatedNode = await nodeRepository.save(node);
        loggerService_1.logger.info('Node updated successfully', {
            nodeId: updatedNode.id,
            adminId: req.user.id,
            updates: { name, chirpstackDeviceId, description, parkingSlotId, latitude, longitude }
        });
        return res.json({
            success: true,
            message: 'Node updated successfully',
            data: {
                id: updatedNode.id,
                name: updatedNode.name,
                chirpstackDeviceId: updatedNode.chirpstackDeviceId,
                description: updatedNode.description,
                latitude: updatedNode.latitude,
                longitude: updatedNode.longitude,
                status: updatedNode.status,
                parkingSlot: {
                    id: updatedNode.parkingSlot.id,
                    name: updatedNode.parkingSlot.name
                },
                updatedAt: updatedNode.updatedAt
            }
        });
    }
    catch (error) {
        loggerService_1.logger.error('Update node error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update node'
        });
    }
};
exports.updateNode = updateNode;
/**
 * Simple API to update node status with percentage-based logic
 * This is the main API for updating sensor data
 */
const updateNodeStatus = async (req, res) => {
    const { nodeId } = req.params;
    const { distance, percentage, batteryLevel } = req.body;
    try {
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        const node = await nodeRepository.findOne({
            where: {
                id: nodeId,
                admin: { id: req.user.id }
            },
            relations: ['parkingSlot']
        });
        if (!node) {
            return res.status(404).json({
                success: false,
                message: 'Node not found'
            });
        }
        // Validate input
        if (percentage !== undefined && (percentage < 0 || percentage > 100)) {
            return res.status(400).json({
                success: false,
                message: 'Percentage must be between 0 and 100'
            });
        }
        // Determine slot status based on percentage
        let slotStatus = 'unknown';
        if (percentage !== undefined) {
            if (percentage >= 80) {
                slotStatus = 'available';
            }
            else if (percentage < 60) {
                slotStatus = 'reserved';
            }
            else {
                // Indeterminate range (60-79%)
                slotStatus = 'occupied';
            }
        }
        // Update node metadata with all sensor data
        const updatedMetadata = {
            ...node.metadata,
            distance: distance !== undefined ? distance : node.metadata?.distance,
            percentage: percentage !== undefined ? percentage : node.metadata?.percentage,
            batteryLevel: batteryLevel !== undefined ? batteryLevel : node.metadata?.batteryLevel,
            state: slotStatus === 'available' ? 'FREE' : slotStatus === 'reserved' || slotStatus === 'occupied' ? 'OCCUPIED' : undefined,
            lastUpdated: new Date().toISOString(),
            isOnline: true
        };
        node.metadata = updatedMetadata;
        node.lastSeen = new Date();
        await nodeRepository.save(node);
        // Create a status log entry for history
        const statusLogRepository = data_source_1.AppDataSource.getRepository(ParkingStatusLog_1.ParkingStatusLog);
        const statusLog = statusLogRepository.create({
            parkingSlot: node.parkingSlot,
            status: slotStatus,
            detectedAt: new Date(),
            distance: distance !== undefined ? distance : null,
            percentage: percentage !== undefined ? percentage : null,
            batteryLevel: batteryLevel !== undefined ? batteryLevel : null,
            metadata: {
                isOnline: true,
                nodeId: node.id,
                updatedViaApi: true
            }
        });
        await statusLogRepository.save(statusLog);
        loggerService_1.logger.info('Node status updated with history log', {
            nodeId: node.id,
            parkingSlotId: node.parkingSlot.id,
            distance,
            percentage,
            batteryLevel,
            slotStatus,
            statusLogId: statusLog.id,
            adminId: req.user.id
        });
        return res.json({
            success: true,
            message: 'Node status updated successfully',
            data: {
                nodeId: node.id,
                distance: node.distance,
                percentage: node.percentage,
                batteryLevel: node.batteryLevel,
                slotStatus: node.slotStatus,
                lastSeen: node.lastSeen,
                parkingSlot: {
                    id: node.parkingSlot.id,
                    name: node.parkingSlot.name
                }
            }
        });
    }
    catch (error) {
        loggerService_1.logger.error('Update node status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update node status'
        });
    }
};
exports.updateNodeStatus = updateNodeStatus;
/**
 * Get nodes by parking slot IDs
 */
const getNodesBySlots = async (req, res) => {
    const { slotIds } = req.body; // Array of parking slot IDs
    try {
        if (!slotIds || !Array.isArray(slotIds) || slotIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'slotIds array is required and cannot be empty'
            });
        }
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        const nodes = await nodeRepository.find({
            where: {
                admin: { id: req.user.id },
                parkingSlot: { id: (0, typeorm_1.In)(slotIds) }
            },
            relations: ['parkingSlot', 'parkingSlot.floor', 'parkingSlot.floor.parkingLot'],
            order: { createdAt: 'DESC' }
        });
        const formattedNodes = nodes.map(node => ({
            id: node.id,
            name: node.name,
            chirpstackDeviceId: node.chirpstackDeviceId,
            description: node.description,
            status: node.status,
            isOnline: node.isOnline,
            lastSeen: node.lastSeen,
            batteryLevel: node.batteryLevel,
            distance: node.distance,
            percentage: node.percentage,
            slotStatus: node.slotStatus,
            parkingSlot: {
                id: node.parkingSlot.id,
                name: node.parkingSlot.name,
                floor: node.parkingSlot.floor.name,
                parkingLot: node.parkingSlot.floor.parkingLot.name
            },
            gateway: {
                id: node.gatewayId,
                name: node.gatewayId ? 'ChirpStack Gateway' : 'Not Connected'
            },
            metadata: node.metadata,
            createdAt: node.createdAt,
            updatedAt: node.updatedAt
        }));
        return res.json({
            success: true,
            message: `Found ${formattedNodes.length} nodes for ${slotIds.length} parking slots`,
            data: formattedNodes,
            count: formattedNodes.length
        });
    }
    catch (error) {
        loggerService_1.logger.error('Get nodes by slots error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve nodes by slots'
        });
    }
};
exports.getNodesBySlots = getNodesBySlots;
/**
 * Get unassigned nodes (nodes without parking slot assignment)
 */
const getUnassignedNodes = async (req, res) => {
    try {
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        // Extract query parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const gatewayId = req.query.gatewayId;
        // Calculate skip for pagination
        const skip = (page - 1) * limit;
        // Build where clause - find nodes without parking slot
        const whereClause = {
            admin: { id: req.user.id },
            parkingSlot: null
        };
        // Add gatewayId filter if provided
        if (gatewayId) {
            whereClause.gatewayId = gatewayId;
        }
        // Get unassigned nodes with pagination
        const [nodes, total] = await nodeRepository.findAndCount({
            where: whereClause,
            order: { createdAt: 'DESC' },
            skip: skip,
            take: limit
        });
        const formattedNodes = nodes.map(node => ({
            id: node.id,
            name: node.name,
            chirpstackDeviceId: node.chirpstackDeviceId,
            status: 'unassigned',
            batteryLevel: node.batteryLevel,
            gatewayId: node.gatewayId,
            createdAt: node.createdAt
        }));
        loggerService_1.logger.info('Unassigned nodes retrieved', {
            adminId: req.user.id,
            count: total,
            page,
            limit
        });
        return res.json({
            success: true,
            data: formattedNodes,
            count: total
        });
    }
    catch (error) {
        loggerService_1.logger.error('Get unassigned nodes error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve unassigned nodes'
        });
    }
};
exports.getUnassignedNodes = getUnassignedNodes;
/**
 * Delete a node
 */
const deleteNode = async (req, res) => {
    const { nodeId } = req.params;
    try {
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        const node = await nodeRepository.findOne({
            where: {
                id: nodeId,
                admin: { id: req.user.id }
            }
        });
        if (!node) {
            return res.status(404).json({
                success: false,
                message: 'Node not found'
            });
        }
        await nodeRepository.remove(node);
        loggerService_1.logger.info('Node deleted successfully', {
            nodeId,
            adminId: req.user.id
        });
        return res.json({
            success: true,
            message: 'Node deleted successfully'
        });
    }
    catch (error) {
        loggerService_1.logger.error('Delete node error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete node'
        });
    }
};
exports.deleteNode = deleteNode;
