import { AppDataSource } from '../data-source';
import { Gateway } from '../models/Gateway';
import { Node } from '../models/Node';
import { User } from '../models/User';
import { ParkingLot } from '../models/ParkingLot';
import { In, Not, IsNull } from 'typeorm';

export interface CreateGatewayData {
    chirpstackGatewayId: string;
    name: string;
    description?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    createdBy: User;
    metadata?: Record<string, any>;
}

export interface UpdateGatewayData {
    name?: string;
    description?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    isActive?: boolean;
    metadata?: Record<string, any>;
}

export interface LinkGatewayData {
    gatewayId: string;
    adminId: string;
}

export interface CreateNodeData {
    gatewayId: string;
    chirpstackDeviceId: string;
    name: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    adminId: string;
    metadata?: Record<string, any>;
}

export class GatewayService {
    private gatewayRepository = AppDataSource.getRepository(Gateway);
    private nodeRepository = AppDataSource.getRepository(Node);
    private userRepository = AppDataSource.getRepository(User);
    private parkingLotRepository = AppDataSource.getRepository(ParkingLot);

    /**
     * Super Admin: Create a new gateway
     */
    async createGateway(data: CreateGatewayData): Promise<Gateway> {
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
    async getAllGateways(includeInactive = false): Promise<Gateway[]> {
        const whereClause = includeInactive ? {} : { isActive: true };

        return await this.gatewayRepository.find({
            where: whereClause,
            relations: ['linkedAdmin', 'createdBy', 'nodes', 'parkingLot'],
            order: { createdAt: 'DESC' }
        });
    }

    /**
     * Super Admin: Get gateway by ID with all nodes
     */
    async getGatewayById(id: string): Promise<Gateway | null> {
        return await this.gatewayRepository.findOne({
            where: { id },
            relations: ['linkedAdmin', 'createdBy', 'nodes', 'nodes.admin', 'nodes.parkingSlot', 'parkingLot']
        });
    }

    /**
     * Super Admin: Update gateway
     */
    async updateGateway(id: string, data: UpdateGatewayData): Promise<Gateway> {
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
    async deleteGateway(id: string): Promise<void> {
        const gateway = await this.gatewayRepository.findOne({
            where: { id },
            relations: ['nodes']
        });

        if (!gateway) {
            throw new Error('Gateway not found');
        }

        if (gateway.isLinked) {
            throw new Error('Cannot delete a linked gateway. Unlink it first.');
        }

        if (gateway.nodes && gateway.nodes.length > 0) {
            throw new Error('Cannot delete gateway with active nodes. Remove nodes first.');
        }

        await this.gatewayRepository.delete(id);
    }

    /**
     * Admin: Get available gateways for linking
     */
    async getAvailableGateways(): Promise<Gateway[]> {
        return await this.gatewayRepository.find({
            where: { 
                isActive: true, 
                isLinked: false,
                linkedAdmin: IsNull()
            },
            order: { createdAt: 'DESC' }
        });
    }

    /**
     * Admin: Link gateway to admin account
     */
    async linkGatewayToAdmin(data: LinkGatewayData): Promise<Gateway> {
        return await AppDataSource.transaction(async manager => {
            const gatewayRepository = manager.getRepository(Gateway);
            const userRepository = manager.getRepository(User);

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
    async unlinkGatewayFromAdmin(gatewayId: string, adminId: string): Promise<Gateway> {
        const gateway = await this.gatewayRepository.findOne({
            where: { id: gatewayId, linkedAdmin: { id: adminId } },
            relations: ['linkedAdmin']
        });

        if (!gateway) {
            throw new Error('Gateway not found or not linked to this admin');
        }

        gateway.linkedAdmin = null as any;
        gateway.isLinked = false;
        gateway.linkedAt = null as any;
        gateway.parkingLot = null as any;

        return await this.gatewayRepository.save(gateway);
    }

    /**
     * Admin: Get gateways linked to admin
     */
    async getAdminLinkedGateways(adminId: string): Promise<Gateway[]> {
        return await this.gatewayRepository.find({
            where: { linkedAdmin: { id: adminId } },
            relations: ['nodes', 'nodes.parkingSlot', 'parkingLot', 'parkingLot.floors'],
            order: { linkedAt: 'DESC' }
        });
    }

    /**
     * Admin: Assign gateway to parking lot
     */
    async assignGatewayToParkingLot(gatewayId: string, parkingLotId: string, adminId: string): Promise<Gateway> {
        return await AppDataSource.transaction(async manager => {
            const gatewayRepository = manager.getRepository(Gateway);
            const parkingLotRepository = manager.getRepository(ParkingLot);

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
    async createNode(data: CreateNodeData): Promise<Node> {
        return await AppDataSource.transaction(async manager => {
            const nodeRepository = manager.getRepository(Node);
            const gatewayRepository = manager.getRepository(Gateway);
            const userRepository = manager.getRepository(User);

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
     */
    async getGatewayNodes(gatewayId: string, adminId?: string): Promise<Node[]> {
        const whereClause: any = { gateway: { id: gatewayId } };
        
        // If adminId is provided, ensure gateway belongs to admin
        if (adminId) {
            whereClause.gateway = { id: gatewayId, linkedAdmin: { id: adminId } };
        }

        return await this.nodeRepository.find({
            where: whereClause,
            relations: ['gateway', 'admin', 'parkingSlot', 'parkingSlot.floor'],
            order: { createdAt: 'DESC' }
        });
    }

    /**
     * Update node status (heartbeat)
     */
    async updateNodeStatus(chirpstackDeviceId: string, metadata: Record<string, any> = {}): Promise<Node | null> {
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
    async updateGatewayStatus(chirpstackGatewayId: string, metadata: Record<string, any> = {}): Promise<Gateway | null> {
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
    async getGatewayStatistics(gatewayId?: string, adminId?: string): Promise<{
        totalGateways: number;
        activeGateways: number;
        linkedGateways: number;
        totalNodes: number;
        activeNodes: number;
        onlineNodes: number;
    }> {
        const gatewayWhere: any = gatewayId ? { id: gatewayId } : {};
        if (adminId) {
            gatewayWhere.linkedAdmin = { id: adminId };
        }

        const nodeWhere: any = {};
        if (gatewayId) {
            nodeWhere.gateway = { id: gatewayId };
        }
        if (adminId) {
            nodeWhere.gateway = { ...nodeWhere.gateway, linkedAdmin: { id: adminId } };
        }

        const [
            totalGateways,
            activeGateways,
            linkedGateways,
            totalNodes,
            activeNodes,
            allNodes
        ] = await Promise.all([
            this.gatewayRepository.count({ where: gatewayWhere }),
            this.gatewayRepository.count({ where: { ...gatewayWhere, isActive: true } }),
            this.gatewayRepository.count({ where: { ...gatewayWhere, isLinked: true } }),
            this.nodeRepository.count({ where: nodeWhere }),
            this.nodeRepository.count({ where: { ...nodeWhere, isActive: true } }),
            this.nodeRepository.find({ where: nodeWhere, select: ['lastSeen'] })
        ]);

        // Count online nodes (seen in last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const onlineNodes = allNodes.filter(node => 
            node.lastSeen && node.lastSeen > fiveMinutesAgo
        ).length;

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

export const gatewayService = new GatewayService();