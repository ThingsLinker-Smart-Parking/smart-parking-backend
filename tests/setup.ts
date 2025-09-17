import { AppDataSource } from '../src/data-source';
import { logger } from '../src/services/loggerService';

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Initialize test database connection
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    logger.info('Test database connection established');
  }
});

// Global test teardown
afterAll(async () => {
  // Clean up database connection
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logger.info('Test database connection closed');
  }
});

// Reset database state between tests
beforeEach(async () => {
  // Clear all tables except migrations
  const entities = AppDataSource.entityMetadatas;

  for (const entity of entities) {
    const repository = AppDataSource.getRepository(entity.name);
    await repository.clear();
  }
});

// Suppress console logs during tests unless debugging
if (!process.env.DEBUG_TESTS) {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}