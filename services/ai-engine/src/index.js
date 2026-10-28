require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ========================================
// AI SERVICE KNOWLEDGE BASE
// ========================================
const SERVICE_KNOWLEDGE = {
  name: 'LeadConnect',
  description: 'AI-powered B2B lead generation and client outreach platform',
  services: [
    {
      id: 'web-development',
      name: 'Web Development',
      description: 'Custom websites, e-commerce stores, and web applications for businesses.',
      keyBenefits: ['Professional online presence', 'Mobile responsive', 'SEO optimized', 'Fast loading'],
      idealFor: ['Restaurants', 'Clinics', 'Retail stores', 'Service businesses'],
      pricing: 'Starting ₹15,000',
      timeline: '2-4 weeks'
    },
    {
      id: 'digital-marketing',
      name: 'Digital Marketing',
      description: 'SEO, social media marketing, Google ads, and lead generation campaigns.',
      keyBenefits: ['More visibility', 'Targeted leads', 'Measurable ROI', 'Brand awareness'],
      idealFor: ['E-commerce', 'SaaS companies', 'Local businesses', 'Startups'],
      pricing: 'Starting ₹25,000/month',
      timeline: 'Ongoing'
    },
    {
      id: 'app-development',
      name: 'App Development',
      description: 'iOS and Android mobile applications for your business.',
      keyBenefits: ['Native apps', 'User friendly', 'App store ready', 'Push notifications'],
      idealFor: ['Food delivery', 'Healthcare', 'Education', 'Fintech'],
      pricing: 'Starting ₹50,000',
      timeline: '3-6 months'
    },
    {
      id: 'seo-services',
      name: 'SEO Services',
      description: 'Search engine optimization to rank your website on Google first page.',
      keyBenefits: ['First page ranking', 'Organic traffic', 'Long-term results', 'Local SEO'],
      idealFor: ['Local services', 'Blogs', 'Business directories', 'Service providers'],
      pricing: 'Starting ₹15,000/month',
      timeline: '3-6 months'
    }
  ]
};

// ========================================
// AI THINKING ENGINE
// ========================================
class AIThinkingEngine {
  constructor() {
    this.systemPrompt = this.buildSystemPrompt();
  }

  buildSystemPrompt() {
    return `You are LeadConnect AI, an expert B2B sales assistant. Your role is to:
1. Understand the visitor's business and needs
2. Explain LeadConnect services clearly and persuasively
3. Collect key information: service interest, target audience, region, budget, timeline
4. Share relevant documents (PDFs) at the right moment
5. Qualify leads using BANT (Budget, Authority, Need, Timeline)
6. When qualified and interested, smoothly transfer to human sales

Guidelines:
- Be conversational, helpful, and professional
- Ask ONE question at a time
- Listen actively and reference previous answers
- Share documents when relevant (service guide, pricing, case studies)
- Detect buying signals: "interested", "tell me more", "pricing", "demo", "yes"
- When strong interest detected, offer human handoff
- Never push - guide naturally

Current Services:
${JSON.stringify(SERVICE_KNOWLEDGE.services, null, 2)}`;
  }

