-- ============================================
-- Flowly: Error Tracking Table
-- ============================================

create table if not exists errors (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  error_message   text not null,
  error_stack     text,
  page_url        text not null,
  component_name  text,
  user_agent      text,
  browser_info    jsonb,
  occurred_at     timestamptz default now(),
  resolved        boolean default false
);

create index idx_errors_user on errors(user_id, occurred_at desc);
create index idx_errors_resolved on errors(resolved, occurred_at desc);

alter table errors enable row level security;

-- Anyone can insert errors (logged in users — user_id is captured automatically)
create policy "Authenticated users can insert errors"
  on errors for insert
  with check (auth.uid() is not null);

-- Admin can view all errors
-- IMPORTANT: Replace 'YOUR_USER_ID_HERE' with your actual user ID from Supabase Auth
create policy "Admin can view all errors"
  on errors for select
  using (auth.uid() = 'f92d64ab-8ad3-4dfb-87e8-8f960e4a9c76'::uuid);

-- Admin can update errors (mark resolved)
create policy "Admin can update errors"
  on errors for update
  using (auth.uid() = 'f92d64ab-8ad3-4dfb-87e8-8f960e4a9c76'::uuid);
