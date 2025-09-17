"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNode = exports.updateNodeStatus = exports.createNode = exports.getNode = exports.getNodes = void 0;
const data_source_1 = require("../data-source");
const Node_1 = require("../models/Node");
const Gateway_1 = require("../models/Gateway");
const ParkingSlot_1 = require("../models/ParkingSlot");
const loggerService_1 = require("../services/loggerService");
/**
 * Get all nodes for the authenticated admin
 */
const getNodes = async (req, res) => {
    try {
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        const nodes = await nodeRepository.find({
            where: {
                admin: { id: req.user.id }
            },
            relations: ['parkingSlot', 'parkingSlot.floor', 'parkingSlot.floor.parkingLot', 'gateway'],
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
                id: node.gateway.id,
                name: node.gateway.name
            },
            createdAt: node.createdAt
        }));
        return res.json({
            success: true,
            message: 'Nodes retrieved successfully',
            data: formattedNodes
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
            relations: ['parkingSlot', 'parkingSlot.floor', 'parkingSlot.floor.parkingLot', 'gateway']
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
                    id: node.gateway.id,
                    name: node.gateway.name
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
    const { name, chirpstackDeviceId, description, gatewayId, parkingSlotId, latitude, longitude } = req.body;
    try {
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        const gatewayRepository = data_source_1.AppDataSource.getRepository(Gateway_1.Gateway);
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
        // Validate gateway exists and belongs to admin
        const gateway = await gatewayRepository.findOne({
            where: {
                id: gatewayId
            },
            relations: ['linkedAdmin']
        });
        if (!gateway || gateway.linkedAdmin?.id !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Gateway not found'
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
            gateway,
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
        // Update node metadata
        const updatedMetadata = {
            ...node.metadata,
            distance: distance || node.metadata?.distance,
            percentage: percentage !== undefined ? percentage : node.metadata?.percentage,
            batteryLevel: batteryLevel !== undefined ? batteryLevel : node.metadata?.batteryLevel,
            lastUpdated: new Date().toISOString()
        };
        node.metadata = updatedMetadata;
        node.lastSeen = new Date();
        await nodeRepository.save(node);
        // Determine slot status based on percentage
        let slotStatus = null;
        if (percentage !== undefined) {
            if (percentage >= 80) {
                slotStatus = 'available';
            }
            else if (percentage < 60) {
                slotStatus = 'reserved';
            }
        }
        loggerService_1.logger.info('Node status updated', {
            nodeId: node.id,
            parkingSlotId: node.parkingSlot.id,
            distance,
            percentage,
            batteryLevel,
            slotStatus,
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