  // ========================================
  // THINKING: Analyze user message
  // ========================================
  async think(userMessage, context) {
    const thinkingPrompt = `${this.systemPrompt}

Current Context:
- Lead Info: ${JSON.stringify(context.leadInfo || {})}
- Conversation Stage: ${context.stage || 'greeting'}
- Messages Exchanged: ${context.messageCount || 0}
- Info Collected: ${JSON.stringify(context.collectedInfo || {})}
- Missing Info: ${JSON.stringify(context.missingInfo || ['service_interest', 'target_audience', 'region'])}
- Documents Sent: ${JSON.stringify(context.documentsSent || [])}

User Message: "${userMessage}"

Analyze and respond with JSON:
{
  "intent": "service_inquiry|pricing_inquiry|document_request|human_transfer|interested|objection|providing_info|other",
  "confidence": 0-100,
  "extractedInfo": { "service_interest": "", "target_audience": "", "region": "", "budget": "", "timeline": "", "company": "" },
  "nextAction": "ask_question|provide_info|send_document|offer_handoff|handle_objection",
  "question": "specific question to ask",
  "suggestedDocument": "service_guide|pricing|case_study|null",
  "reasoning": "brief explanation of thinking"
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an AI thinking engine. Always respond with valid JSON only.' },
          { role: 'user', content: thinkingPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (err) {
      console.error('Thinking error:', err.message);
      return this.fallbackThink(userMessage, context);
    }
  }

  fallbackThink(userMessage, context) {
    const lower = userMessage.toLowerCase();
    
    if (lower.includes('price') || lower.includes('cost') || lower.includes('pricing')) {
      return {
        intent: 'pricing_inquiry',
        confidence: 80,
        extractedInfo: {},
        nextAction: 'send_document',
        suggestedDocument: 'pricing',
        reasoning: 'User asking about pricing'
      };
    }
    
    if (lower.includes('document') || lower.includes('pdf') || lower.includes('brochure') || lower.includes('guide')) {
      return {
        intent: 'document_request',
        confidence: 70,
        extractedInfo: {},
        nextAction: 'send_document',
        suggestedDocument: 'service_guide',
        reasoning: 'User requested document'
      };
    }
    
    if (lower.includes('human') || lower.includes('talk to') || lower.includes('speak to') || lower.includes('sales') || lower.includes('person')) {
      return {
        intent: 'human_transfer',
        confidence: 90,
        extractedInfo: {},
        nextAction: 'offer_handoff',
        reasoning: 'User requested human'
      };
    }
    
    if (lower.includes('yes') || lower.includes('interested') || lower.includes('tell me more') || lower.includes('demo')) {
      return {
        intent: 'interested',
        confidence: 80,
        extractedInfo: {},
        nextAction: 'offer_handoff',
        reasoning: 'User showing interest'
      };
    }

    // Check for info being provided
    const extracted = {};
    if (!context.collectedInfo?.service_interest) {
      SERVICE_KNOWLEDGE.services.forEach(s => {
        if (lower.includes(s.name.toLowerCase()) || lower.includes(s.id)) {
          extracted.service_interest = s.name;
        }
      });
    }

    return {
      intent: 'providing_info',
      confidence: 50,
      extractedInfo: extracted,
      nextAction: context.missingInfo?.includes('service_interest') ? 'ask_question' : 
                  context.missingInfo?.includes('target_audience') ? 'ask_question' : 'ask_question',
      question: this.getNextQuestion(context),
      suggestedDocument: 'service_guide',
      reasoning: 'Collecting missing information'
    };
  }

  getNextQuestion(context) {
    const missing = context.missingInfo || ['service_interest', 'target_audience', 'region'];
    const questions = {
      service_interest: "What service are you interested in? (Web Development, Digital Marketing, App Development, SEO Services)",
      target_audience: "Who is your target audience? (e.g., restaurants, clinics, real estate agents)",
      region: "Which city/region are you targeting? (e.g., Delhi NCR, Mumbai, Bangalore, Pan India)",
      budget: "What's your budget range for this service?",
      timeline: "When are you looking to get started?"
    };
    return questions[missing[0]] || "Tell me more about your needs.";
  }

  // ========================================
  // GENERATE RESPONSE
  // ========================================
  async generateResponse(thinking, context) {
    const responsePrompt = `${this.systemPrompt}

Thinking Result: ${JSON.stringify(thinking)}
Context: ${JSON.stringify(context)}

Generate a natural, conversational response. Be helpful and ask ONE question if needed.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are LeadConnect AI. Respond naturally and conversationally.' },
          { role: 'user', content: responsePrompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      return completion.choices[0].message.content;
    } catch (err) {
      console.error('Response generation error:', err.message);
      return this.fallbackResponse(thinking);
    }
  }

  fallbackResponse(thinking) {
    const responses = {
      ask_question: thinking.question || "Tell me more about your needs.",
      provide_info: "I'd be happy to tell you more about our services!",
      send_document: `I'll send you our ${thinking.suggestedDocument === 'pricing' ? 'pricing sheet' : 'service guide'}.`,
      offer_handoff: "It sounds like you're interested! Would you like me to connect you with our sales team for a detailed discussion?",
      handle_objection: "I understand your concern. Let me address that for you."
    };
    return responses[thinking.nextAction] || "How can I help you today?";
  }

  // ========================================
  // CHECK HANDOFF TRIGGERS
  // ========================================
  checkHandoff(thinking, context) {
    const triggers = [
      thinking.intent === 'interested' && thinking.confidence > 70,
      thinking.intent === 'human_transfer',
      context.messageCount > 5 && (thinking.intent === 'interested' || thinking.intent === 'pricing_inquiry'),
      context.collectedInfo?.service_interest && context.collectedInfo?.target_audience && context.collectedInfo?.region && thinking.intent === 'interested'
    ];
    return triggers.some(t => t);
  }
}

// ========================================
// CONTEXT MANAGER
// ========================================
class ContextManager {
  async getContext(leadId, sessionId) {
    // Get AI context
    const { data: aiContext } = await supabase
      .from('ai_context')
      .select('*')
      .eq('lead_id', leadId)
      .eq('session_id', sessionId)
      .single();

    // Get lead info
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    // Get conversation history
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    // Get documents sent
    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .in('category', ['service_guide', 'pricing', 'case_study'])
      .eq('is_active', true);

    const collectedInfo = aiContext?.context?.collectedInfo || {};
    const allFields = ['service_interest', 'target_audience', 'region', 'budget', 'timeline', 'company'];
    const missingInfo = allFields.filter(f => !collectedInfo[f]);

    return {
      leadInfo: lead ? {
        name: lead.name,
        email: lead.email,
        company: lead.company,
        service_interest: lead.service_interest,
        target_audience: lead.target_audience,
        region: lead.region,
        lead_score: lead.lead_score
      } : {},
      stage: aiContext?.context?.stage || 'greeting',
      messageCount: conversations?.length || 0,
      collectedInfo,
      missingInfo,
      documentsSent: aiContext?.context?.documentsSent || [],
      availableDocuments: docs
    };
  }

