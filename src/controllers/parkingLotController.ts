import { Response } from 'express';
import { AppDataSource } from '../data-source';
import { ParkingLot } from '../models/ParkingLot';
import { Gateway } from '../models/Gateway';
import { AuthRequest } from '../middleware/auth';
import { validateRequired, validateUuidParam } from '../utils/validation';
import {
  catchAsync,
  NotFoundError,
  ConflictError,
  ValidationError,
  AuthorizationError
} from '../middleware/errorHandler';
import { logger } from '../services/loggerService';
import { mqttService } from '../services/mqttService';

// Get parking lots based on user role
export const getMyParkingLots = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const parkingLotRepository = AppDataSource.getRepository(ParkingLot);
        let parkingLots;

        const isAdminUser = req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');

        if (isAdminUser) {
            parkingLots = await parkingLotRepository.find({
                where: { admin: { id: req.user!.id } },
                relations: ['floors', 'floors.parkingSlots', 'gateways']
            });
        } else {
            // Users can view all parking lots to find parking spots
            parkingLots = await parkingLotRepository.find({
                relations: ['floors', 'floors.parkingSlots', 'admin'],
                order: { name: 'ASC' }
            });

            parkingLots.forEach(lot => {
                (lot as any).admin = undefined;
            });
        }

        return res.json({
            success: true,
            message: 'Parking lots retrieved successfully',
            data: parkingLots,
            count: parkingLots.length
        });
    } catch (error) {
        logger.error('Get parking lots error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch parking lots'
        });
    }
};

// Get all parking lots (Super Admin only)
export const getAllParkingLots = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const parkingLotRepository = AppDataSource.getRepository(ParkingLot);

        // Get all parking lots with admin details
        const parkingLots = await parkingLotRepository.find({
            relations: ['admin', 'floors', 'floors.parkingSlots', 'gateways'],
            order: { createdAt: 'DESC' }
        });

        // Format the response to include admin information
        const formattedLots = parkingLots.map(lot => ({
            id: lot.id,
            name: lot.name,
            address: lot.address,
            latitude: lot.latitude,
            longitude: lot.longitude,
            isActive: lot.isActive,
            chirpstackApplicationId: lot.chirpstackApplicationId,
            chirpstackApplicationName: lot.chirpstackApplicationName,
            admin: {
                id: lot.admin.id,
                email: lot.admin.email,
                firstName: lot.admin.firstName,
                lastName: lot.admin.lastName,
                companyName: lot.admin.companyName,
                role: lot.admin.role
            },
            floorsCount: lot.floors?.length || 0,
            parkingSlotsCount: lot.floors?.reduce((sum, floor) => sum + (floor.parkingSlots?.length || 0), 0) || 0,
            gatewaysCount: lot.gateways?.length || 0,
            createdAt: lot.createdAt
        }));

        logger.info('All parking lots retrieved by super admin', {
            superAdminId: req.user!.id,
            totalLots: parkingLots.length
        });

        return res.json({
            success: true,
            message: 'All parking lots retrieved successfully',
            data: formattedLots,
            count: parkingLots.length
        });
    } catch (error) {
        logger.error('Get all parking lots error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch all parking lots'
        });
    }
};

// Get parking lot by ID (only for admin's own parking lots)
export const getParkingLotById = catchAsync(async (req: AuthRequest, res: Response): Promise<Response> => {
    const { id } = req.params;
    
    // Validate UUID
    const idValidation = validateUuidParam(id, 'id');
    if (!idValidation.isValid) {
        throw new ValidationError(idValidation.error);
    }

    const parkingLotRepository = AppDataSource.getRepository(ParkingLot);

    const isSuperAdmin = req.user && req.user.role === 'super_admin';
    const isAdmin = req.user && req.user.role === 'admin';
    const isAdminUser = isSuperAdmin || isAdmin;

    if (isAdminUser) {
        logger.business('Parking lot retrieval requested', 'ParkingLot', id, req.user!.id);
    }

    // Super Admin can view all parking lots, Admin only their own
    const parkingLot = await parkingLotRepository.findOne({
        where: isSuperAdmin
            ? { id }
            : isAdmin
            ? {
                id,
                admin: { id: req.user!.id }
            }
            : { id },
        relations: ['floors', 'floors.parkingSlots', 'gateways', 'admin']
    });

    if (!parkingLot) {
        if (isAdminUser) {
            logger.warn('Parking lot access denied', {
                parkingLotId: id,
                userId: req.user!.id,
                reason: 'Not found or access denied'
            });
        }
        throw new NotFoundError('Parking lot');
    }

    if (!isAdminUser) {
        (parkingLot as any).admin = undefined;
    } else {
        logger.business('Parking lot retrieved successfully', 'ParkingLot', id, req.user!.id);
    }

    return res.json({
        success: true,
        message: 'Parking lot retrieved successfully',
        data: parkingLot
    });
});

