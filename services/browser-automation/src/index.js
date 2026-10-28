require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ========================================
// PUPPETEER CLUSTER MANAGER
// ========================================
let cluster = null;
let whatsappPage = null;
let linkedinPage = null;

async function initCluster() {
  cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 3,
    monitor: true,
    puppeteerOptions: {
      headless: process.env.HEADLESS !== 'false',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--window-size=1280,800'
      ],
      userDataDir: process.env.CHROME_USER_DATA_DIR || './chrome-data'
    }
  });

  // Error handling
  cluster.on('taskerror', (err, data) => {
    console.error(`Task error: ${err.message}`, data);
  });

  console.log('✅ Puppeteer Cluster initialized');
  return cluster;
}

// ========================================
// SESSION PERSISTENCE
// ========================================
async function saveSession(channel, page) {
  try {
    const cookies = await page.cookies();
    const localStorage = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      return data;
    });

    const sessionData = {
      cookies,
      localStorage,
      url: page.url(),
      timestamp: new Date().toISOString()
    };

    await supabase
      .from('browser_sessions')
      .upsert({
        channel,
        profile_data: sessionData,
        status: 'active',
        last_used: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

    console.log(`✅ ${channel} session saved`);
  } catch (err) {
    console.error(`Failed to save ${channel} session:`, err.message);
  }
}

async function loadSession(channel) {
  try {
    const { data, error } = await supabase
      .from('browser_sessions')
      .select('*')
      .eq('channel', channel)
      .eq('status', 'active')
      .order('last_used', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      await supabase
        .from('browser_sessions')
        .update({ status: 'expired' })
        .eq('id', data.id);
      return null;
    }

    return data.profile_data;
  } catch (err) {
    console.error(`Failed to load ${channel} session:`, err.message);
    return null;
  }
}

// ========================================
// WHATSAPP WEB AUTOMATION
// ========================================
async function initWhatsApp(page) {
  console.log('🔄 Initializing WhatsApp Web...');
  
  await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle0', timeout: 60000 });
  
  // Check if already logged in
  const isLoggedIn = await page.evaluate(() => {
    return document.querySelector('[data-testid="chat-list"]') !== null;
  });

  if (!isLoggedIn) {
    console.log('📱 WhatsApp QR Code - Please scan with your phone');
    // Wait for QR scan (up to 2 minutes)
    await page.waitForSelector('[data-testid="chat-list"]', { timeout: 120000 });
    console.log('✅ WhatsApp logged in!');
  }

  // Save session
  await saveSession('whatsapp', page);
  
  whatsappPage = page;
  return page;
}

async function sendWhatsAppMessage(phone, message) {
  if (!whatsappPage) {
    throw new Error('WhatsApp not initialized');
  }

  const cleanPhone = phone.replace(/\D/g, '');
  const url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
  
  await whatsappPage.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Wait for chat to load
  await whatsappPage.waitForSelector('[data-testid="conversation-panel-body"]', { timeout: 15000 });
  
  // Click send button
  await whatsappPage.click('[data-testid="send-button"]');
  
  // Wait for message to be sent
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await saveSession('whatsapp', whatsappPage);
  
  return { success: true, messageId: uuidv4() };
}

async function checkWhatsAppMessages() {
  if (!whatsappPage) return [];

  try {
    const messages = await whatsappPage.evaluate(() => {
      const chatItems = document.querySelectorAll('[data-testid="chat-list-item"]');
      const results = [];
      
      chatItems.forEach(item => {
        const nameEl = item.querySelector('[data-testid="chat-title"]');
        const msgEl = item.querySelector('[data-testid="last-msg"]');
        const timeEl = item.querySelector('[data-testid="msg-time"]');
        const unreadEl = item.querySelector('[data-testid="unread-count"]');
        
        if (nameEl) {
          results.push({
            name: nameEl.textContent,
            lastMessage: msgEl?.textContent || '',
            time: timeEl?.textContent || '',
            unread: !!unreadEl
          });
        }
      });
      
      return results;
    });
    
    return messages;
  } catch (err) {
    console.error('Error checking WhatsApp messages:', err.message);
    return [];
  }
}

// ========================================
// LINKEDIN AUTOMATION
// ========================================
async function initLinkedIn(page) {
  console.log('🔄 Initializing LinkedIn...');
  
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle0', timeout: 60000 });
  
  // Check if logged in
  const isLoggedIn = await page.evaluate(() => {
    return document.querySelector('.global-nav__me') !== null;
  });

  if (!isLoggedIn) {
    console.log('🔐 LinkedIn login required');
    // Navigate to login
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle0' });
    console.log('⏳ Please log in manually...');
    await page.waitForSelector('.global-nav__me', { timeout: 120000 });
    console.log('✅ LinkedIn logged in!');
  }

  await saveSession('linkedin', page);
  linkedinPage = page;
  return page;
}

