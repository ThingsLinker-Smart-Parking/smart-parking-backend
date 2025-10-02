import { Response } from 'express';
import { AppDataSource } from '../data-source';
import { ParkingSlot } from '../models/ParkingSlot';
import { Floor } from '../models/Floor';
import { Node } from '../models/Node';
import { ParkingStatusLog } from '../models/ParkingStatusLog';
import { AuthRequest } from '../middleware/auth';
import { validateRequired, validateUuidParam } from '../utils/validation';
import { logger } from '../services/loggerService';

// Get all parking slots for a specific floor
export const getParkingSlotsByFloor = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { floorId } = req.params;
    
    try {
        // Validate UUID
        const floorIdValidation = validateUuidParam(floorId, 'floorId');
        if (!floorIdValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: floorIdValidation.error
            });
        }

        const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);
        const floorRepository = AppDataSource.getRepository(Floor);
        
        // Verify floor ownership
        const floor = await floorRepository.findOne({
            where: { 
                id: floorId,
                parkingLot: { admin: { id: req.user!.id } }
            }
        });
        
        if (!floor) {
            return res.status(404).json({
                success: false,
                message: 'Floor not found or access denied'
            });
        }
        
        const parkingSlots = await parkingSlotRepository.find({
            where: { floor: { id: floor.id } },
            relations: ['statusLogs'],
            order: { name: 'ASC' }
        });
        
        return res.json({
            success: true,
            message: 'Parking slots retrieved successfully',
            data: parkingSlots,
            count: parkingSlots.length
        });
    } catch (error) {
        logger.error('Get parking slots error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch parking slots' 
        });
    }
};

// Get parking slot by ID
export const getParkingSlotById = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { id } = req.params;
    
    try {
        // Validate UUID
        const idValidation = validateUuidParam(id, 'id');
        if (!idValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: idValidation.error
            });
        }

        const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);
        const parkingSlot = await parkingSlotRepository.findOne({
            where: { 
                id: id,
                floor: { parkingLot: { admin: { id: req.user!.id } } }
            },
            relations: ['floor', 'floor.parkingLot', 'statusLogs']
        });
        
        if (!parkingSlot) {
            return res.status(404).json({
                success: false,
                message: 'Parking slot not found or access denied'
            });
        }
        
        return res.json({
            success: true,
            message: 'Parking slot retrieved successfully',
            data: parkingSlot
        });
    } catch (error) {
        logger.error('Get parking slot by ID error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch parking slot' 
        });
    }
};

// Create new parking slot
export const createParkingSlot = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { floorId } = req.params;
    const { name, isReservable = false } = req.body;

    try {
        // Validate UUID
        const floorIdValidation = validateUuidParam(floorId, 'floorId');
        if (!floorIdValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: floorIdValidation.error
            });
        }

        // Validation
        const validationErrors = validateRequired({ name });
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);
        const floorRepository = AppDataSource.getRepository(Floor);
        
        // Verify floor ownership
        const floor = await floorRepository.findOne({
            where: { 
                id: floorId,
                parkingLot: { admin: { id: req.user!.id } }
            }
        });
        
        if (!floor) {
            return res.status(404).json({
                success: false,
                message: 'Floor not found or access denied'
            });
        }
        
        // Check if parking slot name already exists for this floor
        const existingParkingSlot = await parkingSlotRepository.findOne({
            where: { 
                name: name.trim(),
                floor: { id: floor.id }
            }
        });
        
        if (existingParkingSlot) {
            return res.status(400).json({
                success: false,
                message: 'Parking slot with this name already exists on this floor'
            });
        }
        
        const newParkingSlot = parkingSlotRepository.create({
            name: name.trim(),
            isReservable: Boolean(isReservable),
            floor: floor
        });

        await parkingSlotRepository.save(newParkingSlot);
        
        return res.status(201).json({
            success: true,
            message: 'Parking slot created successfully',
            data: newParkingSlot
        });
    } catch (error) {
        logger.error('Create parking slot error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to create parking slot' 
        });
    }
};

