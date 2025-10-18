"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllFloors = exports.getFloorStatistics = exports.deleteFloor = exports.updateFloor = exports.createFloor = exports.getFloorById = exports.getFloorsByParkingLot = void 0;
const loggerService_1 = require("../services/loggerService");
const data_source_1 = require("../data-source");
const Floor_1 = require("../models/Floor");
const ParkingLot_1 = require("../models/ParkingLot");
const validation_1 = require("../utils/validation");
// Get all floors for a specific parking lot
const getFloorsByParkingLot = async (req, res) => {
    const { parkingLotId } = req.params;
    try {
        // Validate UUID
        const parkingLotIdValidation = (0, validation_1.validateUuidParam)(parkingLotId, 'parkingLotId');
        if (!parkingLotIdValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: parkingLotIdValidation.error
            });
        }
        const floorRepository = data_source_1.AppDataSource.getRepository(Floor_1.Floor);
        const parkingLotRepository = data_source_1.AppDataSource.getRepository(ParkingLot_1.ParkingLot);
        const parkingLot = await parkingLotRepository.findOne({
            where: { id: parkingLotId },
            relations: ['admin']
        });
        if (!parkingLot) {
            return res.status(404).json({
                success: false,
                message: 'Parking lot not found'
            });
        }
        if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
            if (!parkingLot.admin || parkingLot.admin.id !== req.user.id) {
                return res.status(404).json({
                    success: false,
                    message: 'Parking lot not found or access denied'
                });
            }
        }
        const floors = await floorRepository.find({
            where: { parkingLot: { id: parkingLot.id } },
            relations: ['parkingSlots', 'parkingLot', 'parkingLot.admin'],
            order: { level: 'ASC' }
        });
        if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
            floors.forEach(floor => {
                if (floor.parkingLot) {
                    floor.parkingLot.admin = undefined;
                }
            });
        }
        return res.json({
            success: true,
            message: 'Floors retrieved successfully',
            data: floors,
            count: floors.length
        });
    }
    catch (error) {
        loggerService_1.logger.error('Get floors error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch floors'
        });
    }
};
exports.getFloorsByParkingLot = getFloorsByParkingLot;
// Get floor by ID
const getFloorById = async (req, res) => {
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
        const floorRepository = data_source_1.AppDataSource.getRepository(Floor_1.Floor);
        const floor = await floorRepository.findOne({
            where: { id },
            relations: ['parkingLot', 'parkingLot.admin', 'parkingSlots']
        });
        if (!floor) {
            return res.status(404).json({
                success: false,
                message: 'Floor not found'
            });
        }
        // Check access: Super Admin can view all, Admin can only view their own
        const isSuperAdmin = req.user && req.user.role === 'super_admin';
        const isAdmin = req.user && req.user.role === 'admin';
        if (isAdmin && !isSuperAdmin) {
            if (!floor.parkingLot?.admin || floor.parkingLot.admin.id !== req.user.id) {
                return res.status(404).json({
                    success: false,
                    message: 'Floor not found or access denied'
                });
            }
        }
        const isAdminUser = isSuperAdmin || isAdmin;
        const responseData = isAdminUser
            ? floor
            : {
                ...floor,
                parkingLot: floor.parkingLot
                    ? {
                        ...floor.parkingLot,
                        admin: undefined
                    }
                    : null
            };
        return res.json({
            success: true,
            message: 'Floor retrieved successfully',
            data: responseData
        });
    }
    catch (error) {
        loggerService_1.logger.error('Get floor by ID error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch floor'
        });
    }
};
exports.getFloorById = getFloorById;
// Create new floor
const createFloor = async (req, res) => {
    const { parkingLotId } = req.params;
    const { name, level } = req.body;
    try {
        // Validation
        const validationErrors = (0, validation_1.validateRequired)({ name });
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }
        const floorRepository = data_source_1.AppDataSource.getRepository(Floor_1.Floor);
        const parkingLotRepository = data_source_1.AppDataSource.getRepository(ParkingLot_1.ParkingLot);
        // Verify parking lot ownership
        const parkingLot = await parkingLotRepository.findOne({
            where: {
                id: parkingLotId,
                admin: { id: req.user.id }
            }
        });
        if (!parkingLot) {
            return res.status(404).json({
                success: false,
                message: 'Parking lot not found or access denied'
            });
        }
        // Check if floor name already exists for this parking lot
        const existingFloor = await floorRepository.findOne({
            where: {
                name: name.trim(),
                parkingLot: { id: parkingLot.id }
            }
        });
        if (existingFloor) {
            return res.status(400).json({
                success: false,
                message: 'Floor with this name already exists in this parking lot'
            });
        }
        // Check if level already exists (if provided)
        if (level !== undefined) {
            const existingLevelFloor = await floorRepository.findOne({
                where: {
                    level: parseInt(level),
                    parkingLot: { id: parkingLot.id }
                }
            });
            if (existingLevelFloor) {
                return res.status(400).json({
                    success: false,
                    message: 'Floor with this level already exists in this parking lot'
                });
            }
        }
        const newFloor = floorRepository.create({
            name: name.trim(),
            level: level ? parseInt(level) : undefined,
            parkingLot: parkingLot
        });
        await floorRepository.save(newFloor);
        return res.status(201).json({
            success: true,
            message: 'Floor created successfully',
            data: newFloor
        });
    }
    catch (error) {
        loggerService_1.logger.error('Create floor error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create floor'
        });
    }
};
exports.createFloor = createFloor;
// Update floor
const updateFloor = async (req, res) => {
    const { id } = req.params;
    const { name, level } = req.body;
    try {
        const floorRepository = data_source_1.AppDataSource.getRepository(Floor_1.Floor);
        const floor = await floorRepository.findOne({
            where: {
                id: id,
                parkingLot: { admin: { id: req.user.id } }
            },
            relations: ['parkingLot']
        });
        if (!floor) {
            return res.status(404).json({
                success: false,
                message: 'Floor not found or access denied'
            });
        }
        // Update name if provided
        if (name) {
            // Check if new name already exists for this parking lot
            const existingFloor = await floorRepository.findOne({
                where: {
                    name: name.trim(),
                    parkingLot: { id: floor.parkingLot.id }
                }
            });
            if (existingFloor && existingFloor.id !== floor.id) {
                return res.status(400).json({
                    success: false,
                    message: 'Floor with this name already exists in this parking lot'
                });
            }
            floor.name = name.trim();
        }
        // Update level if provided
        if (level !== undefined) {
            // Check if new level already exists for this parking lot
            const existingLevelFloor = await floorRepository.findOne({
                where: {
                    level: parseInt(level),
                    parkingLot: { id: floor.parkingLot.id }
                }
            });
            if (existingLevelFloor && existingLevelFloor.id !== floor.id) {
                return res.status(400).json({
                    success: false,
                    message: 'Floor with this level already exists in this parking lot'
                });
            }
            floor.level = level ? parseInt(level) : null;
        }
        await floorRepository.save(floor);
        return res.json({
            success: true,
            message: 'Floor updated successfully',
            data: floor
        });
    }
    catch (error) {
        loggerService_1.logger.error('Update floor error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update floor'
        });
    }
};
exports.updateFloor = updateFloor;
// Delete floor
const deleteFloor = async (req, res) => {
    const { id } = req.params;
    try {
        const floorRepository = data_source_1.AppDataSource.getRepository(Floor_1.Floor);
        const floor = await floorRepository.findOne({
            where: {
                id: id,
                parkingLot: { admin: { id: req.user.id } }
            },
            relations: ['parkingSlots']
        });
        if (!floor) {
            return res.status(404).json({
                success: false,
                message: 'Floor not found or access denied'
            });
        }
        // Check if floor has parking slots
        if (floor.parkingSlots.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete floor with existing parking slots. Remove parking slots first.'
            });
        }
        await floorRepository.remove(floor);
        return res.json({
            success: true,
            message: 'Floor deleted successfully'
        });
    }
    catch (error) {
        loggerService_1.logger.error('Delete floor error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete floor'
        });
    }
};
exports.deleteFloor = deleteFloor;
// Get floor statistics
const getFloorStatistics = async (req, res) => {
    const { id } = req.params;
    try {
        const floorRepository = data_source_1.AppDataSource.getRepository(Floor_1.Floor);
        const isSuperAdmin = req.user && req.user.role === 'super_admin';
        // Super Admin can view all floors, Admin only their own
        const floor = await floorRepository.findOne({
            where: isSuperAdmin
                ? { id: id }
                : {
                    id: id,
                    parkingLot: { admin: { id: req.user.id } }
                },
            relations: ['parkingSlots', 'parkingSlots.node']
        });
        if (!floor) {
            return res.status(404).json({
                success: false,
                message: 'Floor not found or access denied'
            });
        }
        const totalSlots = floor.parkingSlots.length;
        const slotsWithNodes = floor.parkingSlots.filter(slot => slot.node).length;
        const reservableSlots = floor.parkingSlots.filter(slot => slot.isReservable).length;
        const onlineNodes = floor.parkingSlots.filter(slot => slot.node && slot.node.isOnline).length;
        const statistics = {
            floorInfo: {
                id: floor.id,
                name: floor.name,
                level: floor.level
            },
            totalSlots,
            slotsWithNodes,
            slotsWithoutNodes: totalSlots - slotsWithNodes,
            reservableSlots,
            nonReservableSlots: totalSlots - reservableSlots,
            onlineNodes,
            offlineNodes: slotsWithNodes - onlineNodes,
            nodesCoverage: totalSlots > 0 ? Math.round((slotsWithNodes / totalSlots) * 100) : 0
        };
        return res.json({
            success: true,
            message: 'Floor statistics retrieved successfully',
            data: statistics
        });
    }
    catch (error) {
        loggerService_1.logger.error('Get floor statistics error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch floor statistics'
        });
    }
};
exports.getFloorStatistics = getFloorStatistics;
// Get all floors for current admin
const getAllFloors = async (req, res) => {
    try {
        const floorRepository = data_source_1.AppDataSource.getRepository(Floor_1.Floor);
        const isSuperAdmin = req.user && req.user.role === 'super_admin';
        const isAdmin = req.user && req.user.role === 'admin';
        // Super Admin gets all floors, Admin gets only their own floors
        const floors = await floorRepository.find({
            where: isSuperAdmin
                ? {} // No filter - get all floors
                : isAdmin
                    ? { parkingLot: { admin: { id: req.user.id } } }
                    : {},
            relations: ['parkingLot', 'parkingSlots', 'parkingLot.admin'],
            order: {
                parkingLot: { name: 'ASC' },
                level: 'ASC'
            }
        });
        // Don't hide admin details for super admin or admin users
        if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
            floors.forEach(floor => {
                if (floor.parkingLot) {
                    // Hide admin details for public consumers
                    floor.parkingLot.admin = undefined;
                }
            });
        }
        return res.json({
            success: true,
            message: 'All floors retrieved successfully',
            data: floors,
            count: floors.length
        });
    }
    catch (error) {
        loggerService_1.logger.error('Get all floors error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch floors'
        });
    }
};
exports.getAllFloors = getAllFloors;
