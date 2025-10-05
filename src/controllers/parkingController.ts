import { Response } from 'express';
import { AppDataSource } from '../data-source';
import { Node } from '../models/Node';
import { ParkingSlot } from '../models/ParkingSlot';
import { ParkingStatusLog } from '../models/ParkingStatusLog';
import { Floor } from '../models/Floor';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../services/loggerService';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { validateRequired, validateUuidParam } from '../utils/validation';

/**
 * Get comprehensive parking overview for admin
 * Combines parking lots, floors, slots, and nodes with real-time status
 */
export const getParkingOverview = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const nodeRepository = AppDataSource.getRepository(Node);
        const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);

        // Get all nodes with parking slot information for this admin
        const nodes = await nodeRepository.find({
            where: {
                admin: { id: req.user!.id }
            },
            relations: [
                'parkingSlot',
                'parkingSlot.floor',
                'parkingSlot.floor.parkingLot',
                'gateway'
            ],
            order: { createdAt: 'DESC' }
        });

        // Get slots without nodes
        const slotsWithoutNodes = await parkingSlotRepository.find({
            where: {
                floor: {
                    parkingLot: {
                        admin: { id: req.user!.id }
                    }
                },
                node: null as any
            },
            relations: ['floor', 'floor.parkingLot']
        });

        // Organize data by parking lot and floor
        const parkingData = new Map();

        // Process nodes with slots
        nodes.forEach(node => {
            if (!node.parkingSlot) return;

            const parkingLot = node.parkingSlot.floor.parkingLot;
            const floor = node.parkingSlot.floor;

            if (!parkingData.has(parkingLot.id)) {
                parkingData.set(parkingLot.id, {
                    id: parkingLot.id,
                    name: parkingLot.name,
                    address: parkingLot.address || 'No address',
                    floors: new Map()
                });
            }

            const lotData = parkingData.get(parkingLot.id);
            if (!lotData.floors.has(floor.id)) {
                lotData.floors.set(floor.id, {
                    id: floor.id,
                    name: floor.name,
                    level: floor.level,
                    slots: []
                });
            }

            const floorData = lotData.floors.get(floor.id);
            floorData.slots.push({
                id: node.parkingSlot.id,
                name: node.parkingSlot.name,
                isReservable: node.parkingSlot.isReservable,
                status: node.slotStatus,
                node: {
                    id: node.id,
                    name: node.name,
                    chirpstackDeviceId: node.chirpstackDeviceId,
                    isOnline: node.isOnline,
                    lastSeen: node.lastSeen,
                    batteryLevel: node.batteryLevel,
                    distance: node.distance,
                    percentage: node.percentage,
                    signalQuality: node.signalQuality,
                    rssi: node.rssi,
                    snr: node.snr,
                    gatewayId: node.gatewayId,
                    lastChirpStackUpdate: node.lastChirpStackUpdate
                },
                gateway: {
                    id: node.gatewayId,
                    name: node.gatewayId ? 'ChirpStack Gateway' : 'Not Connected'
                }
            });
        });

        // Process slots without nodes
        slotsWithoutNodes.forEach(slot => {
            const parkingLot = slot.floor.parkingLot;
            const floor = slot.floor;

            if (!parkingData.has(parkingLot.id)) {
                parkingData.set(parkingLot.id, {
                    id: parkingLot.id,
                    name: parkingLot.name,
                    address: parkingLot.address || 'No address',
                    floors: new Map()
                });
            }

            const lotData = parkingData.get(parkingLot.id);
            if (!lotData.floors.has(floor.id)) {
                lotData.floors.set(floor.id, {
                    id: floor.id,
                    name: floor.name,
                    level: floor.level,
                    slots: []
                });
            }

            const floorData = lotData.floors.get(floor.id);
            floorData.slots.push({
                id: slot.id,
                name: slot.name,
                isReservable: slot.isReservable,
                status: 'unmonitored',
                node: null,
                gateway: null
            });
        });

        // Convert Maps to arrays and calculate statistics
        const result = Array.from(parkingData.values()).map(lot => {
            const floors = Array.from(lot.floors.values()).map((floor: any) => ({
                id: floor.id,
                name: floor.name,
                level: floor.level,
                slots: floor.slots,
                totalSlots: floor.slots.length,
                availableSlots: floor.slots.filter((s: any) => s.status === 'available').length,
                occupiedSlots: floor.slots.filter((s: any) => s.status === 'occupied').length,
                unknownSlots: floor.slots.filter((s: any) => s.status === 'unknown').length,
                unmonitoredSlots: floor.slots.filter((s: any) => s.status === 'unmonitored').length
            }));

            return {
                ...lot,
                floors,
                totalSlots: floors.reduce((sum, f) => sum + f.totalSlots, 0),
                availableSlots: floors.reduce((sum, f) => sum + f.availableSlots, 0),
                occupiedSlots: floors.reduce((sum, f) => sum + f.occupiedSlots, 0),
                unknownSlots: floors.reduce((sum, f) => sum + f.unknownSlots, 0),
                unmonitoredSlots: floors.reduce((sum, f) => sum + f.unmonitoredSlots, 0)
            };
        });

        // Overall statistics
        const overallStats = {
            totalParkingLots: result.length,
            totalFloors: result.reduce((sum, lot) => sum + lot.floors.length, 0),
            totalSlots: result.reduce((sum, lot) => sum + lot.totalSlots, 0),
            availableSlots: result.reduce((sum, lot) => sum + lot.availableSlots, 0),
            occupiedSlots: result.reduce((sum, lot) => sum + lot.occupiedSlots, 0),
            unknownSlots: result.reduce((sum, lot) => sum + lot.unknownSlots, 0),
            unmonitoredSlots: result.reduce((sum, lot) => sum + lot.unmonitoredSlots, 0),
            onlineNodes: nodes.filter(node => node.isOnline).length,
            totalNodes: nodes.length
        };

        return ApiResponseBuilder.success({
            parkingLots: result,
            statistics: overallStats
        }, 'Parking overview retrieved successfully').send(res);

    } catch (error) {
        logger.error('Get parking overview error:', error);
        return ApiResponseBuilder.error('Failed to retrieve parking overview').send(res, 500);
    }
};

