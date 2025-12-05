-- Add DELETE policy for conversations
-- Users can delete conversations they are participants in

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
    AND tablename='conversations' 
    AND policyname='conversations_delete_participant'
  ) THEN
    CREATE POLICY "conversations_delete_participant" ON public.conversations
      FOR DELETE USING ( auth.uid() = any(participants) );
  END IF;
END $$;

-- Add DELETE policy for messages
-- Users can delete messages in conversations they are participants in
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
    AND tablename='messages' 
    AND policyname='messages_delete_conversation_participant'
  ) THEN
    CREATE POLICY "messages_delete_conversation_participant" ON public.messages
      FOR DELETE USING (
        exists (
          select 1 from public.conversations c
          where c.id = conversation_id and auth.uid() = any(c.participants)
        )
      );
  END IF;
END $$;

