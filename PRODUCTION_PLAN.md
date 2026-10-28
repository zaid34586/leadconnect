# LeadConnect - Production Architecture Plan

## 🎯 Vision
**Fully automated B2B lead generation system** that finds real leads, engages them via AI across WhatsApp/Email/LinkedIn, qualifies them, and hands off to humans for closing.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LEADCONNECT PRODUCTION SYSTEM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐ │
│  │   LEAD       │    │   LEAD       │    │   OUTREACH   │    │  AI      │ │
│  │   SOURCING   │───▶│   PROCESSING │───▶│   ENGINE     │───▶│  CHAT    │ │
│  │              │    │              │    │              │    │          │ │
│  │ • Google     │    │ • Dedup      │    │ • WhatsApp   │    │ • Think  │ │
│  │   Search     │    │ • Score      │    │   (Browser)  │    │ • Memory │ │
│  │ • LinkedIn   │    │ • Enrich     │    │ • Email      │    │ • Docs   │ │
│  │   Scraper    │    │ • Segment    │    │   (SMTP)     │    │ • Handoff│ │
│  │ • Apollo/    │    │ • Validate   │    │ • LinkedIn   │    │          │ │
│  │   Hunter     │    │              │    │   (Browser)  │    │          │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────┘ │
│         │                  │                  │                  │        │
│         ▼                  ▼                  ▼                  ▼        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    SUPABASE (PostgreSQL)                             │  │
│  │  leads │ conversations │ documents │ outreach_logs │ transfers      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    BROWSER AUTOMATION LAYER                          │  │
│  │  Puppeteer Cluster │ WhatsApp Web │ LinkedIn │ Session Management  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Core Modules

### 1. LEAD SOURCING MODULE
**Goal**: Find real B2B decision-makers automatically

| Source | Method | Output |
|--------|--------|--------|
| **Google Search API** | Custom search + dorks | Company + contact info |
| **LinkedIn Sales Navigator** | Puppeteer scraper | Decision-maker profiles |
| **Apollo.io API** | Direct API | Verified emails/phones |
| **Hunter.io API** | Domain search | Email patterns |
| **Manual CSV Import** | Dashboard upload | Bulk leads |

**Data Collected per Lead:**
```json
{
  "name": "Rajesh Kumar",
  "title": "Founder & CEO",
  "company": "TechSpire Solutions",
  "company_size": "50-200",
  "industry": "Software Development",
  "email": "rajesh@techspire.com",
  "phone": "+91-9876543210",
  "linkedin": "linkedin.com/in/rajeshkumar",
  "location": "Bangalore, India",
  "website": "techspire.com",
  "source": "linkedin_scraper",
  "enriched_at": "2024-01-15T10:30:00Z"
}
```

### 2. LEAD PROCESSING PIPELINE
**Goal**: Clean, score, segment, enrich

```
Raw Lead → Dedup → Validate → Enrich → Score → Segment → Queue
   │         │        │         │       │        │        │
   ▼         ▼        ▼         ▼       ▼        ▼        ▼
  Check   Email    Clearbit  Apollo  0-100   Industry  Outreach
  email/  format   /Hunter  Score   score   + Size +  Queue
  phone   + MX     + LinkedIn             Region    (priority)
```

**Lead Scoring (0-100):**
| Factor | Weight |
|--------|--------|
| Email verified | +20 |
| Phone verified | +15 |
| Decision-maker title | +20 |
| Company size match | +15 |
| Industry match | +15 |
| LinkedIn profile | +10 |
| Recent funding/hiring | +5 |

**Segments:** `hot` (80+), `warm` (50-79), `cold` (<50), `nurture` (no contact info)

### 3. OUTREACH ENGINE (Multi-Channel)
**Goal**: Automated, personalized, compliant outreach

#### WhatsApp (Browser Automation - Puppeteer)
```
┌─────────────────────────────────────────────────────────┐
│  WHATSAPP BROWSER AUTOMATION                            │
├─────────────────────────────────────────────────────────┤
│  • Persistent Chrome profile (session reuse)            │
│  • QR code login once → session stored                  │
│  • Rate limits: 20 msg/hr, 100/day per number           │
│  • Template messages with variables                     │
│  • Read receipts tracking                               │
│  • Auto-reply for common responses                      │
│  • Media support (images, PDFs, vCards)                 │
└─────────────────────────────────────────────────────────┘
```

#### Email (SMTP + Tracking)
```
┌─────────────────────────────────────────────────────────┐
│  EMAIL OUTREACH                                         │
├─────────────────────────────────────────────────────────┤
│  • SMTP (Gmail/SendGrid/AWS SES)                        │
│  • DKIM/SPF/DMARC configured                            │
│  • Open/click tracking (pixel + link wrapping)          │
│  • Unsubscribe header                                   │
│  • A/B testing subject lines                            │
│  • Sequence: Day 1, 3, 7, 14                            │
│  • Reply detection → pause sequence                     │
└─────────────────────────────────────────────────────────┘
```