// Update parking slot
export const updateParkingSlot = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { name, isReservable } = req.body;
    
    try {
        // Validate UUID
        const idValidation = validateUuidParam(id, 'id');
        if (!idValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: idValidation.error
            });
        }

        const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);
        const parkingSlot = await parkingSlotRepository.findOne({
            where: { 
                id: id,
                floor: { parkingLot: { admin: { id: req.user!.id } } }
            },
            relations: ['floor']
        });
        
        if (!parkingSlot) {
            return res.status(404).json({
                success: false,
                message: 'Parking slot not found or access denied'
            });
        }
        
        // Update name if provided
        if (name) {
            // Check if new name already exists for this floor
            const existingParkingSlot = await parkingSlotRepository.findOne({
                where: { 
                    name: name.trim(),
                    floor: { id: parkingSlot.floor.id }
                }
            });
            
            if (existingParkingSlot && existingParkingSlot.id !== parkingSlot.id) {
                return res.status(400).json({
                    success: false,
                    message: 'Parking slot with this name already exists on this floor'
                });
            }
            
            parkingSlot.name = name.trim();
        }
        
        // Update reservable status if provided
        if (isReservable !== undefined) {
            parkingSlot.isReservable = Boolean(isReservable);
        }
        
        await parkingSlotRepository.save(parkingSlot);
        
        return res.json({
            success: true,
            message: 'Parking slot updated successfully',
            data: parkingSlot
        });
    } catch (error) {
        logger.error('Update parking slot error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to update parking slot' 
        });
    }
};

// Delete parking slot
export const deleteParkingSlot = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { id } = req.params;
    
    try {
        // Validate UUID
        const idValidation = validateUuidParam(id, 'id');
        if (!idValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: idValidation.error
            });
        }

        const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);
        const parkingSlot = await parkingSlotRepository.findOne({
            where: { 
                id: id,
                floor: { parkingLot: { admin: { id: req.user!.id } } }
            },
            relations: ['statusLogs']
        });
        
        if (!parkingSlot) {
            return res.status(404).json({
                success: false,
                message: 'Parking slot not found or access denied'
            });
        }
        
        // Check if parking slot has a node assigned
        if (parkingSlot.node) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete parking slot with assigned node. Unassign node first.'
            });
        }
        
        await parkingSlotRepository.remove(parkingSlot);
        
        return res.json({
            success: true,
            message: 'Parking slot deleted successfully'
        });
    } catch (error) {
        logger.error('Delete parking slot error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to delete parking slot' 
        });
    }
};

// Assign node to parking slot
export const assignNodeToParkingSlot = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { nodeId } = req.body;
    
    try {
        // Validate UUIDs
        const idValidation = validateUuidParam(id, 'id');
        if (!idValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: idValidation.error
            });
        }

        if (!nodeId) {
            return res.status(400).json({
                success: false,
                message: 'Node ID is required'
            });
        }

        const nodeIdValidation = validateUuidParam(nodeId, 'nodeId');
        if (!nodeIdValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: nodeIdValidation.error
            });
        }
        
        const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);
        const nodeRepository = AppDataSource.getRepository(Node);
        
        // Check parking slot ownership
        const parkingSlot = await parkingSlotRepository.findOne({
            where: { 
                id: id,
                floor: { parkingLot: { admin: { id: req.user!.id } } }
            },
            relations: []
        });
        
        if (!parkingSlot) {
            return res.status(404).json({
                success: false,
                message: 'Parking slot not found or access denied'
            });
        }
        
        // Check if parking slot already has a node
        if (parkingSlot.node) {
            return res.status(400).json({
                success: false,
                message: 'Parking slot already has a node assigned'
            });
        }
        
        // Check node ownership (admin's nodes under their gateways)
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
                message: 'Node not found or not accessible'
            });
        }
        
        // Check if node is already assigned to another parking slot
        if (node.parkingSlot) {
            return res.status(400).json({
                success: false,
                message: 'Node is already assigned to another parking slot'
            });
        }
        
        // Assign node to parking slot
        node.parkingSlot = parkingSlot;
        await nodeRepository.save(node);
        
        return res.json({
            success: true,
            message: 'Node assigned to parking slot successfully',
            data: { parkingSlot, node }
        });
    } catch (error) {
        logger.error('Assign node error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to assign node to parking slot' 
        });
    }
};

