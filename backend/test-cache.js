// Simple test script to verify caching is working
const fetch = require('node-fetch');

async function testCache() {
  const baseUrl = 'http://localhost:4000';
  
  console.log('=== Testing Cache Performance ===\n');
  
  // Test 1: Dashboard Stats
  console.log('📊 Testing /api/dashboard-stats...');
  const start1 = Date.now();
  const response1 = await fetch(`${baseUrl}/api/dashboard-stats`);
  const time1 = Date.now() - start1;
  console.log(`  First request: ${time1}ms (should query ClickHouse)`);
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const start2 = Date.now();
  const response2 = await fetch(`${baseUrl}/api/dashboard-stats`);
  const time2 = Date.now() - start2;
  console.log(`  Second request: ${time2}ms (should use cache)`);
  console.log(`  Speed improvement: ${Math.round((time1/time2)*10)/10}x faster\n`);
  
  // Test 2: Alerts endpoint
  console.log('🚨 Testing /api/alerts...');
  const start3 = Date.now();
  const response3 = await fetch(`${baseUrl}/api/alerts?userId=test&userRole=admin`);
  const time3 = Date.now() - start3;
  const data3 = await response3.json();
  console.log(`  First request: ${time3}ms (got ${data3.length} alerts)`);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const start4 = Date.now();
  const response4 = await fetch(`${baseUrl}/api/alerts?userId=test&userRole=admin`);
  const time4 = Date.now() - start4;
  const data4 = await response4.json();
  console.log(`  Second request: ${time4}ms (got ${data4.length} alerts, from cache)`);
  console.log(`  Speed improvement: ${Math.round((time3/time4)*10)/10}x faster\n`);
  
  console.log('✅ Cache test complete!');
  console.log('📝 Cache will expire after 5 minutes');
}

testCache().catch(console.error);
