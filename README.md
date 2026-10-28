# LeadConnect - Production-Ready B2B Lead Generation System

> **Fully automated B2B lead generation system** that finds real leads, engages them via AI across WhatsApp/Email/LinkedIn, qualifies them, and hands off to humans for closing.

![LeadConnect Architecture](https://img.shields.io/badge/Architecture-Microservices-blue)
![Status](https://img.shields.io/badge/Status-Production_Ready-green)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)

---

## 🎯 What It Does

| Module | Capability |
|--------|------------|
| **🔍 Lead Sourcing** | Finds B2B decision-makers via Google, Apollo, Hunter, LinkedIn |
| **🧠 Lead Processing** | Dedup → Validate → Enrich → Score (0-100) → Segment (hot/warm/cold) |
| **📢 Outreach Engine** | Multi-channel sequences: Email + WhatsApp + LinkedIn |
| **🤖 AI Conversation** | GPT-4o-mini powered chat with thinking, context, document sharing |
| **🌐 Browser Automation** | Puppeteer-based WhatsApp Web & LinkedIn automation |
| **📊 Dashboard** | Real-time stats, lead kanban, campaign analytics |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LEADCONNECT MICROSERVICES                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │   LEAD       │    │   LEAD       │    │   OUTREACH   │    │  AI      │  │
│  │   SOURCING   │───▶│   PROCESSING │───▶│   ENGINE     │───▶│  CHAT    │  │
│  │   :3002      │    │   (Supabase) │    │   :3003      │    │  :3004   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────┘  │
│         │                                       ▲                  │       │
│         ▼                                       │                  ▼       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    BROWSER AUTOMATION :3001                          │  │
│  │  Puppeteer Cluster │ WhatsApp Web │ LinkedIn │ Session Persistence  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    SUPABASE (PostgreSQL + Realtime + Storage)        │  │
│  │  leads │ conversations │ documents │ outreach_logs │ browser_sessions│  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- **Docker Desktop** installed and running
- **Supabase account** (free tier works)
- **OpenAI API key** (for AI chat)
- **Gmail App Password** (for email outreach)
- **API Keys** (optional but recommended): Apollo, Hunter, Google, Clearbit

### 1. Clone & Configure
```bash
cd lead-gen-system
cp .env.example .env
# Edit .env with your credentials
```

### 2. Start Everything
```bash
# Windows
start.bat prod

# Linux/Mac
chmod +x start.sh
./start.sh prod
```

### 3. Access Services
| Service | Local URL | Description |
|---------|-----------|-------------|
| **Main App** | http://localhost:3000 | Landing page, login, dashboard |
| **Browser Automation** | http://localhost:3001 | WhatsApp/LinkedIn control |
| **Lead Sourcing** | http://localhost:3002 | Lead finding APIs |
| **Outreach Engine** | http://localhost:3003 | Campaign management |
| **AI Engine** | http://localhost:3004 | Conversation APIs |

---

## 📋 Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anon key (publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key |
| `OPENAI_API_KEY` | ✅ | OpenAI API key for AI chat |
| `SMTP_USER` | ✅ | Gmail address for outreach |
| `SMTP_PASS` | ✅ | Gmail 16-char App Password |
| `APOLLO_API_KEY` | Optional | Apollo.io API key for lead sourcing |
| `HUNTER_API_KEY` | Optional | Hunter.io API key |
| `GOOGLE_API_KEY` | Optional | Google Custom Search API |
| `GOOGLE_CSE_ID` | Optional | Google Custom Search Engine ID |
| `CLEARBIT_API_KEY` | Optional | Clearbit enrichment API |

---

## 🗄️ Database Schema (Supabase)

Run `extended_schema.sql` in Supabase SQL Editor to create all tables:

```sql
-- Core tables: leads, conversations, documents, human_transfer_queue, outreach_logs
-- Extended: lead_sources, raw_leads, lead_enrichment, outreach_templates,
--           outreach_sequences, outreach_campaigns, outreach_contacts,
--           browser_sessions, ai_context, notifications
```

---

## 🔧 Service APIs

### Browser Automation (Port 3001)
```bash
# Initialize WhatsApp (QR code scan)
POST /whatsapp/init

# Send WhatsApp message
POST /whatsapp/send { "phone": "+919876543210", "message": "Hello!" }

# Initialize LinkedIn
POST /linkedin/init

# Send LinkedIn connection
POST /linkedin/connect { "profileUrl": "https://linkedin.com/in/...", "message": "Hi..." }

# Send LinkedIn message
POST /linkedin/message { "profileUrl": "...", "message": "Hello!" }
```

### Lead Sourcing (Port 3002)
```bash
# Run lead sourcing
POST /source/run { "source_id": "...", "keywords": "CEO", "locations": ["Delhi"], "titles": ["CEO", "Founder"] }

# Process pending raw leads
POST /source/process-pending

# Enrich lead
POST /enrich/:leadId
```

### Outreach Engine (Port 3003)
```bash
# Process outreach queue
POST /queue/process { "batch_size": 50 }

# Create campaign
POST /campaigns { "name": "Q1 Outreach", "sequence_id": "...", "segment_filter": {...} }

# Start campaign
POST /campaigns/:id/start

# Add leads to campaign
POST /campaigns/:id/leads { "lead_ids": ["...", "..."] }

# Create template
POST /templates { "name": "Initial Email", "channel": "email", "subject": "...", "body": "..." }

# Create sequence
POST /sequences { "name": "4-Touch Email", "channel": "email", "steps": [...] }
```

### AI Engine (Port 3004)
```bash
# Chat with AI
POST /chat { "message": "I need web development", "session_id": "abc123", "lead_id": "optional" }

# Get document
GET /documents/:category  # service_guide, pricing, case_study
```

---

## 🤖 AI Conversation Flow

```
User visits landing page
        │
        ▼
AI Chat opens: "Namaste! Main LeadConnect AI hoon..."
        │
        ▼
AI asks: "Aap kaunsa service business chalate hain?"
        │
        ▼
User: "Web development for restaurants"
        │
        ▼
AI thinks → detects service_interest → sends Service Guide PDF
        │
        ▼
AI asks: "Kaunsa region target hai?"
        │
        ▼
User: "Delhi NCR"
        │
        ▼
AI asks: "Target audience kaun hai?"
        │
        ▼
User: "Restaurant owners"
        │
        ▼
AI detects interest → offers human handoff
        │
        ▼
Lead → Human Transfer Queue → Sales team calls → Deal closed
```

---

## 📊 Lead Scoring & Segmentation

| Factor | Points |
|--------|--------|
| Verified email | +20 |
| Verified phone | +15 |
| Decision-maker title (CEO, CTO, Founder, Director, VP) | +20 |
| Target company size (11-1000 employees) | +15 |
| Target industry match | +10 |
| LinkedIn profile available | +10 |
| Company info available | +10 |

| Segment | Score Range | Action |
|---------|-------------|--------|
| **Hot** | 80-100 | Immediate outreach, high priority |
| **Warm** | 50-79 | Standard outreach sequence |
| **Cold** | 20-49 | Nurture sequence, lower frequency |
| **Nurture** | 0-19 | Long-term nurture, content only |

---

## 📈 Pipeline Stages

```
NEW → CONTACTED → ENGAGED → QUALIFIED → PROPOSAL → NEGOTIATION → CLOSED_WON
  │         │          │          │           │           │           │
  ▼         ▼          ▼          ▼           ▼           ▼           ▼
Import   1st touch   Replied    BANT       Sent       Discount    Contract
Lead     sent        + interest complete   proposal   talks       signed
                                                   
         │          │          │           │           │
         ▼          ▼          ▼           ▼           ▼
     NO_REPLY  NOT_INTERESTED UNQUALIFIED  STALLED   CLOSED_LOST
    (3 tries)  (explicit)   (no budget)  (30 days) (lost deal)
```

**Auto-transitions** happen via cron jobs.

---

## 🛡️ Security & Compliance

- **Rate Limits**: Email 10/day, WhatsApp 3/day, LinkedIn 5/day per lead
- **Opt-out**: Instant unsubscribe across all channels
- **Data Retention**: 90 days conversations, 1 year leads
- **GDPR/PDPB**: Right to deletion, data export endpoints
- **Anti-spam**: Domain warm-up, reputation monitoring
- **Browser Sessions**: Encrypted storage, auto-rotation

---

## 🚀 Deployment to Production

### Vercel (Frontend)
```bash
vercel --prod
# Add environment variables in Vercel dashboard
```

### Docker (Backend Services)
```bash
# Build and push
docker-compose build
docker-compose push

# Deploy to cloud (AWS ECS, Google Cloud Run, Azure Container Apps)
# Use docker-compose.yml as base
```

### Supabase
- Enable **pg_cron** for scheduled jobs
- Set up **Realtime** for dashboard updates
- Configure **Storage** for documents
- Enable **Auth** with email providers

---

## 📁 Project Structure

```
lead-gen-system/
├── public/                 # Frontend (served by main app)
│   ├── index.html          # Landing page (14 sections)
│   ├── login.html          # Login page
│   ├── signup.html         # Signup page
│   ├── dashboard.html      # Dashboard with tabs
│   ├── style.css           # 800+ lines polished CSS
│   └── script.js           # Modular JS (Toast, Loading, Validation, Modal, API, AIChat, Dashboard, Landing, Auth)
├── services/
│   ├── browser-automation/ # Puppeteer WhatsApp/LinkedIn
│   ├── lead-sourcing/      # Google/Apollo/Hunter sourcing
│   ├── outreach-engine/    # Email/WhatsApp/LinkedIn sequences
│   └── ai-engine/          # GPT-4o-mini chat engine
├── src/cron.js             # Cron scheduler
├── server.js               # Main Express server
├── docker-compose.yml      # Full stack orchestration
├── extended_schema.sql     # Complete DB schema
├── PRODUCTION_PLAN.md      # Detailed implementation plan
└── .env.example            # All environment variables
```

---

## 🧪 Testing

```bash
# Run all services locally
./start.sh dev

# Test APIs
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health

# Test AI chat
curl -X POST http://localhost:3004/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I need web development", "session_id": "test123"}'
```

---

## 📝 License

MIT License - Feel free to use for your business!

---

## 🤝 Support

- **Issues**: GitHub Issues
- **Docs**: `PRODUCTION_PLAN.md` for detailed implementation
- **Architecture**: See `PRODUCTION_PLAN.md` for full technical details

---

**Built with ❤️ for B2B sales teams who want to automate lead generation and focus on closing deals.**

🚀 **Ready to deploy? Run `./start.sh prod` and watch the magic happen!**