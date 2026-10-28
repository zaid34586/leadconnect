-- Supabase Database Schema for LeadConnect AI System
-- Run this in your Supabase SQL Editor

create extension if not exists "uuid-ossp";

-- Leads table
create table if not exists leads (
  id uuid default uuid_generate_v4() primary key,
  name text,
  email text,
  phone text,
  company text,
  industry text,
  target_audience text,
  region text,
  service_interest text,
  service_details text,           -- AI ne ye details save ki user se
  budget text,
  timeline text,
  message text,
  status text default 'new',      -- new, contacted, interested, ai_talking, human_transfer, closed, do_not_contact
  lead_score integer default 0,
  source text default 'website',
  outreach_channel text,
  contacted_at timestamp with time zone,
  ai_context jsonb default '{}',  -- AI ne yaad rakhiya information
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Conversations table (AI chat history with context)
create table if not exists conversations (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references leads(id) on delete cascade,
  session_id text,
  message text,
  sender text default 'user',     -- user, ai, human
  ai_thinking text,               -- AI ne kya socha response dene se pehle
  created_at timestamp with time zone default now()
);

-- Documents / Resources table (PDF, files jo AI customer ko bhej sakta hai)
create table if not exists documents (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  file_url text not null,         -- Supabase storage URL ya external link
  file_type text default 'pdf',   -- pdf, doc, image, link
  category text,                  -- service_guide, pricing, case_study, brochure
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- Human transfer queue
create table if not exists human_transfer_queue (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references leads(id) on delete cascade,
  reason text default 'interested',
  assigned_to text,
  status text default 'pending',  -- pending, assigned, completed
  created_at timestamp with time zone default now()
);

-- Outreach log (kaun se lead ko kab kaun se channel se contact kiya)
create table if not exists outreach_logs (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references leads(id) on delete cascade,
  channel text,                   -- whatsapp, email, linkedin
  message text,
  status text default 'sent',     -- sent, delivered, read, replied, failed
  sent_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table leads enable row level security;
alter table conversations enable row level security;
alter table documents enable row level security;
alter table human_transfer_queue enable row level security;
alter table outreach_logs enable row level security;

-- Policies
create policy "Public can insert leads" on leads for insert with check (true);
create policy "Public can read leads" on leads for select using (true);
create policy "Public can update leads" on leads for update using (true);

create policy "Public can insert conversations" on conversations for insert with check (true);
create policy "Public can read conversations" on conversations for select using (true);

create policy "Public can read documents" on documents for select using (true);
create policy "Public can insert documents" on documents for insert with check (true);

create policy "Public can insert human_transfer_queue" on human_transfer_queue for insert with check (true);
create policy "Public can read human_transfer_queue" on human_transfer_queue for select using (true);

create policy "Public can insert outreach_logs" on outreach_logs for insert with check (true);
create policy "Public can read outreach_logs" on outreach_logs for select using (true);

-- Sample documents insert (aapko Supabase storage mein file upload karni hogi)
-- insert into documents (title, description, file_url, file_type, category) values
--   ('Service Guide', 'Complete guide to our services', 'https://your-supabase.co/storage/v1/object/public/docs/service-guide.pdf', 'pdf', 'service_guide'),
--   ('Pricing Sheet', 'Pricing plans and packages', 'https://your-supabase.co/storage/v1/object/public/docs/pricing.pdf', 'pdf', 'pricing'),
--   ('Case Study', 'Success story with client', 'https://your-supabase.co/storage/v1/object/public/docs/case-study.pdf', 'pdf', 'case_study');
