# LeadConnect — AI B2B Lead Finder + Client Outreach System

Ek complete AI system jo:
1. **B2B Leads dhoondhta hai** (website par AI chat se)
2. **Customer se baat karta hai** (AI thinking engine)
3. **Service detail batata hai** aur requirement samajhta hai
4. **Documents/PDF bhejta hai** customer ko (service guide, pricing, case study)
5. **WhatsApp, Email, LinkedIn se contact karta hai** (outreach)
6. **Interested leads ko human sales ko transfer karta hai**

---

## 📁 Folder Structure

```
lead-gen-system/
├── index.html            # Landing page (14 sections + AI chat widget)
├── style.css             # Custom styles
├── script.js             # Frontend logic + AI chat integration
├── server.js             # Express backend (AI chat, leads, outreach, documents)
├── supabase-client.js    # Supabase client config
├── schema.sql            # Supabase database schema
├── package.json          # Node.js dependencies
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore
├── vercel.json           # Vercel deployment config
└── README.md             # Setup instructions
```

---

## 🗄️ Step 1: Supabase Setup (Database + Storage)

1. [supabase.com](https://supabase.com) par jayein aur account banayein.
2. **New Project** banayein (project name: leadconnect).
3. **SQL Editor** mein jayein aur `schema.sql` ka poora content copy-paste karke **Run** karein.
4. **Storage** section mein jayein aur ek bucket banayein: `documents` (public).
5. Apne PDF documents upload karein:
   - `service-guide.pdf` — service detail
   - `pricing.pdf` — pricing sheet
   - `case-study.pdf` — success story
6. **Settings → API** se ye copy karein:
   - Project URL → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

7. Supabase mein documents table mein entries daalein (ya SQL editor mein):

```sql
insert into documents (title, description, file_url, file_type, category) values
  ('Service Guide', 'Complete guide to our B2B services', 'https://your-project.supabase.co/storage/v1/object/public/documents/service-guide.pdf', 'pdf', 'service_guide'),
  ('Pricing Sheet', 'Pricing plans and packages', 'https://your-project.supabase.co/storage/v1/object/public/documents/pricing.pdf', 'pdf', 'pricing'),
  ('Case Study', 'Client success story', 'https://your-project.supabase.co/storage/v1/object/public/documents/case-study.pdf', 'pdf', 'case_study');
```

---

## ⚙️ Step 2: Local Setup

```bash
# Folder mein jayein
cd C:\Users\mz712\lead-gen-system

# Dependencies install karein
npm install

# .env file banayein
copy .env.example .env
```

`.env` file mein apni credentials daalein:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
OPENAI_API_KEY=your_openai_api_key  # Optional — for real AI
PORT=3000
```

Local server chalaayein:

```bash
npm start
```

Browser mein kholein: `http://localhost:3000`

---

## 🐙 Step 3: GitHub Push

```bash
git init
git remote add origin https://github.com/apni-username/leadconnect.git
git add .
git commit -m "Initial commit - LeadConnect AI MVP"
git branch -M main
git push -u origin main
```

---

## 🚀 Step 4: Vercel Deployment

1. [vercel.com](https://vercel.com) par jayein aur GitHub se connect karein.
2. `leadconnect` repo import karein.
3. **Environment Variables** add karein (`.env` se):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `EMAIL_USER`
   - `EMAIL_PASS`
   - `OPENAI_API_KEY` (optional)
4. **Deploy** click karein.

Live site: `https://leadconnect.vercel.app`

---

## 🤖 AI Chat Flow (Customer Journey)

```
Visitor opens AI chat
    ↓
AI: "Namaste! Main LeadConnect AI hoon. Aap kaunsa service business chalate hain?"
    ↓
User: "Web development for restaurants"
    ↓
AI [Thinking]: Service matched = Web Development, Industry = Restaurants
    ↓
AI: "Great! Web development for restaurants. Main aapko service guide PDF bhej raha hoon. Kaunsa region target hai?"
    ↓
[AI sends Service Guide PDF document]
    ↓
User: "Delhi NCR"
    ↓
AI: "Perfect! Aapka target audience kaun hai?"
    ↓
User: "Restaurant owners"
    ↓
AI: "Dhanyavad! Main aapki details save kar raha hoon. Kya aap human sales agent se baat karna chahenge?"
    ↓
[User clicks Yes → Human Transfer Queue → Sales team calls]
```

---

## 🧠 AI Thinking Engine

Backend (`server.js`) mein `aiThink()` function hota hai jo:
- User ke message ka **intent** detect karta hai (service, pricing, document, human transfer)
- Service match karta hai (Web Development, Digital Marketing, App Development, SEO)
- **Missing info** identify karta hai (service, audience, region)
- **Document suggest** karta hai (service guide ya pricing PDF)
- **Human transfer** suggest karta hai agar user interested ho

---

## 📄 Document Sharing

AI chat conversation ke dauran customer ko ye bhej sakta hai:
- **Service Guide PDF** — saari services ki detail
- **Pricing Sheet** — sab plans ke rates
- **Case Study** — purane clients ki success story

Document modal mein open hota hai aur download kar sakte hain.

---

## 📞 Outreach Channels

| Channel | Kaise kaam karta hai |
|---------|---------------------|
| **WhatsApp** | WhatsApp Web link generate (wa.me) ya Business API |
| **Email** | SMTP se personalized email (Nodemailer) |
| **LinkedIn** | Message template generate, manual connect |

Dashboard se lead ko select karke kisi bhi channel se contact kiya ja sakta hai.

---

## 👥 Human Transfer

Jab AI customer ko interested paata hai:
1. Lead ko `human_transfer_queue` mein add karta hai
2. Lead status `human_transfer` ho jata hai
3. Sales team `/api/human-transfer` endpoint se queue dekh sakti hai
4. Sales agent lead ko call/chat karke deal close karta hai

---

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/leads` | GET | Sab leads dekhna |
| `/api/leads` | POST | Naya lead create karna |
| `/api/leads/:id` | PATCH | Lead update karna |
| `/api/chat` | POST | AI chat message send karna |
| `/api/conversations/:sessionId` | GET | Chat history dekhna |
| `/api/documents` | GET | Sab documents dekhna |
| `/api/documents` | POST | Naya document add karna |
| `/api/send-email` | POST | Email bhejna |
| `/api/whatsapp-link` | POST | WhatsApp link generate |
| `/api/linkedin-template` | POST | LinkedIn message template |
| `/api/human-transfer` | POST/GET | Human transfer queue |

---

## 🛠️ Tech Stack

| Part | Tech |
|------|------|
| Frontend | HTML + Tailwind CSS + Vanilla JS |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| File Storage | Supabase Storage |
| Email | Nodemailer (SMTP) |
| AI Chat | Rule-based thinking engine (OpenAI ready) |
| Hosting | Vercel |
| Code | GitHub |

---

## 📝 License

MIT

---

**Banane wala:** LeadConnect Team  
**Shuru:** Kal se  
**Status:** MVP Ready 🚀
