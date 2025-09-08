import { DATABASE_CONFIG } from '../config';

// D1 Database client for Cloudflare Workers
export class D1Client {
  private db: any;
  
  constructor(db?: any) {
    this.db = db;
  }
  
  // Initialize D1 client with binding
  static create(binding: any) {
    return new D1Client(binding);
  }
  
  // Execute raw SQL query
  async execute(sql: string, params: any[] = []) {
    if (!this.db) {
      throw new Error('D1 database not initialized');
    }
    
    try {
      const result = await this.db.prepare(sql).bind(...params).run();
      return result;
    } catch (error) {
      console.error('D1 execute error:', error);
      throw error;
    }
  }
  
  // Get first result
  async first(sql: string, params: any[] = []) {
    if (!this.db) {
      throw new Error('D1 database not initialized');
    }
    
    try {
      const result = await this.db.prepare(sql).bind(...params).first();
      return result;
    } catch (error) {
      console.error('D1 first error:', error);
      throw error;
    }
  }
  
  // Get all results
  async all(sql: string, params: any[] = []) {
    if (!this.db) {
      throw new Error('D1 database not initialized');
    }
    
    try {
      const result = await this.db.prepare(sql).bind(...params).all();
      return result;
    } catch (error) {
      console.error('D1 all error:', error);
      throw error;
    }
  }
  
  // Transaction support
  async transaction(queries: Array<{ sql: string; params?: any[] }>) {
    if (!this.db) {
      throw new Error('D1 database not initialized');
    }
    
    try {
      const statements = queries.map(query => 
        this.db.prepare(query.sql).bind(...(query.params || []))
      );
      
      const result = await this.db.batch(statements);
      return result;
    } catch (error) {
      console.error('D1 transaction error:', error);
      throw error;
    }
  }
}

// D1 Repository base class
export abstract class D1Repository {
  protected db: D1Client;
  protected tableName: string;
  
  constructor(db: D1Client, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }
  
  // Generic CRUD operations
  async findById(id: string | number) {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    return await this.db.first(sql, [id]);
  }
  
  async findAll(limit = 100, offset = 0) {
    const sql = `SELECT * FROM ${this.tableName} LIMIT ? OFFSET ?`;
    return await this.db.all(sql, [limit, offset]);
  }
  
  async findWhere(conditions: Record<string, any>, limit = 100) {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
    
    const sql = `SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT ?`;
    return await this.db.all(sql, [...values, limit]);
  }
  
  async create(data: Record<string, any>) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const sql = `
      INSERT INTO ${this.tableName} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    return await this.db.first(sql, values);
  }
  
  async update(id: string | number, data: Record<string, any>) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    
    const sql = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = datetime('now')
      WHERE id = ?
      RETURNING *
    `;
    
    return await this.db.first(sql, [...values, id]);
  }
  
  async delete(id: string | number) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    return await this.db.execute(sql, [id]);
  }
  
  async count(conditions?: Record<string, any>) {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: any[] = [];
    
    if (conditions) {
      const keys = Object.keys(conditions);
      const values = Object.values(conditions);
      const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
      sql += ` WHERE ${whereClause}`;
      params.push(...values);
    }
    
    const result = await this.db.first(sql, params);
    return result?.count || 0;
  }
}

// Specific repositories
export class UsersRepository extends D1Repository {
  constructor(db: D1Client) {
    super(db, 'users');
  }
  
  async findByEmail(email: string) {
    const sql = `SELECT * FROM ${this.tableName} WHERE email = ?`;
    return await this.db.first(sql, [email]);
  }
  
  async findByOrganization(organizationId: string) {
    return await this.findWhere({ organization_id: organizationId });
  }
  
  async findByRole(role: string) {
    return await this.findWhere({ role });
  }
  
  async updateLastLogin(userId: string) {
    const sql = `
      UPDATE ${this.tableName}
      SET last_login_at = datetime('now')
      WHERE id = ?
    `;
    return await this.db.execute(sql, [userId]);
  }
}

export class OrganizationsRepository extends D1Repository {
  constructor(db: D1Client) {
    super(db, 'organizations');
  }
  
  async findByName(name: string) {
    const sql = `SELECT * FROM ${this.tableName} WHERE name = ?`;
    return await this.db.first(sql, [name]);
  }
}

export class MailAccountsRepository extends D1Repository {
  constructor(db: D1Client) {
    super(db, 'mail_accounts');
  }
  
  async findByOrganization(organizationId: string) {
    return await this.findWhere({ organization_id: organizationId });
  }
  
  async findByEmail(email: string) {
    return await this.findWhere({ email });
  }
}

export class SEOSitesRepository extends D1Repository {
  constructor(db: D1Client) {
    super(db, 'seo_sites');
  }
  
  async findByOrganization(organizationId: string) {
    return await this.findWhere({ organization_id: organizationId });
  }
}

export class AnalyticsEventsRepository extends D1Repository {
  constructor(db: D1Client) {
    super(db, 'analytics_events');
  }
  
  async findByOrganization(organizationId: string, limit = 1000) {
    return await this.findWhere({ organization_id: organizationId }, limit);
  }
  
  async findByDateRange(organizationId: string, startDate: string, endDate: string) {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE organization_id = ? 
      AND created_at >= ? 
      AND created_at <= ?
      ORDER BY created_at DESC
      LIMIT 1000
    `;
    return await this.db.all(sql, [organizationId, startDate, endDate]);
  }
}

export { D1Client as default };