#### LinkedIn (Browser Automation - Puppeteer)
```
┌─────────────────────────────────────────────────────────┐
│  LINKEDIN AUTOMATION                                    │
├─────────────────────────────────────────────────────────┤
│  • Persistent session (cookies + localStorage)          │
│  • Connection requests: 20/day (safe limit)             │
│  • Message after connect: personalized                  │
│  • Profile view tracking                                │
│  • Sales Navigator search automation                    │
│  • Anti-detection: random delays, human-like behavior   │
└─────────────────────────────────────────────────────────┘
```

### 4. AI CONVERSATION ENGINE
**Goal**: Human-like conversations that qualify and sell

**Architecture:**
```
User Message
    │
    ▼
┌─────────────────┐
│  CONTEXT BUILDER │
│  • Lead profile  │
│  • Chat history  │
│  • Service info  │
│  • Documents     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  THINKING ENGINE │
│  • Intent detect │
│  • Entity extract│
│  • Next action   │
│  • Tone match    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  RESPONSE GEN    │
│  • Template + LLM│
│  • Personalize   │
│  • Add CTA       │
│  • Suggest doc   │
└────────┬────────┘
         │
         ▼
    Send Response
```

**Capabilities:**
- **Service Pitching**: Explains services with benefits
- **Objection Handling**: Price, timing, trust objections
- **Document Sharing**: Sends PDFs at right moment
- **Qualification**: BANT (Budget, Authority, Need, Timeline)
- **Handoff Trigger**: Detects buying signals → human queue

### 5. LEAD STATUS MANAGEMENT
**Pipeline Stages:**

```
NEW → CONTACTED → ENGAGED → QUALIFIED → PROPOSAL → NEGOTIATION → CLOSED_WON
  │         │          │          │           │           │           │
  ▼         ▼          ▼          ▼           ▼           ▼           ▼
Import   First      Replied    BANT       Sent       Discount    Contract
Lead     Touch      + Interest  Complete   Proposal   Talks       Signed
                                                   
         │          │          │           │           │
         ▼          ▼          ▼           ▼           ▼
     NO_REPLY  NOT_INTERESTED  UNQUALIFIED  STALLED   CLOSED_LOST
     (3 tries)  (explicit)    (no budget)  (30 days) (lost deal)
```

**Auto-transitions:**
- `NEW` → `CONTACTED` when first outreach sent
- `CONTACTED` → `ENGAGED` when reply received
- `ENGAGED` → `QUALIFIED` when BANT complete
- `QUALIFIED` → `PROPOSAL` when proposal sent
- `ENGAGED` → `NO_REPLY` after 3 follow-ups no response
- Any stage → `CLOSED_LOST` on explicit rejection

### 6. BROWSER AUTOMATION INFRASTRUCTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                  PUPPETEER CLUSTER MANAGER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Browser 1  │  │  Browser 2  │  │  Browser N  │   ...       │
│  │  (WhatsApp) │  │  (LinkedIn) │  │  (Spare)    │             │
│  │             │  │             │  │             │             │
│  │ Persistent  │  │ Persistent  │  │  On-demand  │             │
│  │ Profile     │  │ Profile     │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  Session Pool:                                                  │
│  • WhatsApp: 1 persistent session (QR login once)              │
│  • LinkedIn: 1-2 persistent sessions (cookie rotation)         │
│  • Health checks every 5 min                                    │
│  • Auto-recovery on crash                                       │
│  • Rate limiting per session                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Session Persistence:**
- Cookies + localStorage + IndexedDB saved to Supabase Storage
- Restore on startup → no re-login needed
- Encrypted at rest

---

## 🗄️ Database Schema (Extended)

