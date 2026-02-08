-- ============================================
-- Flowly: Feedback Table
-- ============================================

create table if not exists feedback (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  feedback_type   text not null check (feedback_type in ('bug', 'feature', 'general')),
  message         text not null,
  user_email      text,
  page_url        text not null,
  browser_info    jsonb,
  created_at      timestamptz default now(),
  status          text default 'new' check (status in ('new', 'reviewed'))
);

create index idx_feedback_status on feedback(status, created_at desc);
create index idx_feedback_user on feedback(user_id, created_at desc);

alter table feedback enable row level security;

-- Anyone (even unauthenticated) can submit feedback
create policy "Users can insert feedback"
  on feedback for insert
  with check (true);

-- Only admin can view all feedback
create policy "Admin can view all feedback"
  on feedback for select
  using (auth.uid() = 'f92d64ab-8ad3-4dfb-87e8-8f960e4a9c76'::uuid);

create policy "Admin can update feedback"
  on feedback for update
  using (auth.uid() = 'f92d64ab-8ad3-4dfb-87e8-8f960e4a9c76'::uuid);