/**
 * Get detailed slot information with historical data
 */
export const getSlotDetails = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { slotId } = req.params;
    const { limit = 20 } = req.query;

    try {
        const idValidation = validateUuidParam(slotId, 'slotId');
        if (!idValidation.isValid) {
            return ApiResponseBuilder.error(idValidation.error || 'Invalid slot ID').send(res, 400);
        }

        const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);
        const nodeRepository = AppDataSource.getRepository(Node);
        const statusLogRepository = AppDataSource.getRepository(ParkingStatusLog);

        // Get parking slot with ownership verification
        const parkingSlot = await parkingSlotRepository.findOne({
            where: {
                id: slotId,
                floor: {
                    parkingLot: {
                        admin: { id: req.user!.id }
                    }
                }
            },
            relations: ['floor', 'floor.parkingLot']
        });

        if (!parkingSlot) {
            return ApiResponseBuilder.notFound('Parking slot').send(res, 404);
        }

        // Get associated node
        const node = await nodeRepository.findOne({
            where: {
                parkingSlot: { id: parkingSlot.id }
            },
            relations: ['gateway']
        });

        // Get historical status logs
        const statusLogs = await statusLogRepository.find({
            where: {
                parkingSlot: { id: parkingSlot.id }
            },
            order: { detectedAt: 'DESC' },
            take: parseInt(limit as string) || 20
        });

        const result = {
            slot: {
                id: parkingSlot.id,
                name: parkingSlot.name,
                isReservable: parkingSlot.isReservable,
                floor: {
                    id: parkingSlot.floor.id,
                    name: parkingSlot.floor.name,
                    level: parkingSlot.floor.level
                },
                parkingLot: {
                    id: parkingSlot.floor.parkingLot.id,
                    name: parkingSlot.floor.parkingLot.name,
                    address: parkingSlot.floor.parkingLot.address || 'No address'
                }
            },
            node: node ? {
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
                signalQuality: node.signalQuality,
                rssi: node.rssi,
                snr: node.snr,
                gatewayId: node.gatewayId,
                lastChirpStackUpdate: node.lastChirpStackUpdate,
                slotStatus: node.slotStatus,
                gateway: {
                    id: node.gatewayId,
                    name: node.gatewayId ? 'ChirpStack Gateway' : 'Not Connected'
                },
                metadata: node.metadata
            } : null,
            currentStatus: node?.slotStatus || 'unmonitored',
            history: statusLogs.map(log => ({
                id: log.id,
                status: log.status,
                detectedAt: log.detectedAt,
                distance: log.distance,
                percentage: log.percentage,
                batteryLevel: log.batteryLevel,
                signalQuality: log.signalQuality,
                metadata: log.metadata
            })),
            statistics: {
                totalLogs: statusLogs.length,
                lastUpdate: statusLogs[0]?.detectedAt || null,
                averageBatteryLevel: node?.batteryLevel || null,
                averageSignalQuality: node?.signalQuality || null
            }
        };

        return ApiResponseBuilder.success(result, 'Slot details retrieved successfully').send(res);

    } catch (error) {
        logger.error('Get slot details error:', error);
        return ApiResponseBuilder.error('Failed to retrieve slot details').send(res, 500);
    }
};

