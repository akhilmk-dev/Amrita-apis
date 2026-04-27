import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '157.245.104.91',
  user: 'pms_user',
  password: 'Pms@Amrita2024!',
  database: 'pms_db',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 30000,
});

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log('✅ Database connected successfully');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
  });

export default pool;