```sql
-- Core tables (existing) +
-- Lead sourcing
create table lead_sources (
  id uuid primary key default uuid_generate_v4(),
  name text, -- 'google_search', 'linkedin', 'apollo', 'hunter', 'csv_import'
  config jsonb, -- API keys, search params
  status text default 'active',
  last_run timestamp with time zone,
  leads_found integer default 0
);

create table raw_leads (
  id uuid primary key default uuid_generate_v4(),
  source_id uuid references lead_sources(id),
  raw_data jsonb, -- Original scraped data
  status text default 'pending', -- pending, processed, failed
  created_at timestamp with time zone default now()
);

-- Lead enrichment
create table lead_enrichment (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id),
  provider text, -- 'clearbit', 'hunter', 'apollo', 'linkedin'
  data jsonb,
  confidence integer, -- 0-100
  created_at timestamp with time zone default now()
);

-- Outreach sequences
create table outreach_sequences (
  id uuid primary key default uuid_generate_v4(),
  name text,
  channel text, -- 'email', 'whatsapp', 'linkedin'
  steps jsonb, -- [{day: 1, template_id}, {day: 3, template_id}, ...]
  is_active boolean default true
);

create table outreach_campaigns (
  id uuid primary key default uuid_generate_v4(),
  name text,
  sequence_id uuid references outreach_sequences(id),
  segment_filter jsonb, -- {status: ['new'], segment: ['hot']}
  schedule_cron text, -- '0 9 * * 1-5' (9am weekdays)
  status text default 'draft', -- draft, running, paused, completed
  stats jsonb default '{}'
);

create table outreach_contacts (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid references outreach_campaigns(id),
  lead_id uuid references leads(id),
  current_step integer default 0,
  status text default 'pending', -- pending, sent, replied, bounced, unsubscribed, paused
  next_send_at timestamp with time zone,
  last_sent_at timestamp with time zone,
  reply_received_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Browser sessions
create table browser_sessions (
  id uuid primary key default uuid_generate_v4(),
  channel text, -- 'whatsapp', 'linkedin'
  profile_data jsonb, -- cookies, localStorage, etc.
  status text default 'active', -- active, expired, error
  last_used timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- AI conversation context
create table ai_context (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id),
  session_id text,
  context jsonb, -- {stage, extracted_info, documents_sent, objections, next_actions}
  updated_at timestamp with time zone default now()
);

-- Notifications
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid, -- admin/sales user
  type text, -- 'human_transfer', 'lead_reply', 'meeting_booked', 'deal_closed'
  title text,
  message text,
  data jsonb,
  read boolean default false,
  created_at timestamp with time zone default now()
);
```

---

## 🔄 Automation Workflows

### Workflow 1: Daily Lead Sourcing (Cron: 6 AM)
```
1. For each active lead_source:
   - Run search/scraper
   - Save raw_leads
2. Process raw_leads batch:
   - Dedup (email + phone + linkedin)
   - Validate (email MX, phone format)
   - Enrich (Clearbit → Hunter → Apollo → LinkedIn)
   - Score (0-100)
   - Segment (hot/warm/cold/nurture)
   - Create leads table entries
   - Assign to outreach campaigns
```

### Workflow 2: Outreach Scheduler (Cron: Every 15 min)
```
1. Get due outreach_contacts (next_send_at <= now)
2. For each contact:
   - Check lead status (skip if closed/lost)
   - Check channel limits (rate limits)
   - Personalize template
   - Send via channel adapter
   - Log to outreach_logs
   - Update next_send_at for next step
   - Handle bounces/unsubscribes
```

### Workflow 3: AI Conversation Processor (Event-driven: on message)
```
1. Receive message (webhook/polling)
2. Load lead + context
3. Run thinking engine
4. Generate response
5. Send response
6. Update context
7. Check handoff triggers
8. If handoff → create transfer queue entry + notify
```

### Workflow 4: Browser Session Manager (Cron: Every 5 min)
```
1. Check all browser_sessions
2. If expired/error → restart
3. If unused > 1 hr → keep warm
4. Health check: navigate to home page
5. Save session state to Supabase
```

### Workflow 5: Lead Status Auto-Transition (Cron: Hourly)
```
1. NEW → CONTACTED (if outreach_logs exist)
2. CONTACTED → ENGAGED (if reply in conversations)
3. ENGAGED → QUALIFIED (if BANT complete in ai_context)
4. ENGAGED → NO_REPLY (3+ outreach, 0 replies, 14 days)
5. Any → CLOSED_LOST (explicit rejection detected)
6. Update lead.updated_at
```

---

## 🔌 API Endpoints Needed

### Lead Management
```
GET    /api/v1/leads                    # List with filters
POST   /api/v1/leads                    # Create
GET    /api/v1/leads/:id                # Get detail
PATCH  /api/v1/leads/:id                # Update
POST   /api/v1/leads/import             # CSV import
GET    /api/v1/leads/:id/timeline       # Activity timeline
```

### Lead Sourcing
```
POST   /api/v1/sourcing/run             # Trigger sourcing
GET    /api/v1/sources                  # List sources
POST   /api/v1/sources                  # Add source
GET    /api/v1/sources/:id/stats        # Source stats
```

### Outreach
```
POST   /api/v1/outreach/send            # Send single
POST   /api/v1/campaigns                # Create campaign
GET    /api/v1/campaigns                # List
GET    /api/v1/campaigns/:id/stats      # Campaign stats
POST   /api/v1/campaigns/:id/start      # Start
POST   /api/v1/campaigns/:id/pause      # Pause
```

### AI Chat
```
POST   /api/v1/chat/message             # Send message
GET    /api/v1/chat/history/:leadId     # Get history
POST   /api/v1/chat/handoff             # Trigger handoff
```

