-- ============================================
-- Flowly: Saved Items / Reading Queue
-- ============================================

create table if not exists saved_items (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  title                 text not null default 'Untitled',
  source_url            text,
  source_type           text not null default 'url',  -- 'url', 'file', 'article', 'research', 'book'
  estimated_word_count  integer,
  status                text not null default 'queued',  -- 'queued', 'reading', 'completed'
  priority              integer not null default 0,
  added_at              timestamptz not null default now()
);

-- Index for user queue (ordered by priority)
create index idx_saved_items_user_queue on saved_items(user_id, status, priority desc, added_at desc);

-- Row Level Security
alter table saved_items enable row level security;

create policy "Users can view own saved items"
  on saved_items for select
  using (auth.uid() = user_id);

create policy "Users can create own saved items"
  on saved_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own saved items"
  on saved_items for update
  using (auth.uid() = user_id);

create policy "Users can delete own saved items"
  on saved_items for delete
  using (auth.uid() = user_id);
