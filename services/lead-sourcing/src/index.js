require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ========================================
// LEAD SOURCING ENGINE
// ========================================

class LeadSourcingEngine {
  constructor() {
    this.apolloApiKey = process.env.APOLLO_API_KEY;
    this.hunterApiKey = process.env.HUNTER_API_KEY;
    this.googleApiKey = process.env.GOOGLE_API_KEY;
    this.googleCseId = process.env.GOOGLE_CSE_ID;
  }

  // ========================================
  // GOOGLE CUSTOM SEARCH
  // ========================================
  async searchGoogle(query, numResults = 10) {
    if (!this.googleApiKey || !this.googleCseId) {
      console.log('⚠️ Google API not configured');
      return [];
    }

    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.googleApiKey,
          cx: this.googleCseId,
          q: query,
          num: Math.min(numResults, 10)
        }
      });

      return response.data.items?.map(item => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        source: 'google'
      })) || [];
    } catch (err) {
      console.error('Google search error:', err.message);
      return [];
    }
  }

  // ========================================
  // APOLLO.IO API
  // ========================================
  async searchApollo(filters = {}) {
    if (!this.apolloApiKey) {
      console.log('⚠️ Apollo API not configured');
      return [];
    }

    try {
      const response = await axios.post(
        'https://api.apollo.io/v1/mixed_people/search',
        {
          q_keywords: filters.keywords,
          organization_locations: filters.locations,
          organization_num_employees_ranges: filters.company_sizes,
          person_titles: filters.titles,
          page: 1,
          per_page: 25
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apolloApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.people?.map(person => ({
        name: `${person.first_name} ${person.last_name}`,
        title: person.title,
        email: person.email,
        phone: person.phone_numbers?.[0]?.sanitized_number,
        linkedin: person.linkedin_url,
        company: person.organization?.name,
        company_size: person.organization?.estimated_num_employees,
        industry: person.organization?.industry,
        location: person.organization?.primary_location,
        source: 'apollo',
        raw_data: person
      })) || [];
    } catch (err) {
      console.error('Apollo search error:', err.message);
      return [];
    }
  }

  // ========================================
  // HUNTER.IO API
  // ========================================
  async searchHunter(domain, limit = 20) {
    if (!this.hunterApiKey) {
      console.log('⚠️ Hunter API not configured');
      return [];
    }

    try {
      const response = await axios.get('https://api.hunter.io/v2/domain-search', {
        params: {
          domain,
          limit,
          api_key: this.hunterApiKey
        }
      });

      return response.data.data?.emails?.map(email => ({
        email: email.value,
        name: `${email.first_name} ${email.last_name}`.trim(),
        title: email.position,
        phone: email.phone_number,
        linkedin: email.linkedin,
        company: domain,
        confidence: email.confidence,
        source: 'hunter',
        raw_data: email
      })) || [];
    } catch (err) {
      console.error('Hunter search error:', err.message);
      return [];
    }
  }

  // ========================================
  // LINKEDIN SCRAPING (via browser automation service)
  // ========================================
  async searchLinkedIn(filters) {
    // This will call the browser automation service
    try {
      const response = await axios.post(`${process.env.BROWSER_AUTOMATION_URL}/linkedin/search`, {
        keywords: filters.keywords,
        locations: filters.locations,
        titles: filters.titles,
        company_sizes: filters.company_sizes
      }, {
        headers: { 'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}` }
      });
      return response.data.results || [];
    } catch (err) {
      console.error('LinkedIn search error:', err.message);
      return [];
    }
  }

  // ========================================
  // MASTER SEARCH - COMBINES ALL SOURCES
  // ========================================
  async searchAllSources(params) {
    const {
      keywords = '',
      locations = [],
      titles = [],
      company_sizes = [],
      industries = [],
      sources = ['google', 'apollo', 'hunter']
    } = params;

    const results = [];

    // Run searches in parallel
    const promises = [];

    if (sources.includes('google')) {
      const query = this.buildGoogleQuery(keywords, locations, titles);
      promises.push(this.searchGoogle(query).then(r => results.push(...r)));
    }

    if (sources.includes('apollo')) {
      promises.push(this.searchApollo({ keywords, locations, company_sizes, titles })
        .then(r => results.push(...r)));
    }

    if (sources.includes('hunter') && params.domain) {
      promises.push(this.searchHunter(params.domain).then(r => results.push(...r)));
    }

    await Promise.allSettled(promises);

    // Deduplicate by email/linkedin
    const seen = new Set();
    const unique = results.filter(lead => {
      const key = lead.email || lead.linkedin || lead.phone || lead.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique;
  }

  buildGoogleQuery(keywords, locations, titles) {
    const parts = [];
    if (keywords) parts.push(keywords);
    if (titles.length) parts.push(titles.map(t => `"${t}"`).join(' OR '));
    if (locations.length) parts.push(locations.map(l => `"${l}"`).join(' OR '));
    parts.push('site:linkedin.com/in');
    return parts.join(' ');
  }

  // ========================================
  // SAVE RAW LEADS
  // ========================================
  async saveRawLeads(sourceId, leads) {
    const records = leads.map(lead => ({
      source_id: sourceId,
      raw_data: lead,
      status: 'pending'
    }));

    const { data, error } = await supabase
      .from('raw_leads')
      .insert(records)
      .select();

    if (error) throw error;
    return data;
  }

  // ========================================
  // PROCESS RAW LEADS -> LEADS TABLE
  // ========================================
  async processRawLeads(batchSize = 50) {
    const { data: rawLeads, error } = await supabase
      .from('raw_leads')
      .select('*')
      .eq('status', 'pending')
      .limit(batchSize);

    if (error) throw error;

    const processed = [];

    for (const raw of rawLeads) {
      try {
        const lead = this.normalizeLead(raw.raw_data);
        
        // Check for duplicates
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .or(`email.eq.${lead.email},phone.eq.${lead.phone},linkedin_url.eq.${lead.linkedin_url}`)
          .limit(1);

        if (existing && existing.length > 0) {
          await supabase
            .from('raw_leads')
            .update({ status: 'duplicate', processed_at: new Date().toISOString() })
            .eq('id', raw.id);
          continue;
        }

        // Score the lead
        const score = this.calculateScore(lead);
        const segment = this.getSegment(score);

        // Insert into leads
        const { data: newLead, error } = await supabase
          .from('leads')
          .insert({
            ...lead,
            lead_score: score,
            segment,
            raw_source_id: raw.id,
            enrichment_status: 'pending'
          })
          .select()
          .single();

        if (error) throw error;

        // Mark raw lead as processed
        await supabase
          .from('raw_leads')
          .update({ status: 'processed', processed_at: new Date().toISOString() })
          .eq('id', raw.id);

        processed.push(newLead);
      } catch (err) {
        await supabase
          .from('raw_leads')
          .update({ status: 'failed', error_message: err.message, processed_at: new Date().toISOString() })
          .eq('id', raw.id);
      }
    }

    return processed;
  }

  normalizeLead(raw) {
    return {
      name: raw.name || `${raw.first_name || ''} ${raw.last_name || ''}`.trim(),
      email: raw.email,
      phone: raw.phone,
      company: raw.company,
      title: raw.title,
      linkedin_url: raw.linkedin || raw.linkedin_url,
      company_size: raw.company_size,
      industry: raw.industry,
      region: raw.location || raw.region,
      website: raw.website,
      source: raw.source || 'unknown',
      raw_data: raw
    };
  }

  calculateScore(lead) {
    let score = 0;
    if (lead.email) score += 20;
    if (lead.phone) score += 15;
    if (lead.title && this.isDecisionMaker(lead.title)) score += 20;
    if (lead.company_size && this.matchCompanySize(lead.company_size)) score += 15;
    if (lead.industry) score += 10;
    if (lead.linkedin_url) score += 10;
    if (lead.company) score += 10;
    return Math.min(score, 100);
  }

  isDecisionMaker(title) {
    const dmKeywords = ['ceo', 'cto', 'cfo', 'coo', 'founder', 'owner', 'president', 'director', 'vp', 'vice president', 'head of', 'manager'];
    const lower = title.toLowerCase();
    return dmKeywords.some(k => lower.includes(k));
  }

  matchCompanySize(size) {
    const targetSizes = ['11-50', '51-200', '201-500', '501-1000'];
    return targetSizes.some(s => size.includes(s));
  }

  getSegment(score) {
    if (score >= 80) return 'hot';
    if (score >= 50) return 'warm';
    if (score >= 20) return 'cold';
    return 'nurture';
  }

  // ========================================
  // ENRICHMENT
  // ========================================
  async enrichLead(leadId) {
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (!lead) return;

    // Clearbit enrichment (if API key available)
    if (process.env.CLEARBIT_API_KEY && lead.email) {
      try {
        const response = await axios.get(`https://person.clearbit.com/v2/people/find?email=${lead.email}`, {
          headers: { 'Authorization': `Bearer ${process.env.CLEARBIT_API_KEY}` }
        });

        await supabase
          .from('lead_enrichment')
          .insert({
            lead_id: leadId,
            provider: 'clearbit',
            data: response.data,
            confidence: 90
          });

        // Update lead with enriched data
        await this.updateLeadWithEnrichment(leadId, response.data);
      } catch (err) {
        console.error('Clearbit enrichment failed:', err.message);
      }
    }

    // Hunter enrichment
    if (this.hunterApiKey && lead.email) {
      try {
        const response = await axios.get('https://api.hunter.io/v2/email-verifier', {
          params: { email: lead.email, api_key: this.hunterApiKey }
        });

        await supabase
          .from('lead_enrichment')
          .insert({
            lead_id: leadId,
            provider: 'hunter',
            data: response.data.data,
            confidence: 80
          });
      } catch (err) {
        console.error('Hunter enrichment failed:', err.message);
      }
    }

    await supabase
      .from('leads')
      .update({ enrichment_status: 'enriched' })
      .eq('id', leadId);
  }

  async updateLeadWithEnrichment(leadId, data) {
    const updates = {};
    if (data.name?.fullName) updates.name = data.name.fullName;
    if (data.location) updates.region = data.location;
    if (data.company?.name) updates.company = data.company.name;
    if (data.company?.domain) updates.website = `https://${data.company.domain}`;
    if (data.linkedin?.handle) updates.linkedin_url = `https://linkedin.com/in/${data.linkedin.handle}`;

    if (Object.keys(updates).length > 0) {
      await supabase.from('leads').update(updates).eq('id', leadId);
    }
  }
}

const engine = new LeadSourcingEngine();

// ========================================
// API ROUTES
// ========================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'lead-sourcing' });
});

app.post('/source/run', async (req, res) => {
  try {
    const { source_id, ...params } = req.body;
    
    // Log source run
    await supabase.from('lead_sources').update({ last_run: new Date().toISOString() }).eq('id', source_id);

    const leads = await engine.searchAllSources(params);
    
    // Save raw leads
    await engine.saveRawLeads(source_id, leads);
    
    // Process to leads table
    const processed = await engine.processRawLeads();
    
    // Update source stats
    await supabase
      .from('lead_sources')
      .increment('leads_found', leads.length)
      .eq('id', source_id);

    res.json({ success: true, found: leads.length, processed: processed.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/source/process-pending', async (req, res) => {
  try {
    const processed = await engine.processRawLeads(100);
    res.json({ success: true, processed: processed.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/enrich/:leadId', async (req, res) => {
  try {
    await engine.enrichLead(req.params.leadId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/sources', async (req, res) => {
  const { data } = await supabase.from('lead_sources').select('*').order('created_at', { ascending: false });
  res.json({ success: true, sources: data });
});

app.post('/sources', async (req, res) => {
  const { data, error } = await supabase.from('lead_sources').insert(req.body).select().single();
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, source: data });
});

app.listen(PORT, () => {
  console.log(`🚀 Lead Sourcing Service running on port ${PORT}`);
});

module.exports = app;