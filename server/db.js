import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = (process.env.DATABASE_URL || process.env.MYSQL_URL)
  ? mysql.createPool(process.env.DATABASE_URL || process.env.MYSQL_URL)
  : mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'playhub',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });


// Test connection function
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Successfully connected to the MySQL database.');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to the MySQL database:', error.message);
    console.error('Ensure MySQL is running and database configuration in .env is correct.');
    return false;
  }
}

export default pool;
