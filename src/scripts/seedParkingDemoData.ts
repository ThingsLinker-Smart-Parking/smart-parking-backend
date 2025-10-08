import { AppDataSource } from '../data-source';
import { User } from '../models/User';
import { ParkingLot } from '../models/ParkingLot';
import { Floor } from '../models/Floor';
import { ParkingSlot } from '../models/ParkingSlot';
import { Node } from '../models/Node';

const DEFAULT_ADMIN_EMAIL = 'admin1@test.com';
const DEFAULT_PARKING_LOT_NAME = 'Smart Parking Demo Lot';
const FLOORS_TO_CREATE = 10;
const SLOTS_PER_FLOOR = 50;

const getArgValue = (flag: string): string | undefined => {
  const index = process.argv.findIndex(arg => arg === flag);
  if (index !== -1 && index + 1 < process.argv.length) {
    return process.argv[index + 1];
  }
  return undefined;
};

const generateDeviceId = (seed: number): string => {
  const base = BigInt('0x1a2b000000000000');
  const value = base + BigInt(seed);
  return value.toString(16).padStart(16, '0').slice(-16);
};

const seedParkingDemoData = async () => {
  const adminEmail =
    getArgValue('--admin-email') || process.env.SEED_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
  const parkingLotName =
    getArgValue('--lot-name') || process.env.SEED_PARKING_LOT_NAME || DEFAULT_PARKING_LOT_NAME;

  console.log('🚗 Seeding parking demo data');
  console.log(`   ↳ Admin email: ${adminEmail}`);
  console.log(`   ↳ Parking lot: ${parkingLotName}`);

  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    const userRepository = AppDataSource.getRepository(User);
    const parkingLotRepository = AppDataSource.getRepository(ParkingLot);
    const floorRepository = AppDataSource.getRepository(Floor);
    const slotRepository = AppDataSource.getRepository(ParkingSlot);
    const nodeRepository = AppDataSource.getRepository(Node);

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
    } else {
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

    const floorsToSave: Floor[] = [];

    for (let i = 0; i < FLOORS_TO_CREATE; i += 1) {
      floorsToSave.push(
        floorRepository.create({
          name: `Level ${i + 1}`,
          level: i + 1,
          parkingLot,
        })
      );
    }

    const floors = await floorRepository.save(floorsToSave);
    console.log(`🏗️ Created ${floors.length} floors`);

    let globalSlotCounter = 0;

    for (let floorIndex = 0; floorIndex < floors.length; floorIndex += 1) {
      const floor = floors[floorIndex];

      const slotsToSave: ParkingSlot[] = [];

      for (let slotIndex = 0; slotIndex < SLOTS_PER_FLOOR; slotIndex += 1) {
        globalSlotCounter += 1;

        const slotName = `F${floorIndex + 1}-S${String(slotIndex + 1).padStart(2, '0')}`;

        slotsToSave.push(
          slotRepository.create({
            name: slotName,
            isReservable: (slotIndex + 1) % 10 === 0,
            floor,
          })
        );
      }

      const slots = await slotRepository.save(slotsToSave);

      const nodesToSave: Node[] = slots.map((slot, idx) => {
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
      console.log(
        `   • Floor ${floor.name}: ${slots.length} slots + ${nodesToSave.length} nodes created`
      );
    }

    console.log('✅ Parking demo data seeded successfully');
  } catch (error) {
    console.error('❌ Failed to seed parking demo data');
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
};

if (require.main === module) {
  seedParkingDemoData().then(() => {
    if (process.exitCode === 1) {
      process.exit(1);
    }
    process.exit(0);
  });
}

export { seedParkingDemoData };