// Create new parking lot
export const createParkingLot = async (req: AuthRequest, res: Response): Promise<Response> => {
    const {
        name,
        address,
        latitude,
        longitude,
        isActive,
        chirpstackApplicationId,
        chirpstackApplicationName
    } = req.body;

    try {
        // Validation
        const validationErrors = validateRequired({ name, address });
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        // Validate ChirpStack Application ID format if provided (UUID format)
        if (chirpstackApplicationId) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(chirpstackApplicationId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid ChirpStack Application ID format. Must be a valid UUID.'
                });
            }
        }

        const parkingLotRepository = AppDataSource.getRepository(ParkingLot);

        // Check if parking lot name already exists for this admin
        const existingParkingLot = await parkingLotRepository.findOne({
            where: {
                name: name.trim(),
                admin: { id: req.user!.id }
            }
        });

        if (existingParkingLot) {
            return res.status(400).json({
                success: false,
                message: 'Parking lot with this name already exists'
            });
        }

        // Check if Application ID is already in use by another parking lot
        if (chirpstackApplicationId) {
            const existingAppId = await parkingLotRepository.findOne({
                where: { chirpstackApplicationId: chirpstackApplicationId.trim() }
            });

            if (existingAppId) {
                return res.status(400).json({
                    success: false,
                    message: 'This ChirpStack Application ID is already in use by another parking lot'
                });
            }
        }

        const newParkingLot = parkingLotRepository.create({
            name: name.trim(),
            address: address.trim(),
            latitude: latitude,
            longitude: longitude,
            isActive: isActive ?? true,
            chirpstackApplicationId: chirpstackApplicationId ? chirpstackApplicationId.trim() : null,
            chirpstackApplicationName: chirpstackApplicationName ? chirpstackApplicationName.trim() : null,
            admin: req.user!
        });

        logger.debug('Creating new parking lot', {
            adminId: req.user!.id,
            parkingLotData: {
                name: newParkingLot.name,
                applicationId: newParkingLot.chirpstackApplicationId
            }
        });

        await parkingLotRepository.save(newParkingLot);

        // Subscribe to MQTT topic if Application ID is provided
        if (newParkingLot.chirpstackApplicationId) {
            const subscribed = await mqttService.subscribeToApplicationTopic(
                newParkingLot.chirpstackApplicationId,
                newParkingLot.name
            );

            logger.info('MQTT subscription attempt for new parking lot', {
                parkingLotId: newParkingLot.id,
                parkingLotName: newParkingLot.name,
                applicationId: newParkingLot.chirpstackApplicationId,
                subscribed
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Parking lot created successfully',
            data: newParkingLot
        });
    } catch (error) {
        logger.error('Create parking lot error:', error, { requestBody: req.body, userId: req.user?.id });
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to create parking lot' 
        });
    }
};

// Update parking lot
export const updateParkingLot = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { name, address } = req.body;
    
    try {
        // Validate UUID
        const idValidation = validateUuidParam(id, 'id');
        if (!idValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: idValidation.error
            });
        }

        const parkingLotRepository = AppDataSource.getRepository(ParkingLot);
        const parkingLot = await parkingLotRepository.findOne({
            where: { 
                id: id, 
                admin: { id: req.user!.id } 
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
                    admin: { id: req.user!.id } 
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
    } catch (error) {
        logger.error('Update parking lot error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to update parking lot' 
        });
    }
};

