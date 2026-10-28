const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ==================== AI SERVICE KNOWLEDGE BASE ====================
// Yeh AI ke liye hai taaki wo service ke bare mein achhe se baat kar sake
const SERVICE_KNOWLEDGE = {
  name: 'LeadConnect',
  description: 'B2B Lead Generation & Client Outreach System',
  services: [
    {
      id: 'web-development',
      name: 'Web Development',
      description: 'Custom websites, e-commerce stores, and web applications for businesses.',
      keyBenefits: ['Professional online presence', 'Mobile responsive', 'SEO optimized', 'Fast loading'],
      idealFor: ['Restaurants', 'Clinics', 'Retail stores', 'Service businesses'],
      regions: ['Delhi NCR', 'Mumbai', 'Bangalore', 'Pan India']
    },
    {
      id: 'digital-marketing',
      name: 'Digital Marketing',
      description: 'SEO, social media marketing, Google ads, and lead generation campaigns.',
      keyBenefits: ['More visibility', 'Targeted leads', 'Measurable ROI', 'Brand awareness'],
      idealFor: ['E-commerce', 'SaaS companies', 'Local businesses', 'Startups'],
      regions: ['All India', 'Specific cities', 'International']
    },
    {
      id: 'app-development',
      name: 'App Development',
      description: 'iOS and Android mobile applications for your business.',
      keyBenefits: ['Native apps', 'User friendly', 'App store ready', 'Push notifications'],
      idealFor: ['Food delivery', 'Healthcare', 'Education', 'Fintech'],
      regions: ['Delhi NCR', 'Mumbai', 'Bangalore']
    },
    {
      id: 'seo-services',
      name: 'SEO Services',
      description: 'Search engine optimization to rank your website on Google first page.',
      keyBenefits: ['First page ranking', 'Organic traffic', 'Long-term results', 'Local SEO'],
      idealFor: ['Local services', 'Blogs', 'Business directories', 'Service providers'],
      regions: ['City specific', 'State wise', 'National']
    }
  ],
  pricing: {
    starter: '₹2,999/month',
    growth: '₹7,999/month',
    scale: '₹14,999/month'
  }
};

// ==================== AI THINKING ENGINE ====================
// AI response dene se pehle "sochta" hai - context analyze karta hai
function aiThink(userMessage, conversationHistory, leadContext) {
  const thinking = {
    intent: '',
    serviceMatched: null,
    infoCollected: {},
    missingInfo: [],
    shouldSendDocument: false,
    documentCategory: null,
    confidence: 0,
    reasoning: ''
  };

  const lower = userMessage.toLowerCase();

  // Intent detect karna
  if (lower.includes('service') || lower.includes('offer') || lower.includes('kya karte ho') || lower.includes('kya service')) {
    thinking.intent = 'service_inquiry';
    thinking.confidence += 30;
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('kitna') || lower.includes('paise') || lower.includes('pricing')) {
    thinking.intent = 'pricing_inquiry';
    thinking.confidence += 30;
  }
  if (lower.includes('contact') || lower.includes('call') || lower.includes('baat') || lower.includes('human') || lower.includes('sales')) {
    thinking.intent = 'human_transfer';
    thinking.confidence += 40;
  }
  if (lower.includes('yes') || lower.includes('haan') || lower.includes('interested') || lower.includes('chahiye')) {
    thinking.intent = 'interested';
    thinking.confidence += 30;
  }
  if (lower.includes('document') || lower.includes('pdf') || lower.includes('file') || lower.includes('brochure') || lower.includes('guide')) {
    thinking.intent = 'document_request';
    thinking.confidence += 30;
  }

  // Service match karna
  SERVICE_KNOWLEDGE.services.forEach(svc => {
    if (lower.includes(svc.name.toLowerCase()) || lower.includes(svc.id)) {
      thinking.serviceMatched = svc;
      thinking.confidence += 20;
    }
    svc.idealFor.forEach(ind => {
      if (lower.includes(ind.toLowerCase())) {
        thinking.infoCollected.industry = ind;
        thinking.confidence += 10;
      }
    });
    svc.regions.forEach(reg => {
      if (lower.includes(reg.toLowerCase())) {
        thinking.infoCollected.region = reg;
        thinking.confidence += 10;
      }
    });
  });

  // Missing info check
  if (!leadContext.service_interest) thinking.missingInfo.push('service_interest');
  if (!leadContext.target_audience) thinking.missingInfo.push('target_audience');
  if (!leadContext.region) thinking.missingInfo.push('region');

  // Document suggestion
  if (thinking.intent === 'service_inquiry' || thinking.intent === 'pricing_inquiry') {
    thinking.shouldSendDocument = true;
    thinking.documentCategory = thinking.intent === 'pricing_inquiry' ? 'pricing' : 'service_guide';
  }

  thinking.reasoning = `User said: "${userMessage}". Intent: ${thinking.intent}. Confidence: ${thinking.confidence}%. Missing: ${thinking.missingInfo.join(', ') || 'none'}.`;

  return thinking;
}

