require('dotenv').config();
const axios = require('axios');

const LEAD_SOURCING_URL = process.env.LEAD_SOURCING_URL || 'http://lead-sourcing:3002';
const OUTREACH_ENGINE_URL = process.env.OUTREACH_ENGINE_URL || 'http://outreach-engine:3003';
const BROWSER_AUTOMATION_URL = process.env.BROWSER_AUTOMATION_URL || 'http://browser-automation:3001';
const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://ai-engine:3004';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

const headers = { 'Authorization': `Bearer ${INTERNAL_API_KEY}` };

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callService(url, endpoint, method = 'POST', data = {}) {
  try {
    const response = await axios({
      method,
      url: `${url}${endpoint}`,
      headers: { 'Authorization': `Bearer ${INTERNAL_API_KEY}`, 'Content-Type': 'application/json' },
      data,
      timeout: 120000
    });
    console.log(`✅ ${endpoint}:`, response.data);
    return response.data;
  } catch (err) {
    console.error(`❌ ${endpoint} failed:`, err.message);
    return null;
  }
}

// ========================================
// CRON JOBS
// ========================================

// Every 15 minutes: Process outreach queue
async function processOutreachQueue() {
  console.log('⏰ Running outreach queue processor...');
  await callService(OUTREACH_ENGINE_URL, '/queue/process', 'POST', { batch_size: 50 });
}

// Every hour: Update lead statuses
async function updateLeadStatuses() {
  console.log('⏰ Updating lead statuses...');
  // This would call a function to auto-transition lead statuses
  // Can be implemented as an API endpoint or direct DB update
}

// Every 5 minutes: Check browser sessions health
async function checkBrowserSessions() {
  console.log('⏰ Checking browser sessions...');
  await callService(BROWSER_AUTOMATION_URL, '/health', 'GET');
}

// Every 6 hours: Run lead sourcing
async function runLeadSourcing() {
  console.log('⏰ Running lead sourcing...');
  // Get active sources and run them
  // This would need to fetch sources from DB and run each
}

// Daily at 6 AM: Full lead sourcing run
async function dailyLeadSourcing() {
  console.log('🌅 Running daily lead sourcing...');
  // Implementation would fetch all active sources and run them
}

// ========================================
// SCHEDULER
// ========================================
const jobs = [
  { name: 'processOutreachQueue', fn: processOutreachQueue, interval: 15 * 60 * 1000 }, // 15 min
  { name: 'checkBrowserSessions', fn: checkBrowserSessions, interval: 5 * 60 * 1000 }, // 5 min
  { name: 'updateLeadStatuses', fn: updateLeadStatuses, interval: 60 * 60 * 1000 }, // 1 hour
  { name: 'runLeadSourcing', fn: runLeadSourcing, interval: 6 * 60 * 60 * 1000 }, // 6 hours
];

async function runJob(job) {
  const start = Date.now();
  try {
    await job.fn();
    console.log(`✅ ${job.name} completed in ${Date.now() - start}ms`);
  } catch (err) {
    console.error(`❌ ${job.name} failed:`, err.message);
  }
}

function startScheduler() {
  console.log('🚀 Cron Scheduler started');
  console.log('Jobs:', jobs.map(j => `${j.name} (every ${j.interval / 1000}s)`).join(', '));
  
  jobs.forEach(job => {
    // Run immediately on start
    runJob(job);
    
    // Then schedule
    setInterval(() => runJob(job), job.interval);
  });

  // Daily at 6 AM
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 6 && now.getMinutes() === 0) {
      dailyLeadSourcing();
    }
  }, 60 * 1000); // Check every minute
}

startScheduler();

// Keep process alive
setInterval(() => {}, 1000 * 60 * 60); // Sleep 1 hour