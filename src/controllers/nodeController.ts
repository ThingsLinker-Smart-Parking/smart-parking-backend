import { Response } from 'express';
import { AppDataSource } from '../data-source';
import { Node } from '../models/Node';
import { ParkingSlot } from '../models/ParkingSlot';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../services/loggerService';
import { In } from 'typeorm';

/**
 * Get all nodes for the authenticated admin
 */
export const getNodes = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const nodeRepository = AppDataSource.getRepository(Node);

        const nodes = await nodeRepository.find({
            where: {
                admin: { id: req.user!.id }
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
            createdAt: node.createdAt
        }));

        return res.json({
            success: true,
            message: 'Nodes retrieved successfully',
            data: formattedNodes
        });

    } catch (error) {
        logger.error('Get nodes error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve nodes'
        });
    }
};

/**
 * Get a specific node by ID
 */
export const getNode = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { nodeId } = req.params;

    try {
        const nodeRepository = AppDataSource.getRepository(Node);

        const node = await nodeRepository.findOne({
            where: {
                id: nodeId,
                admin: { id: req.user!.id }
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

    } catch (error) {
        logger.error('Get node error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve node'
        });
    }
};

/**
 * Create a new node
 */
export const createNode = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { name, chirpstackDeviceId, description, parkingSlotId, latitude, longitude } = req.body;

    try {
        const nodeRepository = AppDataSource.getRepository(Node);
        const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);

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
                        admin: { id: req.user!.id }
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
            admin: { id: req.user!.id },
            parkingSlot,
            metadata: {}
        });

        const savedNode = await nodeRepository.save(newNode);

        logger.info('Node created successfully', {
            nodeId: savedNode.id,
            adminId: req.user!.id,
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

    } catch (error) {
        logger.error('Create node error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create node'
        });
    }
};

/**
 * Simple API to update node status with percentage-based logic
 * This is the main API for updating sensor data
 */
export const updateNodeStatus = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { nodeId } = req.params;
    const { distance, percentage, batteryLevel } = req.body;

    try {
        const nodeRepository = AppDataSource.getRepository(Node);

        const node = await nodeRepository.findOne({
            where: {
                id: nodeId,
                admin: { id: req.user!.id }
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
        let slotStatus: 'available' | 'reserved' | null = null;
        if (percentage !== undefined) {
            if (percentage >= 80) {
                slotStatus = 'available';
            } else if (percentage < 60) {
                slotStatus = 'reserved';
            }
        }

        logger.info('Node status updated', {
            nodeId: node.id,
            parkingSlotId: node.parkingSlot.id,
            distance,
            percentage,
            batteryLevel,
            slotStatus,
            adminId: req.user!.id
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

    } catch (error) {
        logger.error('Update node status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update node status'
        });
    }
};

/**
 * Get nodes by parking slot IDs
 */
export const getNodesBySlots = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { slotIds } = req.body; // Array of parking slot IDs

    try {
        if (!slotIds || !Array.isArray(slotIds) || slotIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'slotIds array is required and cannot be empty'
            });
        }

        const nodeRepository = AppDataSource.getRepository(Node);

        const nodes = await nodeRepository.find({
            where: {
                admin: { id: req.user!.id },
                parkingSlot: { id: In(slotIds) }
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

    } catch (error) {
        logger.error('Get nodes by slots error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve nodes by slots'
        });
    }
};

/**
 * Delete a node
 */
export const deleteNode = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { nodeId } = req.params;

    try {
        const nodeRepository = AppDataSource.getRepository(Node);

        const node = await nodeRepository.findOne({
            where: {
                id: nodeId,
                admin: { id: req.user!.id }
            }
        });

        if (!node) {
            return res.status(404).json({
                success: false,
                message: 'Node not found'
            });
        }

        await nodeRepository.remove(node);

        logger.info('Node deleted successfully', {
            nodeId,
            adminId: req.user!.id
        });

        return res.json({
            success: true,
            message: 'Node deleted successfully'
        });

    } catch (error) {
        logger.error('Delete node error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete node'
        });
    }
};