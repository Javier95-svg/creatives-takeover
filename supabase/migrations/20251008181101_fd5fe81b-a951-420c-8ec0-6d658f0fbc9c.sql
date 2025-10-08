-- Create storage bucket for chatbot attachments
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chatbot-attachments',
  'chatbot-attachments',
  false,
  20971520, -- 20MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv', 'text/plain', 'text/markdown'
  ]
);

-- RLS policies for storage bucket
create policy "Users can upload their attachments"
on storage.objects for insert
with check (
  bucket_id = 'chatbot-attachments' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can view their attachments"
on storage.objects for select
using (
  bucket_id = 'chatbot-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their attachments"
on storage.objects for delete
using (
  bucket_id = 'chatbot-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Create chatbot_attachments table
create table if not exists chatbot_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  conversation_id uuid references chatbot_conversations,
  message_id uuid references chatbot_messages,
  file_name text not null,
  file_type text not null,
  file_size bigint not null,
  storage_path text not null,
  extracted_text text,
  ai_analysis jsonb,
  thumbnail_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table chatbot_attachments enable row level security;

-- RLS policies for attachments table
create policy "Users can manage their attachments"
on chatbot_attachments for all
using (auth.uid() = user_id);

-- Indexes
create index idx_attachments_conversation on chatbot_attachments(conversation_id);
create index idx_attachments_user on chatbot_attachments(user_id);
create index idx_attachments_message on chatbot_attachments(message_id);