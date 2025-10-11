import { Response } from 'express';
import { randomUUID } from 'crypto';
import { AppDataSource } from '../data-source';
import { ParkingSlot } from '../models/ParkingSlot';
import { Floor } from '../models/Floor';
import { Node } from '../models/Node';
import { ParkingStatusLog } from '../models/ParkingStatusLog';
import { AuthRequest } from '../middleware/auth';
import { validateRequired, validateUuidParam } from '../utils/validation';
import { logger } from '../services/loggerService';
import { mqttService } from '../services/mqttService';

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

        const floor = await floorRepository.findOne({
            where: { id: floorId },
            relations: ['parkingLot', 'parkingLot.admin']
        });

        if (!floor) {
            return res.status(404).json({
                success: false,
                message: 'Floor not found'
            });
        }

        if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
            if (!floor.parkingLot?.admin || floor.parkingLot.admin.id !== req.user.id) {
                return res.status(404).json({
                    success: false,
                    message: 'Floor not found or access denied'
                });
            }
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
            where: { id },
            relations: ['floor', 'floor.parkingLot', 'floor.parkingLot.admin', 'statusLogs']
        });

        if (!parkingSlot) {
            return res.status(404).json({
                success: false,
                message: 'Parking slot not found'
            });
        }

        if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
            if (!parkingSlot.floor?.parkingLot?.admin || parkingSlot.floor.parkingLot.admin.id !== req.user.id) {
                return res.status(404).json({
                    success: false,
                    message: 'Parking slot not found or access denied'
                });
            }
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
            where: { id },
            relations: ['floor', 'floor.parkingLot', 'floor.parkingLot.admin']
        });

        if (!parkingSlot) {
            return res.status(404).json({
                success: false,
                message: 'Parking slot not found'
            });
        }

        if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
            if (!parkingSlot.floor?.parkingLot?.admin || parkingSlot.floor.parkingLot.admin.id !== req.user.id) {
                return res.status(404).json({
                    success: false,
                    message: 'Parking slot not found or access denied'
                });
            }
        }

        const node = await nodeRepository.findOne({
            where: {
                parkingSlot: { id: parkingSlot.id }
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
            adminId: req.user?.id ?? 'public',
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

export const getParkingSlotRealtimeStatus = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { id } = req.params;

    try {
        const idValidation = validateUuidParam(id, 'id');
        if (!idValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: idValidation.error
            });
        }

        const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);

        const parkingSlot = await parkingSlotRepository.findOne({
            where: { id },
            relations: ['floor', 'floor.parkingLot', 'floor.parkingLot.admin', 'node']
        });

        if (!parkingSlot) {
            return res.status(404).json({
                success: false,
                message: 'Parking slot not found'
            });
        }

        if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
            const adminId = parkingSlot.floor?.parkingLot?.admin?.id;
            if (!adminId || adminId !== req.user.id) {
                return res.status(404).json({
                    success: false,
                    message: 'Parking slot not found or access denied'
                });
            }
        }

        const realtimeSnapshot = mqttService.getSlotRealtimeStatus(parkingSlot.id);
        const mqttStatus = mqttService.getStatus();

        const distanceFromDb = parkingSlot.lastDistanceCm !== null
            ? Number(parkingSlot.lastDistanceCm)
            : null;

        const responsePayload = {
            slotId: parkingSlot.id,
            slotName: parkingSlot.name,
            status: realtimeSnapshot?.status ?? parkingSlot.status ?? 'unknown',
            statusUpdatedAt: parkingSlot.statusUpdatedAt
                ? parkingSlot.statusUpdatedAt.toISOString()
                : null,
            lastMessageReceivedAt: realtimeSnapshot?.processedAt
                ?? (parkingSlot.lastMessageReceivedAt ? parkingSlot.lastMessageReceivedAt.toISOString() : null),
            sensorState: realtimeSnapshot?.sensorState ?? parkingSlot.lastSensorState ?? null,
            distanceCm: realtimeSnapshot?.distanceCm ?? distanceFromDb,
            percentage: realtimeSnapshot?.percentage
                ?? (parkingSlot.node?.metadata?.percentage ?? null),
            batteryLevel: realtimeSnapshot?.batteryLevel
                ?? (parkingSlot.node?.metadata?.batteryLevel ?? null),
            gatewayId: realtimeSnapshot?.gatewayId ?? parkingSlot.lastGatewayId ?? null,
            dataSource: realtimeSnapshot ? 'mqtt-cache' : 'database',
            node: parkingSlot.node ? {
                id: parkingSlot.node.id,
                name: parkingSlot.node.name,
                chirpstackDeviceId: parkingSlot.node.chirpstackDeviceId,
                isOnline: parkingSlot.node.isOnline,
                lastSeen: parkingSlot.node.lastSeen ? parkingSlot.node.lastSeen.toISOString() : null
            } : null,
            mqtt: {
                connected: mqttStatus.connected,
                reconnectAttempts: mqttStatus.reconnectAttempts
            }
        };

        logger.info('Parking slot realtime status retrieved', {
            slotId: parkingSlot.id,
            adminId: req.user?.id ?? 'public',
            dataSource: responsePayload.dataSource,
            status: responsePayload.status
        });

        return res.json({
            success: true,
            message: 'Realtime parking slot status retrieved successfully',
            data: responsePayload
        });
    } catch (error) {
        logger.error('Get parking slot realtime status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch realtime parking slot status'
        });
    }
};

