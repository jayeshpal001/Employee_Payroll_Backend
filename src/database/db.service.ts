import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { Pool, PoolClient, PoolConfig } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  // Yaha initialize mat karo, bas type batao
  private pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  async onModuleInit() {
    // Step 1: Base Configuration (Jo dono jagah same rahegi)
    const config: PoolConfig = {
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Cloud ke liye time badhaya (10s)
    };

    // Step 2: Check karo ki hum kaha hain (Cloud vs Local)
    if (process.env.DATABASE_URL) {
      // --- PRODUCTION (Render/Neon) ---
      this.logger.log('🚀 Cloud Database Detected: Connecting via Connection String...');
      
      config.connectionString = process.env.DATABASE_URL;
      config.ssl = { rejectUnauthorized: false }; // IMPORTANT: Neon/Render bina SSL ke fail ho jayega
    
    } else {
      // --- LOCAL (Laptop) ---
      this.logger.log('💻 Local Database Detected: Connecting via Variables...');
      
      config.host = process.env.DB_HOST || 'localhost';
      config.port = parseInt(process.env.DB_PORT || '5432');
      config.database = process.env.DB_NAME || 'payroll_db';
      config.user = process.env.DB_USER || 'postgres';
      config.password = process.env.DB_PASSWORD || 'postgres';
    }

    // Step 3: Pool Create karo
    this.pool = new Pool(config);

    // Step 4: Connection Test (Taaki deploy hote hi pata chal jaye agar error hai)
    try {
      const client = await this.pool.connect();
      this.logger.log('✅ Database Connected Successfully!');
      client.release();
    } catch (error) {
      this.logger.error('❌ Database Connection Failed. Check .env or Render Vars', error);
      // Error throw mat karna yaha, retry logic handle kar lega ya app crash ho jayega jo sahi hai debug ke liye
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    const result = await this.pool.query(text, params);
    const duration = Date.now() - start;
    
    // Sirf Development me logs dikhao, Production me logs clean rakho
    if (process.env.NODE_ENV !== 'production') {
       this.logger.log(`Query: ${text} | Duration: ${duration}ms | Rows: ${result.rowCount}`);
    }
    
    return result;
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }
}