// Generate AI response based on thinking
function generateAIResponse(thinking, userMessage, leadContext) {
  const { intent, serviceMatched, infoCollected, missingInfo, shouldSendDocument, documentCategory, reasoning } = thinking;

  if (intent === 'greeting' || confidence < 20) {
    return {
      text: "Namaste! Main LeadConnect AI hoon. Main aapko B2B clients dhoondhne mein madad kar sakta hoon. Aap kaunsa service business chalate hain?",
      thinking: reasoning,
      sendDocument: false,
      suggestHuman: false
    };
  }

  if (intent === 'service_inquiry') {
    if (serviceMatched) {
      return {
        text: `Aap ${serviceMatched.name} lena chahte hain. Iske fayde:\n• ${serviceMatched.keyBenefits.join('\n• ')}\n\nYeh ${serviceMatched.idealFor.join(', ')} ke liye best hai. Aapka target region kya hai?`,
        thinking: reasoning,
        sendDocument: shouldSendDocument,
        documentCategory,
        suggestHuman: false
      };
    }
    return {
      text: "Hum ye services provide karte hain:\n1. Web Development\n2. Digital Marketing\n3. App Development\n4. SEO Services\n\nAapko kaunsa service chahiye?",
      thinking: reasoning,
      sendDocument: true,
      documentCategory: 'service_guide',
      suggestHuman: false
    };
  }

  if (intent === 'pricing_inquiry') {
    return {
      text: `Hamare pricing plans:\n• Starter: ${SERVICE_KNOWLEDGE.pricing.starter}\n• Growth: ${SERVICE_KNOWLEDGE.pricing.growth}\n• Scale: ${SERVICE_KNOWLEDGE.pricing.scale}\n\nAapka budget kya hai?`,
      thinking: reasoning,
      sendDocument: true,
      documentCategory: 'pricing',
      suggestHuman: false
    };
  }

  if (intent === 'document_request') {
    return {
      text: "Main aapko document bhej raha hoon. Kripya check karein aur batayein kya aap interested hain?",
      thinking: reasoning,
      sendDocument: true,
      documentCategory,
      suggestHuman: false
    };
  }

  if (intent === 'human_transfer' || intent === 'interested') {
    return {
      text: "Dhanyavad! Main aapki details save kar raha hoon. Kya aap abhi human sales agent se baat karna chahenge?",
      thinking: reasoning,
      sendDocument: false,
      suggestHuman: true
    };
  }

  // Collect missing info
  if (missingInfo.includes('service_interest')) {
    return {
      text: "Aapka service interest kya hai? (Web Development, Digital Marketing, App Development, ya SEO)",
      thinking: reasoning,
      sendDocument: false,
      suggestHuman: false
    };
  }
  if (missingInfo.includes('target_audience')) {
    return {
      text: "Aapka target audience kaun hai? (e.g. Restaurants, Clinics, Real Estate)",
      thinking: reasoning,
      sendDocument: false,
      suggestHuman: false
    };
  }
  if (missingInfo.includes('region')) {
    return {
      text: "Aap kaunsa region target karna chahte hain? (e.g. Delhi NCR, Mumbai, Pan India)",
      thinking: reasoning,
      sendDocument: false,
      suggestHuman: false
    };
  }

  return {
    text: "Main samajh gaya. Kya aap service detail dena chahenge taaki main aapko better solution de sakun?",
    thinking: reasoning,
    sendDocument: false,
    suggestHuman: false
  };
}

// ==================== LEADS API ====================

