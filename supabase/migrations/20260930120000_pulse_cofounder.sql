-- Pulse as a co-founder: answer ratings, founder-confirmed memory, and daily
-- "Pulse noticed" insights. All three are owned by one user; clients read and
-- write their own rows under RLS, and the Pulse endpoint (service role) writes
-- insights after owner checks.

-- 1. Thumbs up/down on individual Pulse answers.
CREATE TABLE IF NOT EXISTS public.pulse_message_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The conversation's session_id (text, like chatbot_conversations.session_id), which is what the client holds.
  session_id text NOT NULL CHECK (char_length(session_id) BETWEEN 1 AND 64),
  turn_id text NOT NULL CHECK (char_length(turn_id) BETWEEN 1 AND 64),
  rating smallint NOT NULL CHECK (rating IN (-1, 1)),
  -- Model and depth are on the answer's metadata (chatbot_messages, same turn_id).
  reason text CHECK (reason IS NULL OR reason IN ('wrong', 'generic', 'not_actionable', 'other')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, turn_id)
);
ALTER TABLE public.pulse_message_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pulse_message_feedback_owner ON public.pulse_message_feedback;
CREATE POLICY pulse_message_feedback_owner ON public.pulse_message_feedback
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.chatbot_conversations c
    WHERE c.session_id = pulse_message_feedback.session_id AND c.user_id = auth.uid() AND c.purpose = 'pulse_home'
  ));

-- 2. Memories the founder confirmed: decisions, hypotheses, commitments, facts.
CREATE TABLE IF NOT EXISTS public.pulse_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('decision', 'hypothesis', 'commitment', 'fact')),
  text text NOT NULL CHECK (char_length(btrim(text)) BETWEEN 3 AND 280),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'dropped', 'superseded')),
  due_on date,
  source_turn_id text CHECK (source_turn_id IS NULL OR char_length(source_turn_id) <= 64),
  last_asked_on date,
  last_referenced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (due_on IS NULL OR kind = 'commitment')
);
CREATE INDEX IF NOT EXISTS pulse_memories_lookup ON public.pulse_memories (user_id, project_id, status);
ALTER TABLE public.pulse_memories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pulse_memories_owner ON public.pulse_memories;
CREATE POLICY pulse_memories_owner ON public.pulse_memories
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND (project_id IS NULL OR EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()
  )));

-- 3. "Pulse noticed": at most one generated set per user, project and day.
CREATE TABLE IF NOT EXISTS public.pulse_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  day date NOT NULL,
  insights jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(insights) = 'array'),
  dismissed text[] NOT NULL DEFAULT '{}',
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- One row per user, project (or account) and day; NULL project counts as one scope.
CREATE UNIQUE INDEX IF NOT EXISTS pulse_insights_once_a_day
  ON public.pulse_insights (user_id, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid), day);
ALTER TABLE public.pulse_insights ENABLE ROW LEVEL SECURITY;
-- Clients read their insights and may only change which ones are dismissed.
DROP POLICY IF EXISTS pulse_insights_owner_read ON public.pulse_insights;
CREATE POLICY pulse_insights_owner_read ON public.pulse_insights
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS pulse_insights_owner_dismiss ON public.pulse_insights;
CREATE POLICY pulse_insights_owner_dismiss ON public.pulse_insights
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
REVOKE UPDATE ON public.pulse_insights FROM authenticated;
GRANT UPDATE (dismissed) ON public.pulse_insights TO authenticated;