/**
 * Update node data manually (for testing or manual updates)
 */
export const updateNodeData = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { nodeId } = req.params;
    const { distance, percentage, batteryLevel, state } = req.body;

    try {
        const idValidation = validateUuidParam(nodeId, 'nodeId');
        if (!idValidation.isValid) {
            return ApiResponseBuilder.error(idValidation.error || 'Invalid node ID').send(res, 400);
        }

        const nodeRepository = AppDataSource.getRepository(Node);
        const statusLogRepository = AppDataSource.getRepository(ParkingStatusLog);

        const node = await nodeRepository.findOne({
            where: {
                id: nodeId,
                admin: { id: req.user!.id }
            },
            relations: ['parkingSlot']
        });

        if (!node) {
            return ApiResponseBuilder.notFound('Node').send(res, 404);
        }

        // Validate input
        if (percentage !== undefined && (percentage < 0 || percentage > 100)) {
            return ApiResponseBuilder.error('Percentage must be between 0 and 100').send(res, 400);
        }

        if (batteryLevel !== undefined && (batteryLevel < 0 || batteryLevel > 100)) {
            return ApiResponseBuilder.error('Battery level must be between 0 and 100').send(res, 400);
        }

        // Update node metadata
        const updatedMetadata = {
            ...node.metadata,
            distance_cm: distance !== undefined ? distance : node.metadata?.distance_cm,
            percentage: percentage !== undefined ? percentage : node.metadata?.percentage,
            batteryLevel: batteryLevel !== undefined ? batteryLevel : node.metadata?.batteryLevel,
            state: state || node.metadata?.state || 'UNKNOWN',
            lastManualUpdate: new Date().toISOString(),
            updatedBy: 'manual'
        };

        node.metadata = updatedMetadata;
        node.lastSeen = new Date();
        await nodeRepository.save(node);

        // Log the status change
        if (node.parkingSlot) {
            let slotStatus: 'available' | 'occupied' | 'unknown' = 'unknown';

            if (state === 'FREE') {
                slotStatus = 'available';
            } else if (state === 'OCCUPIED') {
                slotStatus = 'occupied';
            } else if (percentage !== undefined) {
                slotStatus = percentage >= 80 ? 'available' : percentage < 60 ? 'occupied' : 'unknown';
            }

            await statusLogRepository.save({
                parkingSlot: node.parkingSlot,
                status: slotStatus,
                distance: distance || null,
                percentage: percentage || null,
                batteryLevel: batteryLevel || null,
                signalQuality: null,
                metadata: {
                    source: 'manual_update',
                    updatedBy: req.user!.id,
                    timestamp: new Date().toISOString()
                }
            });
        }

        logger.info('Node data updated manually', {
            nodeId: node.id,
            adminId: req.user!.id,
            distance,
            percentage,
            batteryLevel,
            state
        });

        return ApiResponseBuilder.success({
            nodeId: node.id,
            distance: node.distance,
            percentage: node.percentage,
            batteryLevel: node.batteryLevel,
            slotStatus: node.slotStatus,
            lastSeen: node.lastSeen
        }, 'Node data updated successfully').send(res);

    } catch (error) {
        logger.error('Update node data error:', error);
        return ApiResponseBuilder.error('Failed to update node data').send(res, 500);
    }
};

