"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedParkingDemoData = void 0;
const data_source_1 = require("../data-source");
const User_1 = require("../models/User");
const ParkingLot_1 = require("../models/ParkingLot");
const Floor_1 = require("../models/Floor");
const ParkingSlot_1 = require("../models/ParkingSlot");
const Node_1 = require("../models/Node");
const DEFAULT_ADMIN_EMAIL = 'admin1@test.com';
const DEFAULT_PARKING_LOT_NAME = 'Smart Parking Demo Lot';
const FLOORS_TO_CREATE = 10;
const SLOTS_PER_FLOOR = 50;
const getArgValue = (flag) => {
    const index = process.argv.findIndex(arg => arg === flag);
    if (index !== -1 && index + 1 < process.argv.length) {
        return process.argv[index + 1];
    }
    return undefined;
};
const generateDeviceId = (seed) => {
    const base = BigInt('0x1a2b000000000000');
    const value = base + BigInt(seed);
    return value.toString(16).padStart(16, '0').slice(-16);
};
const seedParkingDemoData = async () => {
    const adminEmail = getArgValue('--admin-email') || process.env.SEED_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
    const parkingLotName = getArgValue('--lot-name') || process.env.SEED_PARKING_LOT_NAME || DEFAULT_PARKING_LOT_NAME;
    console.log('🚗 Seeding parking demo data');
    console.log(`   ↳ Admin email: ${adminEmail}`);
    console.log(`   ↳ Parking lot: ${parkingLotName}`);
    try {
        await data_source_1.AppDataSource.initialize();
        console.log('✅ Database connection established');
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const parkingLotRepository = data_source_1.AppDataSource.getRepository(ParkingLot_1.ParkingLot);
        const floorRepository = data_source_1.AppDataSource.getRepository(Floor_1.Floor);
        const slotRepository = data_source_1.AppDataSource.getRepository(ParkingSlot_1.ParkingSlot);
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        const admin = await userRepository.findOne({ where: { email: adminEmail } });
        if (!admin) {
            throw new Error(`Admin user with email ${adminEmail} not found`);
        }
        let parkingLot = await parkingLotRepository.findOne({
            where: { name: parkingLotName, admin: { id: admin.id } },
        });
        if (!parkingLot) {
            parkingLot = parkingLotRepository.create({
                name: parkingLotName,
                address: '123 Demo Street, Smart City',
                latitude: 19.0760,
                longitude: 72.8777,
                isActive: true,
                admin,
            });
            parkingLot = await parkingLotRepository.save(parkingLot);
            console.log(`🏢 Created parking lot ${parkingLot.name} (${parkingLot.id})`);
        }
        else {
            console.log(`🏢 Using existing parking lot ${parkingLot.name} (${parkingLot.id})`);
        }
        const existingFloorCount = await floorRepository.count({
            where: { parkingLot: { id: parkingLot.id } },
        });
        if (existingFloorCount > 0) {
            console.log(`🧹 Clearing ${existingFloorCount} existing floors (and related slots/nodes)`);
            await floorRepository
                .createQueryBuilder()
                .delete()
                .where('"parkingLotId" = :parkingLotId', { parkingLotId: parkingLot.id })
                .execute();
        }
        const floorsToSave = [];
        for (let i = 0; i < FLOORS_TO_CREATE; i += 1) {
            floorsToSave.push(floorRepository.create({
                name: `Level ${i + 1}`,
                level: i + 1,
                parkingLot,
            }));
        }
        const floors = await floorRepository.save(floorsToSave);
        console.log(`🏗️ Created ${floors.length} floors`);
        let globalSlotCounter = 0;
        for (let floorIndex = 0; floorIndex < floors.length; floorIndex += 1) {
            const floor = floors[floorIndex];
            const slotsToSave = [];
            for (let slotIndex = 0; slotIndex < SLOTS_PER_FLOOR; slotIndex += 1) {
                globalSlotCounter += 1;
                const slotName = `F${floorIndex + 1}-S${String(slotIndex + 1).padStart(2, '0')}`;
                slotsToSave.push(slotRepository.create({
                    name: slotName,
                    isReservable: (slotIndex + 1) % 10 === 0,
                    floor,
                }));
            }
            const slots = await slotRepository.save(slotsToSave);
            const nodesToSave = slots.map((slot, idx) => {
                const slotNumber = floorIndex * SLOTS_PER_FLOOR + idx + 1;
                return nodeRepository.create({
                    admin,
                    parkingSlot: slot,
                    chirpstackDeviceId: generateDeviceId(slotNumber),
                    name: `Sensor ${slot.name}`,
                    description: `Auto-seeded sensor for ${slot.name} on ${floor.name}`,
                    metadata: {
                        seeded: true,
                        floor: floor.name,
                        slot: slot.name,
                    },
                });
            });
            await nodeRepository.save(nodesToSave);
            console.log(`   • Floor ${floor.name}: ${slots.length} slots + ${nodesToSave.length} nodes created`);
        }
        console.log('✅ Parking demo data seeded successfully');
    }
    catch (error) {
        console.error('❌ Failed to seed parking demo data');
        console.error(error);
        process.exitCode = 1;
    }
    finally {
        if (data_source_1.AppDataSource.isInitialized) {
            await data_source_1.AppDataSource.destroy();
            console.log('🔌 Database connection closed');
        }
    }
};
exports.seedParkingDemoData = seedParkingDemoData;
if (require.main === module) {
    seedParkingDemoData().then(() => {
        if (process.exitCode === 1) {
            process.exit(1);
        }
        process.exit(0);
    });
}