// Unassign node from parking slot
export const unassignNodeFromParkingSlot = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { id } = req.params;
    
    try {
        // Validate UUID
        const idValidation = validateUuidParam(id, 'id');
        if (!idValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: idValidation.error
            });
        }

        const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);
        const nodeRepository = AppDataSource.getRepository(Node);
        
        // Check parking slot ownership
        const parkingSlot = await parkingSlotRepository.findOne({
            where: { 
                id: id,
                floor: { parkingLot: { admin: { id: req.user!.id } } }
            },
            relations: []
        });
        
        if (!parkingSlot) {
            return res.status(404).json({
                success: false,
                message: 'Parking slot not found or access denied'
            });
        }
        
        if (!parkingSlot.node) {
            return res.status(400).json({
                success: false,
                message: 'No node assigned to this parking slot'
            });
        }
        
        // Unassign node
        const node = await nodeRepository.findOne({
            where: { id: parkingSlot.node.id }
        });
        
        if (node) {
            node.parkingSlot = null as any;
            await nodeRepository.save(node);
        }
        
        return res.json({
            success: true,
            message: 'Node unassigned from parking slot successfully'
        });
    } catch (error) {
        logger.error('Unassign node error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to unassign node from parking slot' 
        });
    }
};

// Get parking slot status and history
export const getParkingSlotStatus = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { limit = 10 } = req.query;
    
    try {
        // Validate UUID
        const idValidation = validateUuidParam(id, 'id');
        if (!idValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: idValidation.error
            });
        }

        const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);
        const nodeRepository = AppDataSource.getRepository(Node);
        
        const parkingSlot = await parkingSlotRepository.findOne({
            where: { 
                id: id,
                floor: { parkingLot: { admin: { id: req.user!.id } } }
            },
            relations: ['floor', 'floor.parkingLot']
        });
        
        if (!parkingSlot) {
            return res.status(404).json({
                success: false,
                message: 'Parking slot not found or access denied'
            });
        }
        
        // Get the associated node
        const node = await nodeRepository.findOne({
            where: {
                parkingSlot: { id: parkingSlot.id },
                admin: { id: req.user!.id }
            }
        });

        if (!node) {
            return res.status(404).json({
                success: false,
                message: 'No sensor node found for this parking slot'
            });
        }

        // Get actual historical data from database
        const statusLogRepository = AppDataSource.getRepository(ParkingStatusLog);
        const limitNum = parseInt(limit as string);

        const statusLogs = await statusLogRepository.find({
            where: {
                parkingSlot: { id: parkingSlot.id }
            },
            order: { detectedAt: 'DESC' },
            take: limitNum
        });

        // Format historical data from database records (reverse to show oldest first)
        const historicalData = statusLogs.reverse().map(log => ({
            timestamp: log.detectedAt.toISOString(),
            status: log.status,
            percentage: log.percentage ? parseFloat(log.percentage.toString()) : null,
            distance: log.distance ? parseFloat(log.distance.toString()) : null,
            batteryLevel: log.batteryLevel,
            isOnline: log.metadata?.isOnline ?? true
        }));

        // Current status
        const currentStatus = {
            slotId: parkingSlot.id,
            slotName: parkingSlot.name,
            currentStatus: node.slotStatus,
            percentage: node.percentage,
            distance: node.distance,
            batteryLevel: node.batteryLevel,
            isOnline: node.isOnline,
            lastUpdated: node.lastSeen,
            node: {
                id: node.id,
                name: node.name,
                chirpstackDeviceId: node.chirpstackDeviceId
            },
            floor: {
                id: parkingSlot.floor.id,
                name: parkingSlot.floor.name
            },
            parkingLot: {
                id: parkingSlot.floor.parkingLot.id,
                name: parkingSlot.floor.parkingLot.name
            }
        };

        logger.info('Parking slot status retrieved', {
            slotId: parkingSlot.id,
            adminId: req.user!.id,
            status: node.slotStatus
        });
        
        return res.json({
            success: true,
            message: 'Parking slot status retrieved successfully',
            data: {
                current: currentStatus,
                history: historicalData,
                metadata: {
                    limit: limitNum,
                    count: historicalData.length,
                    logic: {
                        available: 'percentage >= 80%',
                        reserved: 'percentage < 60%',
                        indeterminate: 'percentage 60-79%'
                    }
                }
            }
        });
    } catch (error) {
        logger.error('Get parking slot status error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch parking slot status' 
        });
    }
};