app.get('/api/leads', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, leads: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const {
      name, email, phone, company, industry,
      target_audience, region, service_interest, service_details, budget, timeline, message,
      source = 'website', outreach_channel, ai_context = {}
    } = req.body;

    let score = 0;
    if (email) score += 2;
    if (phone) score += 2;
    if (company) score += 1;
    if (service_interest) score += 2;
    if (target_audience && region) score += 2;
    if (message) score += 1;
    if (service_details) score += 2;

    const { data, error } = await supabase
      .from('leads')
      .insert([{
        name, email, phone, company, industry,
        target_audience, region, service_interest, service_details, budget, timeline, message,
        source, outreach_channel,
        lead_score: score,
        status: score >= 6 ? 'ai_talking' : 'new',
        ai_context: ai_context
      }])
      .select()
      .single();

    if (error) throw error;

    if (email) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Welcome to LeadConnect!',
        text: `Hi ${name || 'there'},\n\nThank you for your interest. Our AI will help you find B2B clients.\n\nBest,\nLeadConnect Team`
      }).catch(console.error);
    }

    res.json({ success: true, lead: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, lead: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== AI CHAT API ====================

// Send message to AI and get response
app.post('/api/chat', async (req, res) => {
  try {
    const { message, session_id, lead_id } = req.body;

    if (!message || !session_id) {
      return res.status(400).json({ success: false, error: 'Message and session_id required' });
    }

    // Get lead context if exists
    let leadContext = {};
    let dbLeadId = lead_id;

    if (lead_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', lead_id)
        .single();
      if (lead) {
        leadContext = {
          service_interest: lead.service_interest,
          target_audience: lead.target_audience,
          region: lead.region,
          service_details: lead.service_details,
          ai_context: lead.ai_context || {}
        };
        dbLeadId = lead.id;
      }
    }

    // Save user message
    if (supabase) {
      await supabase.from('conversations').insert([{
        lead_id: dbLeadId,
        session_id,
        message,
        sender: 'user'
      }]);
    }

    // AI Thinking
    const thinking = aiThink(message, [], leadContext);

    // Generate response
    const aiResponse = generateAIResponse(thinking, message, leadContext);

    // Save AI response
    let aiMessageId = null;
    if (supabase) {
      const { data: conv } = await supabase.from('conversations').insert([{
        lead_id: dbLeadId,
        session_id,
        message: aiResponse.text,
        sender: 'ai',
        ai_thinking: thinking.reasoning
      }]).select().single();
      aiMessageId = conv?.id;
    }

    // If document should be sent, get document
    let document = null;
    if (aiResponse.sendDocument && supabase) {
      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('category', aiResponse.documentCategory)
        .eq('is_active', true)
        .limit(1);
      if (docs && docs.length > 0) {
        document = docs[0];
      }
    }

    // If human transfer suggested, add to queue
    if (aiResponse.suggestHuman && dbLeadId) {
      await supabase.from('human_transfer_queue').insert([{
        lead_id: dbLeadId,
        reason: 'ai_qualified_interested'
      }]);

      // Update lead status
      await supabase.from('leads').update({ status: 'human_transfer' }).eq('id', dbLeadId);
    }

    res.json({
      success: true,
      response: aiResponse.text,
      thinking: aiResponse.thinking,
      sendDocument: aiResponse.sendDocument,
      document,
      suggestHuman: aiResponse.suggestHuman,
      session_id,
      lead_id: dbLeadId
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/conversations/:sessionId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', req.params.sessionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ success: true, conversations: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== DOCUMENTS API ====================

app.get('/api/documents', async (req, res) => {
  try {
    const { category } = req.query;
    let query = supabase.from('documents').select('*').eq('is_active', true);
    if (category) query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, documents: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/documents', async (req, res) => {
  try {
    const { title, description, file_url, file_type, category } = req.body;
    const { data, error } = await supabase
      .from('documents')
      .insert([{ title, description, file_url, file_type, category }])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, document: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve uploaded documents locally (for development)
app.get('/api/documents/download/:id', async (req, res) => {
  try {
    const { data } = await supabase.from('documents').select('*').eq('id', req.params.id).single();
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.redirect(data.file_url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== OUTREACH API ====================

// Send email
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, text, html, lead_id } = req.body;
    if (!to) return res.status(400).json({ success: false, error: 'Email required' });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html
    });

    // Log outreach
    if (supabase && lead_id) {
      await supabase.from('outreach_logs').insert([{
        lead_id,
        channel: 'email',
        message: subject,
        status: 'sent'
      }]);
      await supabase.from('leads').update({
        outreach_channel: 'email',
        contacted_at: new Date().toISOString(),
        status: 'contacted'
      }).eq('id', lead_id);
    }

    res.json({ success: true, message: 'Email sent' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// WhatsApp link generate
app.post('/api/whatsapp-link', (req, res) => {
  try {
    const { phone, message, lead_id } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'Phone required' });

    const cleanPhone = phone.replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message || 'Hello from LeadConnect!')}`;

    if (supabase && lead_id) {
      supabase.from('outreach_logs').insert([{
        lead_id,
        channel: 'whatsapp',
        message,
        status: 'sent'
      }]);
      supabase.from('leads').update({
        outreach_channel: 'whatsapp',
        contacted_at: new Date().toISOString(),
        status: 'contacted'
      }).eq('id', lead_id);
    }

    res.json({ success: true, whatsappUrl: waUrl });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// LinkedIn connect message template
app.post('/api/linkedin-template', (req, res) => {
  try {
    const { lead_name, service_interest, region } = req.body;
    const template = `Hi ${lead_name || 'there'}, I found your profile and think we can help with ${service_interest || 'your business'} in ${region || 'your region'}. Would you be open to a brief conversation?`;

    res.json({ success: true, template });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== HUMAN TRANSFER API ====================

app.post('/api/human-transfer', async (req, res) => {
  try {
    const { lead_id, reason = 'interested' } = req.body;
    const { data, error } = await supabase
      .from('human_transfer_queue')
      .insert([{ lead_id, reason }])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, transfer: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/human-transfer', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('human_transfer_queue')
      .select(`, leads(*)`)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ success: true, queue: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== HEALTH ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'LeadConnect AI System', ai: 'active' });
});

// Serve index.html for all non-API routes (SPA support)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`LeadConnect AI Server running on http://localhost:${PORT}`);
});

module.exports = app;