### Browser Automation
```
POST   /api/v1/browser/whatsapp/send    # Send WhatsApp
POST   /api/v1/browser/linkedin/connect # Connect
POST   /api/v1/browser/linkedin/message # Message
GET    /api/v1/browser/sessions/status  # Session health
```

### Dashboard/Analytics
```
GET    /api/v1/analytics/overview       # Key metrics
GET    /api/v1/analytics/funnel         # Pipeline funnel
GET    /api/v1/analytics/outreach       # Channel performance
GET    /api/v1/analytics/ai             # AI conversation stats
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1-2) ✅ PARTIAL
- [x] Supabase setup + basic tables
- [x] Landing page + dashboard UI
- [x] Basic AI chat (rule-based)
- [x] Auth (Supabase)
- [ ] **Fix RLS policies**
- [ ] **Add extended tables**
- [ ] **Environment config**

### Phase 2: Lead Sourcing & Processing (Week 2-3)
- [ ] Lead sources config (Apollo, Hunter, Google)
- [ ] Raw leads table + processing pipeline
- [ ] Deduplication engine
- [ ] Enrichment integration (Clearbit, Hunter)
- [ ] Scoring algorithm
- [ ] Segmentation logic

### Phase 3: Outreach Engine (Week 3-4)
- [ ] Email sequence engine (SMTP + tracking)
- [ ] WhatsApp browser automation (Puppeteer)
- [ ] LinkedIn browser automation (Puppeteer)
- [ ] Campaign manager + scheduler
- [ ] Rate limiting + compliance

### Phase 4: AI Conversation Engine (Week 4-5)
- [ ] Context builder + memory
- [ ] Thinking engine (intent + entities)
- [ ] Response generator (templates + LLM)
- [ ] Document sharing logic
- [ ] Handoff detection + trigger

### Phase 5: Browser Automation Infrastructure (Week 5-6)
- [ ] Puppeteer cluster manager
- [ ] Session persistence (Supabase Storage)
- [ ] WhatsApp Web automation
- [ ] LinkedIn automation
- [ ] Health monitoring + auto-recovery

### Phase 6: Lead Pipeline & Automation (Week 6-7)
- [ ] Pipeline stages + auto-transitions
- [ ] Outreach campaigns + sequences
- [ ] Scheduler (cron jobs via Vercel/pg_cron)
- [ ] Webhooks for real-time updates
- [ ] Analytics endpoints

### Phase 7: Dashboard & Monitoring (Week 7-8)
- [ ] Real-time dashboard (SSE/WebSocket)
- [ ] Lead kanban board
- [ ] Conversation monitor
- [ ] Campaign analytics
- [ ] Browser session health
- [ ] Notifications system

---

## 🛠️ Tech Stack Decisions

| Component | Choice | Reason |
|-----------|--------|--------|
| **Database** | Supabase (PostgreSQL) | Auth + Realtime + Storage + Edge |
| **Backend** | Node.js (Vercel Functions) | Serverless, auto-scale, TypeScript |
| **Browser Automation** | Puppeteer + Puppeteer Cluster | Mature, good stealth plugins |
| **Queue/Jobs** | pg_cron + Vercel Cron | Native Postgres, no extra infra |
| **AI** | OpenAI GPT-4o-mini + templates | Cost-effective, structured output |
| **Email** | SendGrid (production) / Nodemailer | Deliverability + tracking |
| **Monitoring** | Vercel Analytics + Supabase Logs | Built-in |
| **Secrets** | Vercel Env + Supabase Vault | Secure |

---

## 🔐 Security & Compliance

- **Rate Limits**: Per-channel, per-day, per-account
- **Opt-out**: Immediate unsubscribe across all channels
- **Data Retention**: 90 days conversations, 1 year leads
- **GDPR/PDPB**: Right to deletion, data export
- **Anti-spam**: Warm-up periods, domain reputation
- **Browser Sessions**: Encrypted storage, rotation

---

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| Leads sourced/day | 100+ |
| Email deliverability | >95% |
| WhatsApp delivery | >98% |
| LinkedIn connect rate | >30% |
| AI conversation → handoff | >15% |
| Handoff → closed won | >25% |
| System uptime | 99.9% |

---

## 🎯 Next Immediate Steps

1. **Fix RLS policies** - Allow anon/service_role access
2. **Deploy extended schema** - All new tables
3. **Create browser automation service** - Separate Node.js service (not Vercel)
4. **Implement lead sourcing** - Start with Apollo/Hunter APIs
5. **Build outreach engine** - Email first, then WhatsApp/LinkedIn
6. **Enhance AI** - Add OpenAI for thinking engine
7. **Build scheduler** - pg_cron for workflows
8. **Dashboard real-time** - Supabase Realtime

---

**Ready to start Phase 1 fixes?**