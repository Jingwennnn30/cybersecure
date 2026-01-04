require('dotenv').config();
const { createClient } = require('@clickhouse/client');

const client = createClient({
  url: process.env.CLICKHOUSE_HOST,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
  database: process.env.CLICKHOUSE_DB
});

console.log('Testing ClickHouse connection...');
console.log('Host:', process.env.CLICKHOUSE_HOST);
console.log('User:', process.env.CLICKHOUSE_USER);
console.log('Database:', process.env.CLICKHOUSE_DB);
console.log('Password:', process.env.CLICKHOUSE_PASSWORD ? '***' + process.env.CLICKHOUSE_PASSWORD.slice(-3) : '(empty)');

client.ping()
  .then(() => {
    console.log('✓ Connection successful!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('✗ Connection failed:', err.message);
    process.exit(1);
  });
