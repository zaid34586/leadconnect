require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');
const Handlebars = require('handlebars');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ========================================
// EMAIL TRANSPORTER
// ========================================
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ========================================
// TEMPLATE ENGINE
// ========================================
const templateCache = new Map();

function compileTemplate(templateStr) {
  if (!templateCache.has(templateStr)) {
    templateCache.set(templateStr, Handlebars.compile(templateStr));
  }
  return templateCache.get(templateStr);
}

function renderTemplate(templateStr, data) {
  const template = compileTemplate(templateStr);
  return template(data);
}

// ========================================
// OUTREACH ENGINE CLASS
// ========================================
class OutreachEngine {
  constructor() {
    this.browserAutomationUrl = process.env.BROWSER_AUTOMATION_URL || 'http://localhost:3001';
    this.internalApiKey = process.env.INTERNAL_API_KEY;
  }

  // ========================================
  // EMAIL SENDING
  // ========================================
  async sendEmail(contact, template) {
    const lead = contact.lead;
    const data = {
      name: lead.name || 'there',
      company: lead.company || 'your company',
      industry: lead.industry || 'your industry',
      service: lead.service_interest || 'our services',
      sender_name: process.env.SENDER_NAME || 'LeadConnect Team',
      sender_title: process.env.SENDER_TITLE || 'Business Development',
      sender_email: process.env.SMTP_USER,
      sender_phone: process.env.SENDER_PHONE || '+1-555-0000',
      sender_linkedin: process.env.SENDER_LINKEDIN || 'linkedin.com/in/leadconnect',
      unsubscribe_url: `${process.env.FRONTEND_URL}/unsubscribe?contact=${contact.id}`,
      ...lead
    };

    const subject = renderTemplate(template.subject, data);
    const html = renderTemplate(template.body, data);
    const text = this.htmlToText(html);

    const trackingId = uuidv4();
    const trackingPixel = `<img src="${process.env.FRONTEND_URL}/api/track/open/${contact.id}/${trackingId}" width="1" height="1" style="display:none;">`;
    const trackedHtml = html + trackingPixel;

    // Replace links with tracking links
    const trackedHtmlWithLinks = this.addLinkTracking(html, contact.id, trackingId);

    try {
      await emailTransporter.sendMail({
        from: `"${data.sender_name}" <${data.sender_email}>`,
        to: contact.lead.email,
        subject,
        text,
        html: trackedHtmlWithLinks,
        headers: {
          'X-Contact-ID': contact.id,
          'X-Tracking-ID': trackingId,
          'List-Unsubscribe': `<${data.unsubscribe_url}>`
        }
      });

      return { success: true, trackingId };
    } catch (err) {
      console.error('Email send error:', err.message);
      return { success: false, error: err.message };
    }
  }

