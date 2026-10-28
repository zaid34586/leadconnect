# 🚀 LeadConnect — Complete Deployment Guide

Ye guide follow karke aap apne GitHub, Supabase, aur Vercel par setup complete kar sakte hain.

---

## 📋 Prerequisites (Aapke paas hona chahiye)

1. **GitHub account** — https://github.com
2. **Supabase account** — https://supabase.com (free tier)
3. **Vercel account** — https://vercel.com
4. **Gmail account** — email sending ke liye (App Password)

---

## Step 1: Supabase Setup (Database + Storage)

### 1.1 Project Banayein
1. [supabase.com](https://supabase.com) par login karein
2. **New Project** click karein
3. Project Name: `leadconnect`
4. Database Password set karein (yaad rakhein)
5. Region select karein (jis ke paas aapka audience ho)
6. **Create New Project** click karein

### 1.2 Database Schema Run Karein
1. Supabase dashboard mein **SQL Editor** par jayein
2. `schema.sql` file ka poora content copy karein
3. SQL Editor mein paste karke **Run** click karein

Ye tables ban jayenge:
- `leads` — sab customer leads
- `conversations` — AI chat history
- `documents` — PDF file details
- `human_transfer_queue` — sales team ke liye queue
- `outreach_logs` — kaun se lead ko kab contact kiya

### 1.3 Storage Bucket Banayein (Documents ke liye)
1. Supabase dashboard mein **Storage** par jayein
2. **New Bucket** click karein
3. Bucket name: `documents`
4. **Public bucket** check karein (har koi document dekh sake)
5. **Create Bucket**

### 1.4 PDF Documents Upload Karein
Storage `documents` bucket mein ye files upload karein:
- `service-guide.pdf` — aapki services ki detail
- `pricing.pdf` — pricing plans
- `case-study.pdf` — client success story

### 1.5 Documents Table Mein Entries Daalein
SQL Editor mein ye run karein (apne Supabase URL ke hisaab se `file_url` update karein):

```sql
insert into documents (title, description, file_url, file_type, category) values
  ('Service Guide', 'Complete guide to our B2B services', 'https://YOUR-PROJECT.supabase.co/storage/v1/object/public/documents/service-guide.pdf', 'pdf', 'service_guide'),
  ('Pricing Sheet', 'Pricing plans and packages', 'https://YOUR-PROJECT.supabase.co/storage/v1/object/public/documents/pricing.pdf', 'pdf', 'pricing'),
  ('Case Study', 'Client success story', 'https://YOUR-PROJECT.supabase.co/storage/v1/object/public/documents/case-study.pdf', 'pdf', 'case_study');
```

### 1.6 Supabase API Keys Copy Karein
1. **Settings → API** par jayein
2. Copy karein:
   - **Project URL** → `https://xxxx.supabase.co`
   - **anon public** key → `eyJ...`
   - **service_role** key → `eyJ...` (secret, kisi ko na batayein)

---

## Step 2: Gmail App Password (Email ke liye)

Nodemailer email bhejta hai. Gmail ke liye App Password chahiye:

1. Apne Google Account mein jayein: https://myaccount.google.com
2. **Security** → **2-Step Verification** ON karein (agar pehle se nahi hai)
3. **Security** → **App passwords** par jayein
4. Select app: **Mail**, Select device: **Other** → `LeadConnect`
5. Generate karein — 16 character ka password milega
6. Ye password `.env` mein `EMAIL_PASS` ke taare me daalna hai

---

## Step 3: Local Environment Setup

Aapke computer pe ye folder hai: `C:\Users\mz712\lead-gen-system`

### 3.1 .env File Banayein

`.env.example` copy karke `.env` banayein:

```powershell
# PowerShell mein
Copy-Item .env.example .env
```

Phir `.env` file kholein aur ye values daalein:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_character_app_password
OPENAI_API_KEY=sk-...  # Optional — agar real AI chahiye toh
PORT=3000
NODE_ENV=development
```

### 3.2 Dependencies Install Karein

```powershell
cd C:\Users\mz712\lead-gen-system
npm install
```

### 3.3 Local Test Karein

```powershell
npm start
```

Browser mein kholein: `http://localhost:3000`

Check karein:
- Landing page load hoti hai?
- AI chat widget kaam karta hai?
- Lead form submit hota hai?

---

## Step 4: GitHub Push

### 4.1 GitHub Repository Banayein

1. [github.com](https://github.com) par login karein
2. **New repository** click karein
3. Repository name: `leadconnect`
4. **Public** select karein
5. **Initialize with README** — NO (pehle se files hain)
6. **Create repository**

### 4.2 Local Git Init Aur Push

Terminal mein (PowerShell):

```powershell
cd C:\Users\mz712\lead-gen-system

# Git initialize karein
git init

# Branch rename karein
git branch -M main

# Remote add karein (YOUR_USERNAME apne GitHub username se badlein)
git remote add origin https://github.com/YOUR_USERNAME/leadconnect.git

# Files add karein
git add .

# Commit karein
git commit -m "Initial commit - LeadConnect AI MVP with chat, documents, outreach"

# Push karein
git push -u origin main
```

Agar push mein error aaye toh:
- GitHub personal access token chahiye hoga (Settings → Developer settings → Personal access tokens)

---

## Step 5: Vercel Deployment

### 5.1 Vercel Connect Karein

1. [vercel.com](https://vercel.com) par login karein (GitHub se)
2. **Add New → Project** click karein
3. Apni `leadconnect` repository import karein
4. **Import** click karein

### 5.2 Environment Variables Set Karein

Vercel project settings mein **Environment Variables** section mein ye add karein:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://your-project-id.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJ...` (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (service role key) |
| `EMAIL_USER` | `your_email@gmail.com` |
| `EMAIL_PASS` | `your_16_character_app_password` |
| `OPENAI_API_KEY` | `sk-...` (optional) |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |

### 5.3 Deploy Karein

- **Deploy** click karein
- Vercel apni site build karega
- Deployment complete hone par URL milega: `https://leadconnect.vercel.app`

---

## Step 6: Verify Deployment

Apni live site kholein aur check karein:

1. ✅ Landing page load hoti hai (14 sections)
2. ✅ AI chat widget bottom-right mein dikhta hai
3. ✅ Chat message bhejne par response aata hai
4. ✅ Lead form submit hota hai
5. ✅ Document sharing kaam karta hai
6. ✅ Supabase mein leads save hoti hain (dashboard mein check karein)

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Build fail ho raha hai | `package.json` mein `start` script check karein |
| API error aata hai | `.env` variables check karein (Vercel mein bhi) |
| Email nahi ja raha | Gmail App Password verify karein |
| Supabase connection error | URL aur keys check karein |
| Document nahi load ho raha | Storage bucket public hai ya nahi check karein |

---

## 📞 Support

Agar koi error aaye toh:
1. Vercel dashboard mein **Functions → Logs** check karein
2. Browser console (F12) mein JavaScript errors check karein
3. Supabase dashboard mein **Table Editor** se data verify karein

---

## ✅ Deployment Complete Checklist

- [ ] Supabase project banaya
- [ ] `schema.sql` run kiya
- [ ] Storage bucket `documents` banaya
- [ ] PDF files upload ki
- [ ] Documents table mein entries daali
- [ ] Supabase API keys copy ki
- [ ] Gmail App Password generate kiya
- [ ] `.env` file local mein banayi
- [ ] `npm install` kiya
- [ ] Local `npm start` test kiya
- [ ] GitHub repository banaya
- [ ] Code push kiya GitHub par
- [ ] Vercel par project import kiya
- [ ] Environment variables set kiye Vercel mein
- [ ] Deploy kiya
- [ ] Live site verify ki

---

**Aapka LeadConnect AI system live ho jayega!** 🎉

Agar koi step mein phans jayein toh mujhe batayein, main us specific step mein madad karunga.