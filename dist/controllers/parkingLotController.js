"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unassignGatewayFromParkingLot = exports.assignGatewayToParkingLot = exports.deleteParkingLot = exports.updateParkingLot = exports.createParkingLot = exports.getParkingLotById = exports.getMyParkingLots = void 0;
const data_source_1 = require("../data-source");
const ParkingLot_1 = require("../models/ParkingLot");
const Gateway_1 = require("../models/Gateway");
const validation_1 = require("../utils/validation");
const errorHandler_1 = require("../middleware/errorHandler");
const loggerService_1 = require("../services/loggerService");
// Get parking lots based on user role
const getMyParkingLots = async (req, res) => {
    try {
        const parkingLotRepository = data_source_1.AppDataSource.getRepository(ParkingLot_1.ParkingLot);
        let parkingLots;
        // Admins see their own parking lots, users see all parking lots
        if (req.user.role === 'admin') {
            parkingLots = await parkingLotRepository.find({
                where: { admin: { id: req.user.id } },
                relations: ['floors', 'floors.parkingSlots', 'floors.parkingSlots.node', 'gateways']
            });
        }
        else {
            // Users can view all parking lots to find parking spots
            parkingLots = await parkingLotRepository.find({
                relations: ['floors', 'floors.parkingSlots'],
                order: { name: 'ASC' }
            });
        }
        return res.json({
            success: true,
            message: 'Parking lots retrieved successfully',
            data: parkingLots,
            count: parkingLots.length
        });
    }
    catch (error) {
        loggerService_1.logger.error('Get parking lots error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch parking lots'
        });
    }
};
exports.getMyParkingLots = getMyParkingLots;
// Get parking lot by ID (only for admin's own parking lots)
exports.getParkingLotById = (0, errorHandler_1.catchAsync)(async (req, res) => {
    const { id } = req.params;
    // Validate UUID
    const idValidation = (0, validation_1.validateUuidParam)(id, 'id');
    if (!idValidation.isValid) {
        throw new errorHandler_1.ValidationError(idValidation.error);
    }
    const parkingLotRepository = data_source_1.AppDataSource.getRepository(ParkingLot_1.ParkingLot);
    // Log business event
    loggerService_1.logger.business('Parking lot retrieval requested', 'ParkingLot', id, req.user.id);
    const parkingLot = await parkingLotRepository.findOne({
        where: {
            id: id,
            admin: { id: req.user.id }
        },
        relations: ['floors', 'floors.parkingSlots', 'floors.parkingSlots.node', 'gateways']
    });
    if (!parkingLot) {
        loggerService_1.logger.warn('Parking lot access denied', {
            parkingLotId: id,
            userId: req.user.id,
            reason: 'Not found or access denied'
        });
        throw new errorHandler_1.NotFoundError('Parking lot');
    }
    loggerService_1.logger.business('Parking lot retrieved successfully', 'ParkingLot', id, req.user.id);
    return res.json({
        success: true,
        message: 'Parking lot retrieved successfully',
        data: parkingLot
    });
});
// Create new parking lot
const createParkingLot = async (req, res) => {
    const { name, address } = req.body;
    try {
        // Validation
        const validationErrors = (0, validation_1.validateRequired)({ name, address });
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }
        const parkingLotRepository = data_source_1.AppDataSource.getRepository(ParkingLot_1.ParkingLot);
        // Check if parking lot name already exists for this admin
        const existingParkingLot = await parkingLotRepository.findOne({
            where: {
                name: name.trim(),
                admin: { id: req.user.id }
            }
        });
        if (existingParkingLot) {
            return res.status(400).json({
                success: false,
                message: 'Parking lot with this name already exists'
            });
        }
        const newParkingLot = parkingLotRepository.create({
            name: name.trim(),
            address: address.trim(),
            admin: req.user
        });
        await parkingLotRepository.save(newParkingLot);
        return res.status(201).json({
            success: true,
            message: 'Parking lot created successfully',
            data: newParkingLot
        });
    }
    catch (error) {
        loggerService_1.logger.error('Create parking lot error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create parking lot'
        });
    }
};
exports.createParkingLot = createParkingLot;
// Update parking lot
const updateParkingLot = async (req, res) => {
    const { id } = req.params;
    const { name, address } = req.body;
    try {
        // Validate UUID
        const idValidation = (0, validation_1.validateUuidParam)(id, 'id');
        if (!idValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: idValidation.error
            });
        }
        const parkingLotRepository = data_source_1.AppDataSource.getRepository(ParkingLot_1.ParkingLot);
        const parkingLot = await parkingLotRepository.findOne({
            where: {
                id: id,
                admin: { id: req.user.id }
            }
        });
        if (!parkingLot) {
            return res.status(404).json({
                success: false,
                message: 'Parking lot not found or access denied'
            });
        }
        // Update only provided fields
        if (name) {
            // Check if new name already exists for this admin
            const existingParkingLot = await parkingLotRepository.findOne({
                where: {
                    name: name.trim(),
                    admin: { id: req.user.id }
                }
            });
            if (existingParkingLot && existingParkingLot.id !== parkingLot.id) {
                return res.status(400).json({
                    success: false,
                    message: 'Parking lot with this name already exists'
                });
            }
            parkingLot.name = name.trim();
        }
        if (address) {
            parkingLot.address = address.trim();
        }
        await parkingLotRepository.save(parkingLot);
        return res.json({
            success: true,
            message: 'Parking lot updated successfully',
            data: parkingLot
        });
    }
    catch (error) {
        loggerService_1.logger.error('Update parking lot error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update parking lot'
        });
    }
};
exports.updateParkingLot = updateParkingLot;
// Delete parking lot
const deleteParkingLot = async (req, res) => {
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
        const parkingLotRepository = data_source_1.AppDataSource.getRepository(ParkingLot_1.ParkingLot);
        const parkingLot = await parkingLotRepository.findOne({
            where: {
                id: id,
                admin: { id: req.user.id }
            },
            relations: ['floors', 'floors.parkingSlots', 'gateways']
        });
        if (!parkingLot) {
            return res.status(404).json({
                success: false,
                message: 'Parking lot not found or access denied'
            });
        }
        // Check if parking lot has floors or gateways
        if (parkingLot.floors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete parking lot with existing floors. Remove floors first.'
            });
        }
        if (parkingLot.gateways.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete parking lot with assigned gateways. Unassign gateways first.'
            });
        }
        await parkingLotRepository.remove(parkingLot);
        return res.json({
            success: true,
            message: 'Parking lot deleted successfully'
        });
    }
    catch (error) {
        loggerService_1.logger.error('Delete parking lot error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete parking lot'
        });
    }
};
exports.deleteParkingLot = deleteParkingLot;
// Assign gateway to parking lot
const assignGatewayToParkingLot = async (req, res) => {
    const { id } = req.params;
    const { gatewayId } = req.body;
    try {
        // Validate UUIDs
        const idValidation = (0, validation_1.validateUuidParam)(id, 'id');
        if (!idValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: idValidation.error
            });
        }
        if (!gatewayId) {
            return res.status(400).json({
                success: false,
                message: 'Gateway ID is required'
            });
        }
        const gatewayIdValidation = (0, validation_1.validateUuidParam)(gatewayId, 'gatewayId');
        if (!gatewayIdValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: gatewayIdValidation.error
            });
        }
        const parkingLotRepository = data_source_1.AppDataSource.getRepository(ParkingLot_1.ParkingLot);
        const gatewayRepository = data_source_1.AppDataSource.getRepository(Gateway_1.Gateway);
        // Check parking lot ownership
        const parkingLot = await parkingLotRepository.findOne({
            where: {
                id: id,
                admin: { id: req.user.id }
            }
        });
        if (!parkingLot) {
            return res.status(404).json({
                success: false,
                message: 'Parking lot not found or access denied'
            });
        }
        // Check gateway ownership (admin's linked gateways)
        const gateway = await gatewayRepository.findOne({
            where: {
                id: gatewayId,
                linkedAdmin: { id: req.user.id }
            },
            relations: ['parkingLot']
        });
        if (!gateway) {
            return res.status(404).json({
                success: false,
                message: 'Gateway not found or not linked to your account'
            });
        }
        // Check if gateway is already assigned to another parking lot
        if (gateway.parkingLot && gateway.parkingLot.id !== parkingLot.id) {
            return res.status(400).json({
                success: false,
                message: 'Gateway is already assigned to another parking lot'
            });
        }
        // Assign gateway to parking lot
        gateway.parkingLot = parkingLot;
        await gatewayRepository.save(gateway);
        return res.json({
            success: true,
            message: 'Gateway assigned to parking lot successfully',
            data: { parkingLot, gateway }
        });
    }
    catch (error) {
        loggerService_1.logger.error('Assign gateway error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to assign gateway to parking lot'
        });
    }
};
exports.assignGatewayToParkingLot = assignGatewayToParkingLot;
// Unassign gateway from parking lot
const unassignGatewayFromParkingLot = async (req, res) => {
    const { id, gatewayId } = req.params;
    try {
        const parkingLotRepository = data_source_1.AppDataSource.getRepository(ParkingLot_1.ParkingLot);
        const gatewayRepository = data_source_1.AppDataSource.getRepository(Gateway_1.Gateway);
        // Check parking lot ownership
        const parkingLot = await parkingLotRepository.findOne({
            where: {
                id: id,
                admin: { id: req.user.id }
            }
        });
        if (!parkingLot) {
            return res.status(404).json({
                success: false,
                message: 'Parking lot not found or access denied'
            });
        }
        // Check gateway ownership and assignment
        const gateway = await gatewayRepository.findOne({
            where: {
                id: gatewayId,
                linkedAdmin: { id: req.user.id },
                parkingLot: { id: parkingLot.id }
            }
        });
        if (!gateway) {
            return res.status(404).json({
                success: false,
                message: 'Gateway not found or not assigned to this parking lot'
            });
        }
        // Unassign gateway
        gateway.parkingLot = null;
        await gatewayRepository.save(gateway);
        return res.json({
            success: true,
            message: 'Gateway unassigned from parking lot successfully'
        });
    }
    catch (error) {
        loggerService_1.logger.error('Unassign gateway error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to unassign gateway from parking lot'
        });
    }
};
exports.unassignGatewayFromParkingLot = unassignGatewayFromParkingLot;
