-- ============================================
-- Flowly: Reading Sessions & Notes Tables
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. reading_sessions table
-- ============================================
create table if not exists reading_sessions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null default 'Untitled',
  source_type   text not null default 'sample',   -- 'url', 'file', 'sample'
  source_url    text,
  content_text  text not null,
  word_count    integer not null default 0,
  current_position integer not null default 0,
  completed     boolean not null default false,
  time_spent_seconds integer not null default 0,
  average_wpm   integer,
  created_at    timestamptz not null default now(),
  last_read_at  timestamptz not null default now()
);

-- Index for fast user lookups (recent first)
create index idx_sessions_user_recent on reading_sessions(user_id, last_read_at desc);
-- Index for incomplete sessions (resume reading)
create index idx_sessions_user_incomplete on reading_sessions(user_id, completed, last_read_at desc);

-- ============================================
-- 2. notes table
-- ============================================
create table if not exists notes (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  session_id    uuid not null references reading_sessions(id) on delete cascade,
  note_text     text not null,
  word_position integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Index for fetching notes by session
create index idx_notes_session on notes(session_id, word_position);
-- Index for fetching all user notes
create index idx_notes_user on notes(user_id, created_at desc);

-- ============================================
-- 3. Row Level Security (RLS)
-- ============================================

-- Enable RLS on both tables
alter table reading_sessions enable row level security;
alter table notes enable row level security;

-- reading_sessions: users can only see/modify their own sessions
create policy "Users can view own sessions"
  on reading_sessions for select
  using (auth.uid() = user_id);

create policy "Users can create own sessions"
  on reading_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on reading_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on reading_sessions for delete
  using (auth.uid() = user_id);

-- notes: users can only see/modify their own notes
create policy "Users can view own notes"
  on notes for select
  using (auth.uid() = user_id);

create policy "Users can create own notes"
  on notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notes"
  on notes for update
  using (auth.uid() = user_id);

create policy "Users can delete own notes"
  on notes for delete
  using (auth.uid() = user_id);