// Bulk create parking slots
export const bulkCreateParkingSlots = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { floorId } = req.params;
    const { slots } = req.body;
    
    try {
        // Validate UUID
        const floorIdValidation = validateUuidParam(floorId, 'floorId');
        if (!floorIdValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: floorIdValidation.error
            });
        }

        // Validation
        if (!Array.isArray(slots) || slots.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Slots array is required and must not be empty'
            });
        }
        
        const floorRepository = AppDataSource.getRepository(Floor);
        const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);
        
        // Verify floor ownership
        const floor = await floorRepository.findOne({
            where: { 
                id: floorId,
                parkingLot: { admin: { id: req.user!.id } }
            }
        });
        
        if (!floor) {
            return res.status(404).json({
                success: false,
                message: 'Floor not found or access denied'
            });
        }
        
        // Validate all slot names
        const slotNames = slots.map(slot => slot.name?.trim()).filter(Boolean);
        if (slotNames.length !== slots.length) {
            return res.status(400).json({
                success: false,
                message: 'All slots must have valid names'
            });
        }
        
        // Check for duplicate names in the request
        const duplicateNames = slotNames.filter((name, index) => slotNames.indexOf(name) !== index);
        if (duplicateNames.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Duplicate slot names found: ${duplicateNames.join(', ')}`
            });
        }
        
        // Check if any slot names already exist for this floor
        const existingSlots = await parkingSlotRepository.find({
            where: { 
                floor: { id: floor.id },
                name: slotNames as any
            }
        });
        
        if (existingSlots.length > 0) {
            const existingNames = existingSlots.map(slot => slot.name);
            return res.status(400).json({
                success: false,
                message: `Slot names already exist: ${existingNames.join(', ')}`
            });
        }
        
        // Create all slots
        const newSlots = slots.map(slot => 
            parkingSlotRepository.create({
                name: slot.name.trim(),
                isReservable: Boolean(slot.isReservable),
                floor: floor
            })
        );
        
        const savedSlots = await parkingSlotRepository.save(newSlots);
        
        return res.status(201).json({
            success: true,
            message: `${savedSlots.length} parking slots created successfully`,
            data: savedSlots
        });
    } catch (error) {
        logger.error('Bulk create parking slots error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create parking slots'
        });
    }
};

// Get all parking slots for current admin
export const getAllParkingSlots = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);

        const parkingSlots = await parkingSlotRepository.find({
            where: {
                floor: {
                    parkingLot: { admin: { id: req.user!.id } }
                }
            },
            relations: ['floor', 'floor.parkingLot'],
            order: {
                floor: {
                    parkingLot: { name: 'ASC' },
                    level: 'ASC'
                },
                name: 'ASC'
            }
        });

        return res.json({
            success: true,
            message: 'All parking slots retrieved successfully',
            data: parkingSlots,
            count: parkingSlots.length
        });
    } catch (error) {
        logger.error('Get all parking slots error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch parking slots'
        });
    }
};