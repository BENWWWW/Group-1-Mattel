-- Add is_read column to chat_messages table
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
