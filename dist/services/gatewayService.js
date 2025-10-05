"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatewayService = exports.GatewayService = void 0;
const data_source_1 = require("../data-source");
const Gateway_1 = require("../models/Gateway");
const Node_1 = require("../models/Node");
const User_1 = require("../models/User");
const ParkingLot_1 = require("../models/ParkingLot");
const typeorm_1 = require("typeorm");
class GatewayService {
    constructor() {
        this.gatewayRepository = data_source_1.AppDataSource.getRepository(Gateway_1.Gateway);
        this.nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        this.userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        this.parkingLotRepository = data_source_1.AppDataSource.getRepository(ParkingLot_1.ParkingLot);
    }
    /**
     * Super Admin: Create a new gateway
     */
    async createGateway(data) {
        // Check if gateway with same ChirpStack ID already exists
        const existingGateway = await this.gatewayRepository.findOne({
            where: { chirpstackGatewayId: data.chirpstackGatewayId }
        });
        if (existingGateway) {
            throw new Error(`Gateway with ChirpStack ID ${data.chirpstackGatewayId} already exists`);
        }
        const gateway = this.gatewayRepository.create({
            chirpstackGatewayId: data.chirpstackGatewayId,
            name: data.name,
            description: data.description,
            location: data.location,
            latitude: data.latitude,
            longitude: data.longitude,
            createdBy: data.createdBy,
            isActive: true,
            isLinked: false,
            metadata: data.metadata || {}
        });
        return await this.gatewayRepository.save(gateway);
    }
    /**
     * Super Admin: Get all gateways with nodes
     */
    async getAllGateways(includeInactive = false) {
        const whereClause = includeInactive ? {} : { isActive: true };
        return await this.gatewayRepository.find({
            where: whereClause,
            relations: ['linkedAdmin', 'createdBy', 'parkingLot'],
            order: { createdAt: 'DESC' }
        });
    }
    /**
     * Super Admin: Get gateway by ID with all nodes
     */
    async getGatewayById(id) {
        return await this.gatewayRepository.findOne({
            where: { id },
            relations: ['linkedAdmin', 'createdBy', 'parkingLot']
        });
    }
    /**
     * Super Admin: Update gateway
     */
    async updateGateway(id, data) {
        const gateway = await this.gatewayRepository.findOne({ where: { id } });
        if (!gateway) {
            throw new Error('Gateway not found');
        }
        Object.assign(gateway, data);
        return await this.gatewayRepository.save(gateway);
    }
    /**
     * Super Admin: Delete gateway (soft delete)
     */
    async deleteGateway(id) {
        const gateway = await this.gatewayRepository.findOne({
            where: { id }
        });
        if (!gateway) {
            throw new Error('Gateway not found');
        }
        if (gateway.isLinked) {
            throw new Error('Cannot delete a linked gateway. Unlink it first.');
        }
        // Note: Nodes are no longer directly connected to gateways
        // Gateway deletion check based on nodes is no longer needed
        await this.gatewayRepository.delete(id);
    }
    /**
     * Admin: Get available gateways for linking
     */
    async getAvailableGateways() {
        return await this.gatewayRepository.find({
            where: {
                isActive: true,
                isLinked: false,
                linkedAdmin: (0, typeorm_1.IsNull)()
            },
            order: { createdAt: 'DESC' }
        });
    }
    /**
     * Admin: Link gateway to admin account
     */
    async linkGatewayToAdmin(data) {
        return await data_source_1.AppDataSource.transaction(async (manager) => {
            const gatewayRepository = manager.getRepository(Gateway_1.Gateway);
            const userRepository = manager.getRepository(User_1.User);
            const gateway = await gatewayRepository.findOne({
                where: { id: data.gatewayId }
            });
            if (!gateway) {
                throw new Error('Gateway not found');
            }
            if (gateway.isLinked || gateway.linkedAdmin) {
                throw new Error('Gateway is already linked to another admin');
            }
            const admin = await userRepository.findOne({
                where: { id: data.adminId, role: 'admin' }
            });
            if (!admin) {
                throw new Error('Admin user not found');
            }
            gateway.linkedAdmin = admin;
            gateway.isLinked = true;
            gateway.linkedAt = new Date();
            return await gatewayRepository.save(gateway);
        });
    }
    /**
     * Admin: Unlink gateway from admin account
     */
    async unlinkGatewayFromAdmin(gatewayId, adminId) {
        const gateway = await this.gatewayRepository.findOne({
            where: { id: gatewayId, linkedAdmin: { id: adminId } },
            relations: ['linkedAdmin']
        });
        if (!gateway) {
            throw new Error('Gateway not found or not linked to this admin');
        }
        gateway.linkedAdmin = null;
        gateway.isLinked = false;
        gateway.linkedAt = null;
        gateway.parkingLot = null;
        return await this.gatewayRepository.save(gateway);
    }
    /**
     * Admin: Get gateways linked to admin
     */
    async getAdminLinkedGateways(adminId) {
        return await this.gatewayRepository.find({
            where: { linkedAdmin: { id: adminId } },
            relations: ['parkingLot', 'parkingLot.floors'],
            order: { linkedAt: 'DESC' }
        });
    }
    /**
     * Admin: Assign gateway to parking lot
     */
    async assignGatewayToParkingLot(gatewayId, parkingLotId, adminId) {
        return await data_source_1.AppDataSource.transaction(async (manager) => {
            const gatewayRepository = manager.getRepository(Gateway_1.Gateway);
            const parkingLotRepository = manager.getRepository(ParkingLot_1.ParkingLot);
            const gateway = await gatewayRepository.findOne({
                where: { id: gatewayId, linkedAdmin: { id: adminId } }
            });
            if (!gateway) {
                throw new Error('Gateway not found or not linked to this admin');
            }
            const parkingLot = await parkingLotRepository.findOne({
                where: { id: parkingLotId, admin: { id: adminId } }
            });
            if (!parkingLot) {
                throw new Error('Parking lot not found or not owned by this admin');
            }
            gateway.parkingLot = parkingLot;
            return await gatewayRepository.save(gateway);
        });
    }
    /**
     * Admin: Create node under gateway
     */
    async createNode(data) {
        return await data_source_1.AppDataSource.transaction(async (manager) => {
            const nodeRepository = manager.getRepository(Node_1.Node);
            const gatewayRepository = manager.getRepository(Gateway_1.Gateway);
            const userRepository = manager.getRepository(User_1.User);
            // Check if gateway belongs to admin
            const gateway = await gatewayRepository.findOne({
                where: { id: data.gatewayId, linkedAdmin: { id: data.adminId } }
            });
            if (!gateway) {
                throw new Error('Gateway not found or not linked to this admin');
            }
            // Check if node with same ChirpStack ID exists
            const existingNode = await nodeRepository.findOne({
                where: { chirpstackDeviceId: data.chirpstackDeviceId }
            });
            if (existingNode) {
                throw new Error(`Node with ChirpStack ID ${data.chirpstackDeviceId} already exists`);
            }
            const admin = await userRepository.findOne({ where: { id: data.adminId } });
            if (!admin) {
                throw new Error('Admin not found');
            }
            // NOTE: This createNode service function is obsolete as nodes now require parking slots
            // and should be created via the new hierarchy-enforced API endpoint
            throw new Error('Node creation via gateway service is deprecated. Use the new parking slot-based node creation API.');
        });
    }
    /**
     * Get all nodes for a gateway
     * Note: After architecture change, nodes are now linked to parking slots,
     * and gateway relationship is stored in metadata
     */
    async getGatewayNodes(gatewayId, adminId) {
        // First, verify the gateway exists and belongs to admin if specified
        const gateway = await this.gatewayRepository.findOne({
            where: adminId ? { id: gatewayId, linkedAdmin: { id: adminId } } : { id: gatewayId },
            relations: ['linkedAdmin']
        });
        if (!gateway) {
            throw new Error('Gateway not found or access denied');
        }
        // Find nodes that have this gateway in their metadata
        // Note: This is a workaround since nodes no longer have direct gateway relationship
        const allNodes = await this.nodeRepository.find({
            where: adminId ? { admin: { id: adminId } } : {},
            relations: ['admin', 'parkingSlot', 'parkingSlot.floor', 'parkingSlot.floor.parkingLot'],
            order: { createdAt: 'DESC' }
        });
        // Filter nodes by gatewayId in metadata
        return allNodes.filter(node => node.metadata?.gatewayId === gatewayId);
    }
    /**
     * Update node status (heartbeat)
     */
    async updateNodeStatus(chirpstackDeviceId, metadata = {}) {
        const node = await this.nodeRepository.findOne({
            where: { chirpstackDeviceId }
        });
        if (!node) {
            return null;
        }
        node.lastSeen = new Date();
        node.metadata = { ...node.metadata, ...metadata };
        return await this.nodeRepository.save(node);
    }
    /**
     * Update gateway status (heartbeat)
     */
    async updateGatewayStatus(chirpstackGatewayId, metadata = {}) {
        const gateway = await this.gatewayRepository.findOne({
            where: { chirpstackGatewayId }
        });
        if (!gateway) {
            return null;
        }
        gateway.lastSeen = new Date();
        gateway.metadata = { ...gateway.metadata, ...metadata };
        return await this.gatewayRepository.save(gateway);
    }
    /**
     * Get gateway statistics
     */
    async getGatewayStatistics(gatewayId, adminId) {
        const gatewayWhere = gatewayId ? { id: gatewayId } : {};
        if (adminId) {
            gatewayWhere.linkedAdmin = { id: adminId };
        }
        const nodeWhere = {};
        if (adminId) {
            nodeWhere.admin = { id: adminId };
        }
        // Get nodes filtered by gatewayId if specified
        let filteredNodes = [];
        if (gatewayId && adminId) {
            // Find nodes that belong to this admin and have the specified gatewayId in metadata
            const adminNodes = await this.nodeRepository.find({
                where: { admin: { id: adminId } },
                select: ['id', 'lastSeen', 'isActive', 'metadata']
            });
            filteredNodes = adminNodes.filter(node => node.metadata?.gatewayId === gatewayId);
        }
        else if (adminId) {
            // Get all nodes for this admin
            filteredNodes = await this.nodeRepository.find({
                where: { admin: { id: adminId } },
                select: ['id', 'lastSeen', 'isActive', 'metadata']
            });
        }
        else {
            // Get all nodes (super admin view)
            filteredNodes = await this.nodeRepository.find({
                select: ['id', 'lastSeen', 'isActive', 'metadata']
            });
        }
        const [totalGateways, activeGateways, linkedGateways] = await Promise.all([
            this.gatewayRepository.count({ where: gatewayWhere }),
            this.gatewayRepository.count({ where: { ...gatewayWhere, isActive: true } }),
            this.gatewayRepository.count({ where: { ...gatewayWhere, isLinked: true } })
        ]);
        // Calculate node statistics from filtered nodes
        const totalNodes = filteredNodes.length;
        const activeNodes = filteredNodes.filter(node => node.isActive).length;
        // Count online nodes (seen in last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const onlineNodes = filteredNodes.filter(node => node.lastSeen && node.lastSeen > fiveMinutesAgo).length;
        return {
            totalGateways,
            activeGateways,
            linkedGateways,
            totalNodes,
            activeNodes,
            onlineNodes
        };
    }
}
exports.GatewayService = GatewayService;
exports.gatewayService = new GatewayService();