  async updateContext(leadId, sessionId, updates) {
    const { data: existing } = await supabase
      .from('ai_context')
      .select('*')
      .eq('lead_id', leadId)
      .eq('session_id', sessionId)
      .single();

    const context = existing?.context || {
      stage: 'greeting',
      collectedInfo: {},
      documentsSent: [],
      qualification: {}
    };

    Object.assign(context, updates);

    await supabase
      .from('ai_context')
      .upsert({
        lead_id: leadId,
        session_id: sessionId,
        context,
        updated_at: new Date().toISOString()
      });
  }

  async addCollectedInfo(leadId, sessionId, info) {
    const { data: existing } = await supabase
      .from('ai_context')
      .select('context')
      .eq('lead_id', leadId)
      .eq('session_id', sessionId)
      .single();

    const context = existing?.context || { collectedInfo: {} };
    context.collectedInfo = { ...context.collectedInfo, ...info };

    await this.updateContext(leadId, sessionId, context);
  }

  async addDocumentSent(leadId, sessionId, document) {
    const { data: existing } = await supabase
      .from('ai_context')
      .select('context')
      .eq('lead_id', leadId)
      .eq('session_id', sessionId)
      .single();

    const context = existing?.context || { documentsSent: [] };
    context.documentsSent = [...(context.documentsSent || []), document];

    await this.updateContext(leadId, sessionId, context);
  }

  async setStage(leadId, sessionId, stage) {
    await this.updateContext(leadId, sessionId, { stage });
  }
}

// ========================================
// DOCUMENT MANAGER
// ========================================
class DocumentManager {
  async getDocument(category) {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    return data;
  }

  async formatDocumentResponse(doc) {
    if (!doc) return null;
    return {
      title: doc.title,
      description: doc.description,
      fileUrl: doc.file_url,
      fileType: doc.file_type,
      downloadUrl: doc.file_url
    };
  }
}

// ========================================
// MAIN AI ENGINE
// ========================================
const thinkingEngine = new AIThinkingEngine();
const contextManager = new ContextManager();
const docManager = new DocumentManager();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-engine' });
});

app.post('/chat', async (req, res) => {
  try {
    const { message, session_id, lead_id } = req.body;

    if (!message || !session_id) {
      return res.status(400).json({ success: false, error: 'Message and session_id required' });
    }

    // Get or create lead
    let dbLeadId = lead_id;
    if (!dbLeadId) {
      const { data: newLead } = await supabase
        .from('leads')
        .insert({
          source: 'website',
          status: 'ai_talking',
          session_id
        })
        .select()
        .single();
      dbLeadId = newLead.id;
    }

    // Save user message
    await supabase.from('conversations').insert({
      lead_id: dbLeadId,
      session_id,
      message,
      sender: 'user',
      channel: 'web'
    });

    // Get context
    const context = await contextManager.getContext(dbLeadId, session_id);

    // Think
    const thinking = await thinkingEngine.think(message, context);

    // Extract and save info
    if (Object.keys(thinking.extractedInfo).length > 0) {
      await contextManager.addCollectedInfo(dbLeadId, session_id, thinking.extractedInfo);
    }

    // Generate response
    const response = await thinkingEngine.generateResponse(thinking, context);

    // Handle document sending
    let document = null;
    if (thinking.sendDocument && thinking.suggestedDocument) {
      document = await docManager.getDocument(thinking.suggestedDocument);
      if (document) {
        await contextManager.addDocumentSent(dbLeadId, session_id, document.title);
      }
    }

    // Check handoff
    const shouldHandoff = thinkingEngine.checkHandoff(thinking, context);
    let handoffTriggered = false;

    if (shouldHandoff) {
      await contextManager.setStage(dbLeadId, session_id, 'handoff');
      
      // Create human transfer
      await supabase.from('human_transfer_queue').insert({
        lead_id: dbLeadId,
        reason: 'ai_qualified_interested',
        session_id
      });

      // Update lead status
      await supabase
        .from('leads')
        .update({ status: 'human_transfer' })
        .eq('id', dbLeadId);

      handoffTriggered = true;
    }

    // Save AI response
    await supabase.from('conversations').insert({
      lead_id: dbLeadId,
      session_id,
      message: response,
      sender: 'ai',
      channel: 'web',
      ai_thinking: thinking.reasoning
    });

    res.json({
      success: true,
      response,
      thinking: thinking.reasoning,
      sendDocument: thinking.sendDocument,
      document: document ? await docManager.formatDocumentResponse(document) : null,
      suggestHuman: shouldHandoff,
      handoffTriggered,
      session_id,
      lead_id: dbLeadId
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/chat/history/:sessionId', async (req, res) => {
  try {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', req.params.sessionId)
      .order('created_at', { ascending: true });
    res.json({ success: true, conversations: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/documents/:category', async (req, res) => {
  try {
    const doc = await docManager.getDocument(req.params.category);
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, document: await docManager.formatDocumentResponse(doc) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/context/:leadId/:sessionId', async (req, res) => {
  try {
    const context = await contextManager.getContext(req.params.leadId, req.params.sessionId);
    res.json({ success: true, context });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI Engine running on port ${PORT}`);
});

module.exports = app;