export const simulateParkingSlotTelemetry = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { id } = req.params;
    const {
        applicationId,
        state = 'FREE',
        distanceCm = 150,
        gatewayId = 'simulated-gateway',
        topic,
        rssi = -95,
        snr = 9.2
    } = req.body;

    try {
        const idValidation = validateUuidParam(id, 'id');
        if (!idValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: idValidation.error
            });
        }

        const normalizedState = String(state).toUpperCase();
        if (!['FREE', 'OCCUPIED'].includes(normalizedState)) {
            return res.status(400).json({
                success: false,
                message: 'State must be either FREE or OCCUPIED'
            });
        }

        const distanceValue = Number(distanceCm);
        if (!Number.isFinite(distanceValue) || distanceValue < 0) {
            return res.status(400).json({
                success: false,
                message: 'distanceCm must be a positive number'
            });
        }

        const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);
        const nodeRepository = AppDataSource.getRepository(Node);

        const parkingSlot = await parkingSlotRepository.findOne({
            where: { id },
            relations: ['floor', 'floor.parkingLot', 'floor.parkingLot.admin']
        });

        if (!parkingSlot) {
            return res.status(404).json({
                success: false,
                message: 'Parking slot not found'
            });
        }

        if (!parkingSlot.floor?.parkingLot?.admin || parkingSlot.floor.parkingLot.admin.id !== req.user!.id) {
            return res.status(404).json({
                success: false,
                message: 'Parking slot not found or access denied'
            });
        }

        const node = await nodeRepository.findOne({
            where: { parkingSlot: { id: parkingSlot.id } }
        });

        if (!node) {
            return res.status(400).json({
                success: false,
                message: 'No sensor node assigned to this parking slot'
            });
        }

        if (!topic && !applicationId) {
            return res.status(400).json({
                success: false,
                message: 'applicationId is required when topic is not provided'
            });
        }

        const targetTopic = topic
            ? String(topic)
            : `application/${applicationId}/device/${node.chirpstackDeviceId}/event/up`;

        const now = new Date().toISOString();

        const simulatedPayload = {
            deduplicationId: randomUUID(),
            time: now,
            deviceInfo: {
                tenantId: 'simulated-tenant',
                tenantName: 'Simulated Tenant',
                applicationId: applicationId || 'simulated-application',
                applicationName: 'Simulated Application',
                deviceProfileId: 'simulated-profile',
                deviceProfileName: 'Simulated Profile',
                deviceName: node.name,
                devEui: node.chirpstackDeviceId,
                deviceClassEnabled: 'CLASS_A',
                tags: {}
            },
            devAddr: '00000000',
            adr: true,
            dr: 5,
            fCnt: Math.floor(Math.random() * 1000),
            fPort: 2,
            confirmed: false,
            data: '',
            object: {
                distance_cm: distanceValue,
                state: normalizedState
            },
            rxInfo: [{
                gatewayId,
                uplinkId: Math.floor(Math.random() * 1000000),
                nsTime: now,
                rssi,
                snr,
                channel: 7,
                location: {},
                context: '',
                crcStatus: 'CRC_OK'
            }],
            txInfo: {
                frequency: 867900000,
                modulation: {
                    lora: {
                        bandwidth: 125000,
                        spreadingFactor: 7,
                        codeRate: 'CR_4_5'
                    }
                }
            },
            regionConfigId: 'simulated-region'
        };

        await mqttService.publish(targetTopic, JSON.stringify(simulatedPayload));

        logger.info('Simulated MQTT payload published for parking slot', {
            slotId: parkingSlot.id,
            nodeId: node.id,
            topic: targetTopic,
            state: normalizedState,
            distance: distanceValue
        });

        return res.json({
            success: true,
            message: 'Simulated MQTT payload published successfully',
            data: {
                topic: targetTopic,
                payload: simulatedPayload
            }
        });
    } catch (error) {
        logger.error('Simulate parking slot telemetry error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to publish simulated MQTT payload'
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

// Quick assign node to parking slot using ChirpStack Device ID
export const quickAssignNode = async (req: AuthRequest, res: Response): Promise<Response> => {
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
        const slotIdValidation = validateUuidParam(slotId, 'slotId');
        if (!slotIdValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: slotIdValidation.error
            });
        }

        const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);
        const nodeRepository = AppDataSource.getRepository(Node);

        // Check if parking slot exists and belongs to authenticated admin
        const parkingSlot = await parkingSlotRepository.findOne({
            where: {
                id: slotId,
                floor: { parkingLot: { admin: { id: req.user!.id } } }
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
                admin: { id: req.user!.id }
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

        logger.info('Node assigned to parking slot via quick-assign', {
            slotId: parkingSlot.id,
            slotName: parkingSlot.name,
            nodeId: node.id,
            chirpstackDeviceId: node.chirpstackDeviceId,
            adminId: req.user!.id
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
    } catch (error) {
        logger.error('Quick assign node error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to assign node to parking slot'
        });
    }
};

// Get all parking slots for current admin
export const getAllParkingSlots = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);
        const isAdminUser = req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');

        const parkingSlots = await parkingSlotRepository.find({
            where: isAdminUser
                ? {
                    floor: {
                        parkingLot: { admin: { id: req.user!.id } }
                    }
                }
                : {},
            relations: ['floor', 'floor.parkingLot', 'floor.parkingLot.admin'],
            order: {
                floor: {
                    parkingLot: { name: 'ASC' },
                    level: 'ASC'
                },
                name: 'ASC'
            }
        });

        if (!isAdminUser) {
            parkingSlots.forEach(slot => {
                if (slot.floor?.parkingLot) {
                    (slot.floor.parkingLot as any).admin = undefined;
                }
            });
        }

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
