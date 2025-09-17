import { AppDataSource } from '../data-source';
import { logger } from './loggerService';

// Interface for query performance metrics
interface QueryPerformance {
  query: string;
  executionTime: number;
  rowsAffected?: number;
  planTime?: number;
  executionPlan?: any;
}

// Interface for database statistics
interface DatabaseStats {
  totalConnections: number;
  activeConnections: number;
  tableStats: TableStats[];
  indexStats: IndexStats[];
  slowQueries: QueryPerformance[];
}

interface TableStats {
  tableName: string;
  rowCount: number;
  size: string;
  indexCount: number;
}

interface IndexStats {
  tableName: string;
  indexName: string;
  size: string;
  usage: number;
  isUnique: boolean;
}

export class DatabaseOptimizationService {
  private slowQueryThreshold = 1000; // 1 second

  // Execute query with performance monitoring
  async executeQueryWithMetrics<T>(
    query: string,
    parameters?: any[]
  ): Promise<{ result: T; metrics: QueryPerformance }> {
    const startTime = Date.now();
    
    try {
      const result = await AppDataSource.query(query, parameters);
      const executionTime = Date.now() - startTime;
      
      const metrics: QueryPerformance = {
        query,
        executionTime,
        rowsAffected: Array.isArray(result) ? result.length : 1
      };
      
      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        logger.performance('Slow query detected', executionTime, {
          query: query.substring(0, 200), // Truncate long queries
          parameters: parameters?.slice(0, 5), // Limit parameter logging
          rowsAffected: metrics.rowsAffected
        });
      }
      
      return { result, metrics };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('Database query failed', error, {
        query: query.substring(0, 200),
        parameters: parameters?.slice(0, 5),
        executionTime
      });
      
      throw error;
    }
  }

  // Get database connection statistics
  async getConnectionStats(): Promise<{ active: number; idle: number; total: number }> {
    try {
      const result = await AppDataSource.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN state = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);
      
      return result[0];
    } catch (error) {
      logger.error('Failed to get connection stats', error);
      return { active: 0, idle: 0, total: 0 };
    }
  }

  // Get table statistics
  async getTableStats(): Promise<TableStats[]> {
    try {
      const result = await AppDataSource.query(`
        SELECT 
          schemaname,
          tablename as table_name,
          n_tup_ins + n_tup_upd + n_tup_del as total_operations,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          (
            SELECT COUNT(*) 
            FROM pg_indexes 
            WHERE tablename = t.tablename AND schemaname = t.schemaname
          ) as index_count
        FROM pg_stat_user_tables t
        ORDER BY total_operations DESC
      `);
      
      return result.map((row: any) => ({
        tableName: row.table_name,
        rowCount: parseInt(row.total_operations || '0'),
        size: row.size,
        indexCount: parseInt(row.index_count || '0')
      }));
    } catch (error) {
      logger.error('Failed to get table stats', error);
      return [];
    }
  }

  // Get index statistics
  async getIndexStats(): Promise<IndexStats[]> {
    try {
      const result = await AppDataSource.query(`
        SELECT 
          t.schemaname,
          t.tablename,
          t.indexname,
          pg_size_pretty(pg_relation_size(t.indexname::regclass)) as size,
          i.indisunique as is_unique,
          COALESCE(s.idx_tup_read, 0) as usage
        FROM pg_tables t
        JOIN pg_indexes i ON t.tablename = i.tablename AND t.schemaname = i.schemaname
        LEFT JOIN pg_stat_user_indexes s ON s.indexrelname = i.indexname
        WHERE t.schemaname = 'public'
        ORDER BY usage DESC
      `);
      
      return result.map((row: any) => ({
        tableName: row.tablename,
        indexName: row.indexname,
        size: row.size,
        usage: parseInt(row.usage || '0'),
        isUnique: row.is_unique
      }));
    } catch (error) {
      logger.error('Failed to get index stats', error);
      return [];
    }
  }

  // Analyze query performance and suggest optimizations
  async analyzeQuery(query: string): Promise<{
    executionPlan: any;
    suggestions: string[];
    estimatedCost: number;
  }> {
    try {
      // Get query execution plan
      const planResult = await AppDataSource.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`);
      const executionPlan = planResult[0]['QUERY PLAN'][0];
      
      const suggestions: string[] = [];
      const estimatedCost = executionPlan.Plan['Total Cost'];
      
      // Analyze execution plan for optimization opportunities
      if (executionPlan.Plan['Node Type'] === 'Seq Scan') {
        suggestions.push('Consider adding an index to avoid sequential scan');
      }
      
      if (estimatedCost > 1000) {
        suggestions.push('High cost query detected - consider query optimization');
      }
      
      if (executionPlan.Plan['Actual Total Time'] > 1000) {
        suggestions.push('Long execution time - consider adding indexes or rewriting query');
      }
      
      return {
        executionPlan,
        suggestions,
        estimatedCost
      };
    } catch (error) {
      logger.error('Failed to analyze query', error);
      throw error;
    }
  }

  // Check for missing indexes based on query patterns
  async suggestIndexes(): Promise<string[]> {
    const suggestions: string[] = [];
    
    try {
      // Check for tables without indexes on frequently used columns
      const tablesWithoutIndexes = await AppDataSource.query(`
        SELECT 
          tablename,
          attname
        FROM pg_stats 
        WHERE schemaname = 'public' 
          AND n_distinct > 100 
          AND tablename NOT IN (
            SELECT tablename 
            FROM pg_indexes 
            WHERE schemaname = 'public'
              AND indexname LIKE '%' || attname || '%'
          )
        ORDER BY n_distinct DESC
        LIMIT 10
      `);
      
      tablesWithoutIndexes.forEach((row: any) => {
        suggestions.push(`Consider adding index on ${row.tablename}.${row.attname}`);
      });
      
    } catch (error) {
      logger.error('Failed to suggest indexes', error);
    }
    
    return suggestions;
  }

  // Optimize table statistics
  async updateTableStatistics(): Promise<void> {
    try {
      logger.info('Starting database statistics update');
      
      // Get all user tables
      const tables = await AppDataSource.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
      `);
      
      // Update statistics for each table
      for (const table of tables) {
        try {
          await AppDataSource.query(`ANALYZE "${table.tablename}"`);
          logger.debug(`Statistics updated for table: ${table.tablename}`);
        } catch (error) {
          logger.warn(`Failed to update statistics for table: ${table.tablename}`, { error });
        }
      }
      
      logger.info('Database statistics update completed');
    } catch (error) {
      logger.error('Failed to update table statistics', error);
      throw error;
    }
  }

  // Monitor and log database performance metrics
  async monitorPerformance(): Promise<DatabaseStats> {
    try {
      logger.info('Collecting database performance metrics');
      
      const [connectionStats, tableStats, indexStats] = await Promise.all([
        this.getConnectionStats(),
        this.getTableStats(),
        this.getIndexStats()
      ]);
      
      const stats: DatabaseStats = {
        totalConnections: connectionStats.total,
        activeConnections: connectionStats.active,
        tableStats,
        indexStats,
        slowQueries: [] // Would be populated from a query log in production
      };
      
      // Log performance summary
      logger.info('Database performance metrics collected', {
        category: 'performance',
        activeConnections: stats.activeConnections,
        totalTables: stats.tableStats.length,
        totalIndexes: stats.indexStats.length
      });
      
      // Alert on high connection usage
      const connectionUsagePercent = (stats.activeConnections / Math.max(stats.totalConnections, 1)) * 100;
      if (connectionUsagePercent > 80) {
        logger.warn('High database connection usage detected', {
          usagePercent: connectionUsagePercent,
          activeConnections: stats.activeConnections,
          totalConnections: stats.totalConnections
        });
      }
      
      return stats;
    } catch (error) {
      logger.error('Failed to monitor database performance', error);
      throw error;
    }
  }

  // Clean up old data based on retention policies
  async cleanupOldData(): Promise<void> {
    try {
      logger.info('Starting database cleanup');
      
      // Clean up old parking status logs (keep last 90 days)
      const cleanupResult = await AppDataSource.query(`
        DELETE FROM parking_status_log 
        WHERE timestamp < NOW() - INTERVAL '90 days'
      `);
      
      if (cleanupResult.affectedRows > 0) {
        logger.info('Cleaned up old parking status logs', {
          deletedRows: cleanupResult.affectedRows
        });
      }
      
      // Vacuum analyze after cleanup
      await AppDataSource.query('VACUUM ANALYZE parking_status_log');
      
      logger.info('Database cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup old data', error);
      throw error;
    }
  }

  // Check database health
  async healthCheck(): Promise<{
    isHealthy: boolean;
    issues: string[];
    metrics: any;
  }> {
    const issues: string[] = [];
    let isHealthy = true;
    
    try {
      // Check connection
      const connectionStats = await this.getConnectionStats();
      
      // Check for connection pool exhaustion
      if (connectionStats.active > connectionStats.total * 0.9) {
        issues.push('Connection pool near exhaustion');
        isHealthy = false;
      }
      
      // Check for unused indexes
      const indexStats = await this.getIndexStats();
      const unusedIndexes = indexStats.filter(idx => idx.usage === 0);
      
      if (unusedIndexes.length > 0) {
        issues.push(`${unusedIndexes.length} unused indexes detected`);
      }
      
      return {
        isHealthy,
        issues,
        metrics: {
          connections: connectionStats,
          unusedIndexes: unusedIndexes.length
        }
      };
    } catch (error) {
      logger.error('Database health check failed', error);
      return {
        isHealthy: false,
        issues: ['Health check failed'],
        metrics: {}
      };
    }
  }
}

// Export singleton instance
export const dbOptimizationService = new DatabaseOptimizationService();