async function sendLinkedInConnection(profileUrl, message = '') {
  if (!linkedinPage) throw new Error('LinkedIn not initialized');

  await linkedinPage.goto(profileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Find connect button
  const connectBtn = await linkedinPage.$('button:has-text("Connect"), button[aria-label*="Connect"]');
  
  if (connectBtn) {
    await connectBtn.click();
    
    // Add note if message provided
    if (message) {
      await linkedinPage.waitForSelector('button:has-text("Add a note")', { timeout: 5000 });
      await linkedinPage.click('button:has-text("Add a note")');
      await linkedinPage.type('textarea[name="message"]', message);
    }
    
    await linkedinPage.click('button:has-text("Send"), button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await saveSession('linkedin', linkedinPage);
    return { success: true };
  }
  
  return { success: false, error: 'Connect button not found' };
}

async function sendLinkedInMessage(profileUrl, message) {
  if (!linkedinPage) throw new Error('LinkedIn not initialized');

  await linkedinPage.goto(profileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Click Message button
  const messageBtn = await linkedinPage.$('button:has-text("Message"), button[aria-label*="Message"]');
  
  if (messageBtn) {
    await messageBtn.click();
    await linkedinPage.waitForSelector('div[role="textbox"]', { timeout: 5000 });
    await linkedinPage.type('div[role="textbox"]', message);
    await linkedinPage.keyboard.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await saveSession('linkedin', linkedinPage);
    return { success: true };
  }
  
  return { success: false, error: 'Message button not found' };
}

// ========================================
// HEALTH CHECK
// ========================================
async function healthCheck() {
  const checks = {
    cluster: !!cluster,
    whatsapp: false,
    linkedin: false,
    timestamp: new Date().toISOString()
  };

  if (whatsappPage) {
    try {
      checks.whatsapp = await whatsappPage.evaluate(() => document.readyState === 'complete');
    } catch { checks.whatsapp = false; }
  }

  if (linkedinPage) {
    try {
      checks.linkedin = await linkedinPage.evaluate(() => document.readyState === 'complete');
    } catch { checks.linkedin = false; }
  }

  return checks;
}

// ========================================
// RESTORE SESSIONS ON STARTUP
// ========================================
async function restoreSessions() {
  // Restore WhatsApp session
  const waSession = await loadSession('whatsapp');
  if (waSession && cluster) {
    try {
      const page = await cluster.execute(async ({ page }) => {
        // Restore cookies
        if (waSession.cookies?.length) {
          await page.setCookie(...waSession.cookies);
        }
        await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Restore localStorage
        if (waSession.localStorage) {
          await page.evaluate((data) => {
            Object.entries(data).forEach(([key, value]) => {
              localStorage.setItem(key, value);
            });
          }, waSession.localStorage);
        }
        
        return page;
      });
      
      whatsappPage = page;
      console.log('✅ WhatsApp session restored');
    } catch (err) {
      console.log('⚠️ WhatsApp session restore failed, will re-login');
    }
  }

  // Restore LinkedIn session
  const liSession = await loadSession('linkedin');
  if (liSession && cluster) {
    try {
      const page = await cluster.execute(async ({ page }) => {
        if (liSession.cookies?.length) {
          await page.setCookie(...liSession.cookies);
        }
        await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle0', timeout: 30000 });
        
        if (liSession.localStorage) {
          await page.evaluate((data) => {
            Object.entries(data).forEach(([key, value]) => {
              localStorage.setItem(key, value);
            });
          }, liSession.localStorage);
        }
        
        return page;
      });
      
      linkedinPage = page;
      console.log('✅ LinkedIn session restored');
    } catch (err) {
      console.log('⚠️ LinkedIn session restore failed, will re-login');
    }
  }
}

// ========================================
// API ROUTES
// ========================================
app.get('/health', async (req, res) => {
  const health = await healthCheck();
  res.json({ status: 'ok', service: 'browser-automation', ...health });
});

app.post('/whatsapp/init', async (req, res) => {
  try {
    const page = await cluster.execute(async ({ page }) => {
      return await initWhatsApp(page);
    });
    whatsappPage = page;
    res.json({ success: true, message: 'WhatsApp initialized' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/whatsapp/send', async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'Phone and message required' });
    }
    const result = await sendWhatsAppMessage(phone, message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/whatsapp/messages', async (req, res) => {
  try {
    const messages = await checkWhatsAppMessages();
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/linkedin/init', async (req, res) => {
  try {
    const page = await cluster.execute(async ({ page }) => {
      return await initLinkedIn(page);
    });
    linkedinPage = page;
    res.json({ success: true, message: 'LinkedIn initialized' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/linkedin/connect', async (req, res) => {
  try {
    const { profileUrl, message } = req.body;
    if (!profileUrl) {
      return res.status(400).json({ success: false, error: 'Profile URL required' });
    }
    const result = await sendLinkedInConnection(profileUrl, message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/linkedin/message', async (req, res) => {
  try {
    const { profileUrl, message } = req.body;
    if (!profileUrl || !message) {
      return res.status(400).json({ success: false, error: 'Profile URL and message required' });
    }
    const result = await sendLinkedInMessage(profileUrl, message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/sessions/status', async (req, res) => {
  const { data } = await supabase
    .from('browser_sessions')
    .select('*')
    .order('last_used', { ascending: false });
  res.json({ success: true, sessions: data });
});

// ========================================
// START SERVER
// ========================================
async function start() {
  await initCluster();
  await restoreSessions();
  
  app.listen(PORT, () => {
    console.log(`🚀 Browser Automation Service running on port ${PORT}`);
  });
}

start().catch(console.error);

module.exports = app;