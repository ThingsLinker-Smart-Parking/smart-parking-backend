"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllParkingSlots = exports.quickAssignNode = exports.bulkCreateParkingSlots = exports.getParkingSlotStatus = exports.unassignNodeFromParkingSlot = exports.assignNodeToParkingSlot = exports.deleteParkingSlot = exports.updateParkingSlot = exports.createParkingSlot = exports.getParkingSlotById = exports.getParkingSlotsByFloor = void 0;
const data_source_1 = require("../data-source");
const ParkingSlot_1 = require("../models/ParkingSlot");
const Floor_1 = require("../models/Floor");
const Node_1 = require("../models/Node");
const ParkingStatusLog_1 = require("../models/ParkingStatusLog");
const validation_1 = require("../utils/validation");
const loggerService_1 = require("../services/loggerService");
// Get all parking slots for a specific floor
const getParkingSlotsByFloor = async (req, res) => {
    const { floorId } = req.params;
    try {
        // Validate UUID
        const floorIdValidation = (0, validation_1.validateUuidParam)(floorId, 'floorId');
        if (!floorIdValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: floorIdValidation.error
            });
        }
        const parkingSlotRepository = data_source_1.AppDataSource.getRepository(ParkingSlot_1.ParkingSlot);
        const floorRepository = data_source_1.AppDataSource.getRepository(Floor_1.Floor);
        // Verify floor ownership
        const floor = await floorRepository.findOne({
            where: {
                id: floorId,
                parkingLot: { admin: { id: req.user.id } }
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
    }
    catch (error) {
        loggerService_1.logger.error('Get parking slots error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch parking slots'
        });
    }
};
exports.getParkingSlotsByFloor = getParkingSlotsByFloor;
// Get parking slot by ID
const getParkingSlotById = async (req, res) => {
    const { id } = req.params;
    try {
        // Validate UUID
        const idValidation = (0, validation_1.validateUuidParam)(id, 'id');
        if (!idValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: idValidation.error
            });
        }
        const parkingSlotRepository = data_source_1.AppDataSource.getRepository(ParkingSlot_1.ParkingSlot);
        const parkingSlot = await parkingSlotRepository.findOne({
            where: {
                id: id,
                floor: { parkingLot: { admin: { id: req.user.id } } }
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
    }
    catch (error) {
        loggerService_1.logger.error('Get parking slot by ID error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch parking slot'
        });
    }
};
exports.getParkingSlotById = getParkingSlotById;
// Create new parking slot
const createParkingSlot = async (req, res) => {
    const { floorId } = req.params;
    const { name, isReservable = false } = req.body;
    try {
        // Validate UUID
        const floorIdValidation = (0, validation_1.validateUuidParam)(floorId, 'floorId');
        if (!floorIdValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: floorIdValidation.error
            });
        }
        // Validation
        const validationErrors = (0, validation_1.validateRequired)({ name });
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }
        const parkingSlotRepository = data_source_1.AppDataSource.getRepository(ParkingSlot_1.ParkingSlot);
        const floorRepository = data_source_1.AppDataSource.getRepository(Floor_1.Floor);
        // Verify floor ownership
        const floor = await floorRepository.findOne({
            where: {
                id: floorId,
                parkingLot: { admin: { id: req.user.id } }
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
    }
    catch (error) {
        loggerService_1.logger.error('Create parking slot error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create parking slot'
        });
    }
};
exports.createParkingSlot = createParkingSlot;
// Update parking slot
const updateParkingSlot = async (req, res) => {
    const { id } = req.params;
    const { name, isReservable } = req.body;
    try {
        // Validate UUID
        const idValidation = (0, validation_1.validateUuidParam)(id, 'id');
        if (!idValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: idValidation.error
            });
        }
        const parkingSlotRepository = data_source_1.AppDataSource.getRepository(ParkingSlot_1.ParkingSlot);
        const parkingSlot = await parkingSlotRepository.findOne({
            where: {
                id: id,
                floor: { parkingLot: { admin: { id: req.user.id } } }
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
    }
    catch (error) {
        loggerService_1.logger.error('Update parking slot error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update parking slot'
        });
    }
};
exports.updateParkingSlot = updateParkingSlot;
// Delete parking slot
const deleteParkingSlot = async (req, res) => {
    const { id } = req.params;
    try {
        // Validate UUID
        const idValidation = (0, validation_1.validateUuidParam)(id, 'id');
        if (!idValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: idValidation.error
            });
        }
        const parkingSlotRepository = data_source_1.AppDataSource.getRepository(ParkingSlot_1.ParkingSlot);
        const parkingSlot = await parkingSlotRepository.findOne({
            where: {
                id: id,
                floor: { parkingLot: { admin: { id: req.user.id } } }
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
    }
    catch (error) {
        loggerService_1.logger.error('Delete parking slot error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete parking slot'
        });
    }
};
exports.deleteParkingSlot = deleteParkingSlot;
// Assign node to parking slot
const assignNodeToParkingSlot = async (req, res) => {
    const { id } = req.params;
    const { nodeId } = req.body;
    try {
        // Validate UUIDs
        const idValidation = (0, validation_1.validateUuidParam)(id, 'id');
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
        const nodeIdValidation = (0, validation_1.validateUuidParam)(nodeId, 'nodeId');
        if (!nodeIdValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: nodeIdValidation.error
            });
        }
        const parkingSlotRepository = data_source_1.AppDataSource.getRepository(ParkingSlot_1.ParkingSlot);
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        // Check parking slot ownership
        const parkingSlot = await parkingSlotRepository.findOne({
            where: {
                id: id,
                floor: { parkingLot: { admin: { id: req.user.id } } }
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
                admin: { id: req.user.id }
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
    }
    catch (error) {
        loggerService_1.logger.error('Assign node error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to assign node to parking slot'
        });
    }
};
exports.assignNodeToParkingSlot = assignNodeToParkingSlot;
// Unassign node from parking slot
const unassignNodeFromParkingSlot = async (req, res) => {
    const { id } = req.params;
    try {
        // Validate UUID
        const idValidation = (0, validation_1.validateUuidParam)(id, 'id');
        if (!idValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: idValidation.error
            });
        }
        const parkingSlotRepository = data_source_1.AppDataSource.getRepository(ParkingSlot_1.ParkingSlot);
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        // Check parking slot ownership
        const parkingSlot = await parkingSlotRepository.findOne({
            where: {
                id: id,
                floor: { parkingLot: { admin: { id: req.user.id } } }
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
            node.parkingSlot = null;
            await nodeRepository.save(node);
        }
        return res.json({
            success: true,
            message: 'Node unassigned from parking slot successfully'
        });
    }
    catch (error) {
        loggerService_1.logger.error('Unassign node error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to unassign node from parking slot'
        });
    }
};
exports.unassignNodeFromParkingSlot = unassignNodeFromParkingSlot;
// Get parking slot status and history
const getParkingSlotStatus = async (req, res) => {
    const { id } = req.params;
    const { limit = 10 } = req.query;
    try {
        // Validate UUID
        const idValidation = (0, validation_1.validateUuidParam)(id, 'id');
        if (!idValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: idValidation.error
            });
        }
        const parkingSlotRepository = data_source_1.AppDataSource.getRepository(ParkingSlot_1.ParkingSlot);
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        const parkingSlot = await parkingSlotRepository.findOne({
            where: {
                id: id,
                floor: { parkingLot: { admin: { id: req.user.id } } }
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
                admin: { id: req.user.id }
            }
        });
        if (!node) {
            return res.status(404).json({
                success: false,
                message: 'No sensor node found for this parking slot'
            });
        }
        // Get actual historical data from database
        const statusLogRepository = data_source_1.AppDataSource.getRepository(ParkingStatusLog_1.ParkingStatusLog);
        const limitNum = parseInt(limit);
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
        loggerService_1.logger.info('Parking slot status retrieved', {
            slotId: parkingSlot.id,
            adminId: req.user.id,
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
    }
    catch (error) {
        loggerService_1.logger.error('Get parking slot status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch parking slot status'
        });
    }
};
exports.getParkingSlotStatus = getParkingSlotStatus;
// Bulk create parking slots
const bulkCreateParkingSlots = async (req, res) => {
    const { floorId } = req.params;
    const { slots } = req.body;
    try {
        // Validate UUID
        const floorIdValidation = (0, validation_1.validateUuidParam)(floorId, 'floorId');
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
        const floorRepository = data_source_1.AppDataSource.getRepository(Floor_1.Floor);
        const parkingSlotRepository = data_source_1.AppDataSource.getRepository(ParkingSlot_1.ParkingSlot);
        // Verify floor ownership
        const floor = await floorRepository.findOne({
            where: {
                id: floorId,
                parkingLot: { admin: { id: req.user.id } }
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
                name: slotNames
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
        const newSlots = slots.map(slot => parkingSlotRepository.create({
            name: slot.name.trim(),
            isReservable: Boolean(slot.isReservable),
            floor: floor
        }));
        const savedSlots = await parkingSlotRepository.save(newSlots);
        return res.status(201).json({
            success: true,
            message: `${savedSlots.length} parking slots created successfully`,
            data: savedSlots
        });
    }
    catch (error) {
        loggerService_1.logger.error('Bulk create parking slots error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create parking slots'
        });
    }
};
exports.bulkCreateParkingSlots = bulkCreateParkingSlots;
// Quick assign node to parking slot using ChirpStack Device ID
const quickAssignNode = async (req, res) => {
    const { slotId, chirpstackDeviceId } = req.body;
    try {
        // Validate required fields
        if (!slotId || !chirpstackDeviceId) {
            return res.status(400).json({
                success: false,
                message: 'slotId and chirpstackDeviceId are required'
            });
        }
        // Validate UUID for slotId
        const slotIdValidation = (0, validation_1.validateUuidParam)(slotId, 'slotId');
        if (!slotIdValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: slotIdValidation.error
            });
        }
        const parkingSlotRepository = data_source_1.AppDataSource.getRepository(ParkingSlot_1.ParkingSlot);
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        // Check if parking slot exists and belongs to authenticated admin
        const parkingSlot = await parkingSlotRepository.findOne({
            where: {
                id: slotId,
                floor: { parkingLot: { admin: { id: req.user.id } } }
            },
            relations: ['node', 'floor', 'floor.parkingLot']
        });
        if (!parkingSlot) {
            return res.status(404).json({
                success: false,
                message: 'Slot not found or access denied'
            });
        }
        // Check if slot already has a node
        if (parkingSlot.node) {
            return res.status(400).json({
                success: false,
                message: `Slot already has node ${parkingSlot.node.name || parkingSlot.node.id}`
            });
        }
        // Find node by ChirpStack Device ID
        const node = await nodeRepository.findOne({
            where: {
                chirpstackDeviceId: chirpstackDeviceId,
                admin: { id: req.user.id }
            },
            relations: ['parkingSlot']
        });
        if (!node) {
            return res.status(404).json({
                success: false,
                message: 'Node not found with that ChirpStack Device ID'
            });
        }
        // Check if node is already assigned to another parking slot
        if (node.parkingSlot) {
            return res.status(400).json({
                success: false,
                message: `Node already assigned to slot ${node.parkingSlot.name || node.parkingSlot.id}`
            });
        }
        // Assign node to parking slot
        node.parkingSlot = parkingSlot;
        await nodeRepository.save(node);
        loggerService_1.logger.info('Node assigned to parking slot via quick-assign', {
            slotId: parkingSlot.id,
            slotName: parkingSlot.name,
            nodeId: node.id,
            chirpstackDeviceId: node.chirpstackDeviceId,
            adminId: req.user.id
        });
        return res.json({
            success: true,
            message: `Node assigned to slot ${parkingSlot.name}`,
            data: {
                slot: {
                    id: parkingSlot.id,
                    name: parkingSlot.name,
                    node: {
                        id: node.id,
                        name: node.name,
                        chirpstackDeviceId: node.chirpstackDeviceId
                    }
                }
            }
        });
    }
    catch (error) {
        loggerService_1.logger.error('Quick assign node error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to assign node to parking slot'
        });
    }
};
exports.quickAssignNode = quickAssignNode;
// Get all parking slots for current admin
const getAllParkingSlots = async (req, res) => {
    try {
        const parkingSlotRepository = data_source_1.AppDataSource.getRepository(ParkingSlot_1.ParkingSlot);
        const parkingSlots = await parkingSlotRepository.find({
            where: {
                floor: {
                    parkingLot: { admin: { id: req.user.id } }
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
    }
    catch (error) {
        loggerService_1.logger.error('Get all parking slots error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch parking slots'
        });
    }
};
exports.getAllParkingSlots = getAllParkingSlots;