  htmlToText(html) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&/g, '&')
      .trim();
  }

  addLinkTracking(html, contactId, trackingId) {
    return html.replace(/href="(https?:\/\/[^"]+)"/g, (match, url) => {
      const trackedUrl = `${process.env.FRONTEND_URL}/api/track/click/${contactId}/${uuidv4()}?url=${encodeURIComponent(url)}`;
      return `href="${trackedUrl}"`;
    });
  }

  // ========================================
  // WHATSAPP SENDING (via Browser Automation)
  // ========================================
  async sendWhatsApp(contact, template) {
    try {
      const lead = contact.lead;
      const data = {
        name: contact.lead.name || 'there',
        company: contact.lead.company || 'your company',
        industry: contact.lead.industry || 'your industry',
        service: contact.lead.service_interest || 'our services',
        sender_name: process.env.SENDER_NAME || 'LeadConnect Team',
        ...contact.lead
      };

      const message = renderTemplate(template.body, data);

      const response = await axios.post(
        `${process.env.BROWSER_AUTOMATION_URL}/whatsapp/send`,
        {
          phone: contact.lead.phone,
          message
        },
        {
          headers: { 'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}` },
          timeout: 30000
        }
      );

      return response.data;
    } catch (err) {
      console.error('WhatsApp send error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // ========================================
  // LINKEDIN (via Browser Automation)
  // ========================================
  async sendLinkedIn(contact, template) {
    try {
      const lead = contact.lead;
      const data = {
        name: contact.lead.name || 'there',
        company: contact.lead.company || 'your company',
        service: contact.lead.service_interest || 'our services',
        sender_name: process.env.SENDER_NAME || 'LeadConnect Team',
        ...contact.lead
      };

      const message = renderTemplate(template.body, data);

      if (contact.lead.linkedin_url) {
        const response = await axios.post(
          `${process.env.BROWSER_AUTOMATION_URL}/linkedin/message`,
          {
            profileUrl: contact.lead.linkedin_url,
            message: renderTemplate(template.body, data)
          },
          {
            headers: { 'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}` },
            timeout: 30000
          }
        );
        return response.data;
      }

      return { success: false, error: 'No LinkedIn URL' };
    } catch (err) {
      console.error('LinkedIn send error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // ========================================
  // MAIN SEND FUNCTION
  // ========================================
  async sendOutreach(contact, template) {
    const channel = template.channel;

    let result;
    switch (channel) {
      case 'email':
        result = await this.sendEmail(contact, template);
        break;
      case 'whatsapp':
        result = await this.sendWhatsApp(contact, template);
        break;
      case 'linkedin':
        result = await this.sendLinkedIn(contact, template);
        break;
      default:
        return { success: false, error: 'Unknown channel' };
    }

    // Log outreach
    await supabase.from('outreach_logs').insert({
      contact_id: contact.id,
      campaign_id: contact.campaign_id,
      lead_id: contact.lead_id,
      channel,
      template_id: template.id,
      sequence_step: contact.current_step,
      status: result.success ? 'sent' : 'failed',
      tracking_id: result.trackingId,
      error_message: result.error,
      sent_at: result.success ? new Date().toISOString() : null
    });

    // Update contact
    if (result.success) {
      await supabase
        .from('outreach_contacts')
        .update({
          status: 'sent',
          current_step: contact.current_step + 1,
          last_sent_at: new Date().toISOString(),
          next_send_at: this.calculateNextSend(contact.current_step + 1)
        })
        .eq('id', contact.id);
    } else {
      await supabase
        .from('outreach_contacts')
        .update({ status: 'failed', error_message: result.error })
        .eq('id', contact.id);
    }

    return result;
  }

  calculateNextSend(step) {
    // Default sequence: day 0, 2, 5, 10, 17
    const days = [0, 2, 3, 5, 7];
    const day = days[step] || days[days.length - 1] + 7;
    const next = new Date();
    next.setDate(next.getDate() + day);
    next.setHours(9, 0, 0, 0); // 9 AM
    return next.toISOString();
  }

  // ========================================
  // PROCESS OUTREACH QUEUE
  // ========================================
  async processQueue(batchSize = 50) {
    const { data: contacts, error } = await supabase
      .from('outreach_contacts')
      .select(`
        *,
        lead:leads(*),
        campaign:outreach_campaigns(
          *,
          sequence:outreach_sequences(
            *,
            steps
          )
        )
      `)
      .eq('status', 'pending')
      .lte('next_send_at', new Date().toISOString())
      .limit(batchSize);

    if (error) throw error;

    let sent = 0;
    let failed = 0;

    for (const contact of contacts) {
      try {
        if (!contact.campaign?.sequence?.steps) continue;
        
        const step = contact.campaign.sequence.steps[contact.current_step];
        if (!step) {
          // Sequence complete
          await supabase
            .from('outreach_contacts')
            .update({ status: 'completed' })
            .eq('id', contact.id);
          continue;
        }

        // Get template
        const { data: template } = await supabase
          .from('outreach_templates')
          .select('*')
          .eq('id', step.template_id)
          .single();

        if (!template) continue;

        // Check channel limits
        const canSend = await this.checkChannelLimit(contact.lead_id, template.channel);
        if (!canSend) {
          // Reschedule for later
          await supabase
            .from('outreach_contacts')
            .update({ next_send_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() })
            .eq('id', contact.id);
          continue;
        }

        const result = await this.sendOutreach(contact, template);
        
        if (result.success) sent++;
        else failed++;

        // Small delay between sends
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error(`Error processing contact ${contact.id}:`, err.message);
        failed++;
      }
    }

    // Update campaign stats
    await this.updateCampaignStats();

    return { sent, failed };
  }

  async checkChannelLimit(leadId, channel) {
    const today = new Date().toISOString().split('T')[0];
    
    const { count } = await supabase
      .from('outreach_logs')
      .select('*', { count: 'exact', head: true })
      .eq('lead_id', leadId)
      .eq('channel', channel)
      .gte('sent_at', `${today}T00:00:00Z`);

    const limits = { email: 10, whatsapp: 3, linkedin: 5 };
    return (count || 0) < (limits[channel] || 5);
  }

  async updateCampaignStats() {
    const { data: campaigns } = await supabase
      .from('outreach_campaigns')
      .select('id')
      .eq('status', 'running');

    if (!campaigns) return;

    for (const campaign of campaigns) {
      const { data: logs } = await supabase
        .from('outreach_logs')
        .select('status')
        .eq('campaign_id', campaign.id);

      const stats = {
        sent: logs?.filter(l => l.status === 'sent').length || 0,
        replied: logs?.filter(l => l.status === 'replied').length || 0,
        bounced: logs?.filter(l => l.status === 'bounced').length || 0,
        failed: logs?.filter(l => l.status === 'failed').length || 0
      };

      await supabase
        .from('outreach_campaigns')
        .update({ stats })
        .eq('id', campaign.id);
    }
  }

  // ========================================
  // CAMPAIGN MANAGEMENT
  // ========================================
  async addLeadsToCampaign(campaignId, leadIds) {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const contacts = leadIds.map(leadId => ({
      campaign_id: campaignId,
      lead_id: leadId,
      current_step: 0,
      status: 'pending',
      next_send_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('outreach_contacts')
      .upsert(contacts, { onConflict: 'campaign_id,lead_id' })
      .select();

    if (error) throw error;
    return data;
  }

  async getCampaign(id) {
    const { data } = await supabase
      .from('outreach_campaigns')
      .select(`
        *,
        sequence:outreach_sequences(*)
      `)
      .eq('id', id)
      .single();
    return data;
  }

  // ========================================
  // RATE LIMIT CHECKING
  // ========================================
  async getChannelUsage(leadId, channel, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const { count } = await supabase
      .from('outreach_logs')
      .select('*', { count: 'exact', head: true })
      .eq('lead_id', leadId)
      .eq('channel', channel)
      .gte('sent_at', since);

    return count || 0;
  }
}

const engine = new OutreachEngine();

// ========================================
// API ROUTES
// ========================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'outreach-engine' });
});

app.post('/queue/process', async (req, res) => {
  try {
    const { batch_size = 50 } = req.body;
    const result = await engine.processQueue(batch_size);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/campaigns', async (req, res) => {
  try {
    const { data, error } = await supabase.from('outreach_campaigns').insert(req.body).select().single();
    if (error) throw error;
    res.json({ success: true, campaign: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/campaigns', async (req, res) => {
  const { data } = await supabase.from('outreach_campaigns').select('*').order('created_at', { ascending: false });
  res.json({ success: true, campaigns: data });
});

app.post('/campaigns/:id/start', async (req, res) => {
  try {
    await supabase.from('outreach_campaigns').update({ status: 'running' }).eq('id', req.params.id);
    
    // Add leads from segment filter
    const campaign = await engine.getCampaign(req.params.id);
    if (campaign?.segment_filter) {
      // Build query from segment filter
      let query = supabase.from('leads').select('id');
      if (campaign.segment_filter.status) {
        query = query.in('status', campaign.segment_filter.status);
      }
      if (campaign.segment_filter.segment) {
        query = query.in('segment', campaign.segment_filter.segment);
      }
      if (campaign.segment_filter.min_score) {
        query = query.gte('lead_score', campaign.segment_filter.min_score);
      }
      
      const { data: leads } = await query;
      if (leads?.length) {
        await engine.addLeadsToCampaign(req.params.id, leads.map(l => l.id));
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/campaigns/:id/pause', async (req, res) => {
  await supabase.from('outreach_campaigns').update({ status: 'paused' }).eq('id', req.params.id);
  res.json({ success: true });
});

app.post('/campaigns/:id/leads', async (req, res) => {
  try {
    const { lead_ids } = req.body;
    const contacts = await engine.addLeadsToCampaign(req.params.id, lead_ids);
    res.json({ success: true, contacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/templates', async (req, res) => {
  const { data } = await supabase.from('outreach_templates').select('*').order('channel').order('created_at', { ascending: false });
  res.json({ success: true, templates: data });
});

app.post('/templates', async (req, res) => {
  const { data, error } = await supabase.from('outreach_templates').insert(req.body).select().single();
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, template: data });
});

app.get('/sequences', async (req, res) => {
  const { data } = await supabase.from('outreach_sequences').select('*').order('created_at', { ascending: false });
  res.json({ success: true, sequences: data });
});

app.post('/sequences', async (req, res) => {
  const { data, error } = await supabase.from('outreach_sequences').insert(req.body).select().single();
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, sequence: data });
});

app.get('/analytics/outreach', async (req, res) => {
  try {
    const { data: campaigns } = await supabase.from('outreach_campaigns').select('stats, channel:outreach_sequences(channel)');
    
    const channelStats = {};
    campaigns?.forEach(c => {
      const ch = c.channel?.channel || 'unknown';
      if (!channelStats[ch]) channelStats[ch] = { sent: 0, replied: 0, bounced: 0 };
      channelStats[ch].sent += c.stats?.sent || 0;
      channelStats[ch].replied += c.stats?.replied || 0;
      channelStats[ch].bounced += c.stats?.bounced || 0;
    });

    const { data: recentLogs } = await supabase
      .from('outreach_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(100);

    res.json({ success: true, channelStats, recentLogs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Outreach Engine running on port ${PORT}`);
});

module.exports = app;