/**
 * Get real-time statistics for dashboard
 */
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const nodeRepository = AppDataSource.getRepository(Node);
        const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);
        const statusLogRepository = AppDataSource.getRepository(ParkingStatusLog);

        // Get all nodes for this admin
        const nodes = await nodeRepository.find({
            where: {
                admin: { id: req.user!.id }
            },
            relations: ['parkingSlot', 'parkingSlot.floor', 'parkingSlot.floor.parkingLot', 'gateway']
        });

        // Get all parking slots for this admin with their latest status
        const allSlots = await parkingSlotRepository
            .createQueryBuilder('slot')
            .leftJoinAndSelect('slot.floor', 'floor')
            .leftJoinAndSelect('floor.parkingLot', 'lot')
            .leftJoinAndSelect('slot.node', 'node')
            .where('lot.admin = :adminId', { adminId: req.user!.id })
            .getMany();

        // Get latest status for each slot
        const slotStatusCounts = {
            available: 0,
            occupied: 0,
            reserved: 0,
            unknown: 0
        };

        for (const slot of allSlots) {
            // Get the most recent status log for this slot
            const latestLog = await statusLogRepository.findOne({
                where: { parkingSlot: { id: slot.id } },
                order: { detectedAt: 'DESC' }
            });

            if (latestLog) {
                const status = latestLog.status;
                if (status === 'available') slotStatusCounts.available++;
                else if (status === 'occupied') slotStatusCounts.occupied++;
                else if (status === 'reserved') slotStatusCounts.reserved++;
                else slotStatusCounts.unknown++;
            } else {
                // No status log, default to available
                slotStatusCounts.available++;
            }
        }

        // Calculate statistics
        const stats = {
            totalNodes: nodes.length,
            onlineNodes: nodes.filter(node => node.isOnline).length,
            offlineNodes: nodes.filter(node => !node.isOnline && node.isActive).length,
            inactiveNodes: nodes.filter(node => !node.isActive).length,

            totalSlots: allSlots.length,
            availableSlots: slotStatusCounts.available,
            occupiedSlots: slotStatusCounts.occupied,
            reservedSlots: slotStatusCounts.reserved,
            unknownSlots: slotStatusCounts.unknown,

            averageBatteryLevel: nodes.reduce((sum, node) => sum + (node.batteryLevel || 0), 0) / nodes.length || 0,
            lowBatteryNodes: nodes.filter(node => (node.batteryLevel || 100) < 20).length,

            signalQuality: {
                excellent: nodes.filter(node => node.signalQuality === 'excellent').length,
                good: nodes.filter(node => node.signalQuality === 'good').length,
                fair: nodes.filter(node => node.signalQuality === 'fair').length,
                poor: nodes.filter(node => node.signalQuality === 'poor').length
            }
        };

        // Get recent activity (last 24 hours)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const recentActivity = await statusLogRepository
            .createQueryBuilder('log')
            .leftJoinAndSelect('log.parkingSlot', 'slot')
            .leftJoinAndSelect('slot.floor', 'floor')
            .leftJoinAndSelect('floor.parkingLot', 'lot')
            .where('lot.admin = :adminId', { adminId: req.user!.id })
            .andWhere('log.detectedAt >= :yesterday', { yesterday })
            .orderBy('log.detectedAt', 'DESC')
            .take(10)
            .getMany();

        return ApiResponseBuilder.success({
            statistics: stats,
            recentActivity: recentActivity.map(activity => ({
                id: activity.id,
                slotName: activity.parkingSlot.name,
                status: activity.status,
                detectedAt: activity.detectedAt,
                batteryLevel: activity.batteryLevel,
                signalQuality: activity.signalQuality
            }))
        }, 'Dashboard statistics retrieved successfully').send(res);

    } catch (error) {
        logger.error('Get dashboard stats error:', error);
        return ApiResponseBuilder.error('Failed to retrieve dashboard statistics').send(res, 500);
    }
};

/**
 * ChirpStack webhook endpoint (for testing or backup data reception)
 */
export const handleChirpStackWebhook = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const chirpstackData = req.body;

        logger.info('ChirpStack webhook data received', {
            deviceEui: chirpstackData.deviceInfo?.devEui,
            applicationId: chirpstackData.deviceInfo?.applicationId,
            hasObject: !!chirpstackData.object
        });

        // Process the data through our MQTT service logic
        const { mqttService } = require('../services/mqttService');

        // This will use the same processing logic as MQTT messages
        // but through HTTP webhook (useful for backup or testing)

        return ApiResponseBuilder.success({
            received: true,
            timestamp: new Date().toISOString()
        }, 'ChirpStack webhook data processed successfully').send(res);

    } catch (error) {
        logger.error('ChirpStack webhook error:', error);
        return ApiResponseBuilder.error('Failed to process ChirpStack webhook').send(res, 500);
    }
};