-- Extended Production Schema for LeadConnect
-- Run this in Supabase SQL Editor or via Management API

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";

-- ========================================
-- LEAD SOURCING TABLES
-- ========================================
create table if not exists lead_sources (
  id uuid primary key default uuid_generate_v4(),
  name text not null, -- 'google_search', 'linkedin', 'apollo', 'hunter', 'csv_import'
  config jsonb default '{}', -- API keys, search params
  status text default 'active', -- active, paused, error
  last_run timestamp with time zone,
  leads_found integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists raw_leads (
  id uuid primary key default uuid_generate_v4(),
  source_id uuid references lead_sources(id),
  raw_data jsonb not null, -- Original scraped data
  status text default 'pending', -- pending, processed, failed, duplicate
  error_message text,
  created_at timestamp with time zone default now(),
  processed_at timestamp with time zone
);

-- ========================================
-- LEAD ENRICHMENT
-- ========================================
create table if not exists lead_enrichment (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete cascade,
  provider text not null, -- 'clearbit', 'hunter', 'apollo', 'linkedin', 'manual'
  data jsonb not null,
  confidence integer default 50, -- 0-100
  created_at timestamp with time zone default now()
);

-- ========================================
-- OUTREACH SEQUENCES & CAMPAIGNS
-- ========================================
create table if not exists outreach_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  channel text not null, -- 'email', 'whatsapp', 'linkedin'
  subject text, -- for email
  body text not null, -- template with {{variables}}
  variables jsonb default '[]', -- list of available variables
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists outreach_sequences (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  channel text not null, -- 'email', 'whatsapp', 'linkedin'
  steps jsonb not null, -- [{day: 1, template_id}, {day: 3, template_id}, ...]
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists outreach_campaigns (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sequence_id uuid references outreach_sequences(id),
  segment_filter jsonb default '{}', -- {status: ['new'], segment: ['hot'], min_score: 50}
  schedule_cron text default '0 9 * * 1-5', -- 9am weekdays
  status text default 'draft', -- draft, running, paused, completed
  stats jsonb default '{"sent": 0, "replied": 0, "bounced": 0}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists outreach_contacts (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid references outreach_campaigns(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  current_step integer default 0,
  status text default 'pending', -- pending, sent, replied, bounced, unsubscribed, paused, failed
  next_send_at timestamp with time zone,
  last_sent_at timestamp with time zone,
  reply_received_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(campaign_id, lead_id)
);

-- ========================================
-- BROWSER AUTOMATION SESSIONS
-- ========================================
create table if not exists browser_sessions (
  id uuid primary key default uuid_generate_v4(),
  channel text not null, -- 'whatsapp', 'linkedin'
  profile_data jsonb default '{}', -- cookies, localStorage, etc.
  status text default 'active', -- active, expired, error, warming
  last_used timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ========================================
-- AI CONVERSATION CONTEXT
-- ========================================
create table if not exists ai_context (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete cascade,
  session_id text not null,
  context jsonb default '{}', -- {stage, extracted_info, documents_sent, objections, next_actions, qualification}
  updated_at timestamp with time zone default now(),
  unique(lead_id, session_id)
);

-- ========================================
-- NOTIFICATIONS
-- ========================================
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid, -- admin/sales user
  type text not null, -- 'human_transfer', 'lead_reply', 'meeting_booked', 'deal_closed', 'campaign_complete'
  title text not null,
  message text,
  data jsonb default '{}',
  read boolean default false,
  created_at timestamp with time zone default now()
);

-- ========================================
-- UPDATE EXISTING TABLES WITH NEW COLUMNS
-- ========================================
alter table leads add column if not exists title text;
alter table leads add column if not exists company_size text;
alter table leads add column if not exists website text;
alter table leads add column if not exists linkedin_url text;
alter table leads add column if not exists raw_source_id uuid references raw_leads(id);
alter table leads add column if not exists enrichment_status text default 'pending'; -- pending, enriched, failed
alter table leads add column if not exists last_activity_at timestamp with time zone;
alter table leads add column if not exists next_followup_at timestamp with time zone;
alter table leads add column if not exists qualification jsonb default '{}'; -- BANT data
alter table leads add column if not exists tags text[] default '{}';

alter table conversations add column if not exists channel text default 'web'; -- web, whatsapp, email, linkedin
alter table conversations add column if not exists direction text default 'inbound'; -- inbound, outbound
alter table conversations add column if not exists metadata jsonb default '{}';

alter table outreach_logs add column if not exists campaign_id uuid references outreach_campaigns(id);
alter table outreach_logs add column if not exists template_id uuid references outreach_templates(id);
alter table outreach_logs add column if not exists sequence_step integer;
alter table outreach_logs add column if not exists tracking_id text; -- for open/click tracking

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
create index if not exists idx_leads_status on leads(status);
alter table leads add column if not exists segment text;
create index if not exists idx_leads_segment on leads(segment);
create index if not exists idx_leads_email on leads(email);
create index if not exists idx_leads_phone on leads(phone);
create index if not exists idx_leads_company on leads(company);
create index if not exists idx_leads_created_at on leads(created_at desc);
create index if not exists idx_conversations_lead_id on conversations(lead_id);
create index if not exists idx_conversations_session_id on conversations(session_id);
create index if not exists idx_outreach_contacts_campaign on outreach_contacts(campaign_id);
create index if not exists idx_outreach_contacts_next_send on outreach_contacts(next_send_at) where status = 'pending';
create index if not exists idx_browser_sessions_channel on browser_sessions(channel);
create index if not exists idx_ai_context_lead_id on ai_context(lead_id);
create index if not exists idx_notifications_user_id on notifications(user_id) where read = false;

-- ========================================
-- RLS POLICIES (permissive for development)
-- ========================================
alter table lead_sources enable row level security;
alter table raw_leads enable row level security;
alter table lead_enrichment enable row level security;
alter table outreach_templates enable row level security;
alter table outreach_sequences enable row level security;
alter table outreach_campaigns enable row level security;
alter table outreach_contacts enable row level security;
alter table browser_sessions enable row level security;
alter table ai_context enable row level security;
alter table notifications enable row level security;

create policy "Public access" on lead_sources for all using (true) with check (true);
create policy "Public access" on raw_leads for all using (true) with check (true);
create policy "Public access" on lead_enrichment for all using (true) with check (true);
create policy "Public access" on outreach_templates for all using (true) with check (true);
create policy "Public access" on outreach_sequences for all using (true) with check (true);
create policy "Public access" on outreach_campaigns for all using (true) with check (true);
create policy "Public access" on outreach_contacts for all using (true) with check (true);
create policy "Public access" on browser_sessions for all using (true) with check (true);
create policy "Public access" on ai_context for all using (true) with check (true);
create policy "Public access" on notifications for all using (true) with check (true);

-- ========================================
-- SAMPLE DATA
-- ========================================
insert into outreach_templates (name, channel, subject, body, variables) values
  ('Initial Email', 'email', 'Quick question about {{company}}', 'Hi {{name}},\n\nI noticed {{company}} is in the {{industry}} space. We help companies like yours with {{service}}.\n\nWould you be open to a brief chat?\n\nBest,\n{{sender_name}}', '["name", "company", "industry", "service", "sender_name"]'),
  ('Follow-up Email', 'email', 'Re: {{company}}', 'Hi {{name}},\n\nJust following up on my previous note. Happy to share a quick case study if helpful.\n\nLet me know!\n\n{{sender_name}}', '["name", "company", "sender_name"]'),
  ('WhatsApp Initial', 'whatsapp', '', 'Hi {{name}}! 👋 This is {{sender_name}} from LeadConnect. We help {{industry}} companies like {{company}} find more clients through AI-powered outreach. Interested in a quick chat?', '["name", "company", "industry", "sender_name"]'),
  ('LinkedIn Connect', 'linkedin', '', 'Hi {{name}}, I came across {{company}} and thought we could help with {{service}}. Would you be open to connecting?', '["name", "company", "service"]');

insert into outreach_sequences (name, channel, steps) values
  ('Email Sequence - 4 Touch', 'email', '[{"day": 0, "template": "Initial Email"}, {"day": 2, "template": "Follow-up Email"}, {"day": 5, "template": "Follow-up Email"}, {"day": 10, "template": "Follow-up Email"}]');

-- Enable pg_cron for scheduled jobs
-- Note: Run this in SQL Editor as superuser
-- select cron.schedule('process-outreach-queue', '*/15 * * * *', 'SELECT process_outreach_queue();');
-- select cron.schedule('update-lead-statuses', '0 * * * *', 'SELECT update_lead_statuses();');
-- select cron.schedule('browser-health-check', '*/5 * * * *', 'SELECT check_browser_sessions();');