// Delete parking lot
export const deleteParkingLot = async (req: AuthRequest, res: Response): Promise<Response> => {
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

        const parkingLotRepository = AppDataSource.getRepository(ParkingLot);
        const parkingLot = await parkingLotRepository.findOne({
            where: { 
                id: id, 
                admin: { id: req.user!.id } 
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
    } catch (error) {
        logger.error('Delete parking lot error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to delete parking lot' 
        });
    }
};

// Assign gateway to parking lot
export const assignGatewayToParkingLot = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { gatewayId } = req.body;
    
    try {
        // Validate UUIDs
        const idValidation = validateUuidParam(id, 'id');
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

        const gatewayIdValidation = validateUuidParam(gatewayId, 'gatewayId');
        if (!gatewayIdValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: gatewayIdValidation.error
            });
        }
        
        const parkingLotRepository = AppDataSource.getRepository(ParkingLot);
        const gatewayRepository = AppDataSource.getRepository(Gateway);
        
        // Check parking lot ownership
        const parkingLot = await parkingLotRepository.findOne({
            where: { 
                id: id, 
                admin: { id: req.user!.id } 
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
                linkedAdmin: { id: req.user!.id }
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
    } catch (error) {
        logger.error('Assign gateway error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to assign gateway to parking lot' 
        });
    }
};

// Unassign gateway from parking lot
export const unassignGatewayFromParkingLot = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { id, gatewayId } = req.params;

    try {
        const parkingLotRepository = AppDataSource.getRepository(ParkingLot);
        const gatewayRepository = AppDataSource.getRepository(Gateway);

        // Check parking lot ownership
        const parkingLot = await parkingLotRepository.findOne({
            where: {
                id: id,
                admin: { id: req.user!.id }
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
                linkedAdmin: { id: req.user!.id },
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
        gateway.parkingLot = null as any;
        await gatewayRepository.save(gateway);

        return res.json({
            success: true,
            message: 'Gateway unassigned from parking lot successfully'
        });
    } catch (error) {
        logger.error('Unassign gateway error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to unassign gateway from parking lot'
        });
    }
};

// Get gateways by parking lot ID
export const getGatewaysByParkingLotId = async (req: AuthRequest, res: Response): Promise<Response> => {
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

        const parkingLotRepository = AppDataSource.getRepository(ParkingLot);
        const gatewayRepository = AppDataSource.getRepository(Gateway);

        // Check parking lot ownership
        const parkingLot = await parkingLotRepository.findOne({
            where: {
                id: id,
                admin: { id: req.user!.id }
            }
        });

        if (!parkingLot) {
            return res.status(404).json({
                success: false,
                message: 'Parking lot not found or access denied'
            });
        }

        // Get all gateways assigned to this parking lot
        const gateways = await gatewayRepository.find({
            where: {
                parkingLot: { id: parkingLot.id },
                linkedAdmin: { id: req.user!.id }
            },
            relations: ['linkedAdmin'],
            order: { createdAt: 'DESC' }
        });

        const formattedGateways = gateways.map(gateway => ({
            id: gateway.id,
            name: gateway.name,
            chirpstackGatewayId: gateway.chirpstackGatewayId,
            description: gateway.description,
            location: gateway.location,
            latitude: gateway.latitude,
            longitude: gateway.longitude,
            isOnline: gateway.isOnline,
            isActive: gateway.isActive,
            lastSeen: gateway.lastSeen,
            metadata: gateway.metadata,
            createdAt: gateway.createdAt,
            updatedAt: gateway.updatedAt
        }));

        logger.info('Gateways retrieved by parking lot', {
            parkingLotId: id,
            gatewayCount: gateways.length,
            adminId: req.user!.id
        });

        return res.json({
            success: true,
            message: `Found ${gateways.length} gateways for parking lot`,
            data: formattedGateways,
            count: gateways.length,
            parkingLot: {
                id: parkingLot.id,
                name: parkingLot.name,
                address: parkingLot.address
            }
        });

    } catch (error) {
        logger.error('Get gateways by parking lot error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve gateways for parking lot'
        });
    }
};
