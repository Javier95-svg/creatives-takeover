-- Add admin exception to chat_sessions DELETE RLS policy
-- This ensures admins can delete chat sessions, following the pattern used in other tables

-- Add policy for admins to delete any chat session
CREATE POLICY "Admins can delete any chat session"
ON public.chat_sessions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Note: The existing policy "Users can delete their own chat sessions" remains in place
-- This allows both regular users to delete their own chats AND admins to delete any chat

