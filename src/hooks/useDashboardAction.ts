import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { dashboardSnapshotQueryKey } from '@/contexts/DashboardDataContext';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardAction, DashboardSnapshotV1 } from '@/types/dashboardSnapshot';
import { captureEvent } from '@/lib/analytics';

export interface DashboardActionPayload {
  date?: string;
  title?: string;
  routineTitle?: string;
  value?: number;
  postId?: string;
  fundingOpportunityId?: string;
  mentorId?: string;
  remove?: boolean;
}

interface MutationInput {
  action: DashboardAction;
  payload?: DashboardActionPayload;
}

function localDateKey() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function applyOptimisticDashboardAction(
  snapshot: DashboardSnapshotV1,
  action: DashboardAction,
  _payload: DashboardActionPayload = {},
): DashboardSnapshotV1 {
  if (action.actionKind === 'complete_task' && action.entityId) {
    const dueToday = snapshot.focus.dueToday.filter((task) => task.id !== action.entityId);
    const secondaryActions = snapshot.focus.secondaryActions.filter((item) => item.key !== action.key);
    return {
      ...snapshot,
      focus: {
        ...snapshot.focus,
        dueToday,
        secondaryActions,
        primaryAction: snapshot.focus.primaryAction?.key === action.key ? secondaryActions[0] ?? null : snapshot.focus.primaryAction,
      },
    };
  }

  if (action.actionKind === 'complete_daily_mission') {
    return {
      ...snapshot,
      focus: {
        ...snapshot.focus,
        dailyMission: snapshot.focus.dailyMission ? { ...snapshot.focus.dailyMission, completed: true } : null,
      },
    };
  }

  if (action.actionKind === 'complete_routine_item' && action.entityId) {
    const items = snapshot.focus.routine.items.map((item) => item.id === action.entityId ? { ...item, completed: true } : item);
    return {
      ...snapshot,
      focus: {
        ...snapshot.focus,
        routine: { ...snapshot.focus.routine, items, completed: items.filter((item) => item.completed).length },
      },
    };
  }

  if (action.actionKind === 'remove_saved_mentor' && action.entityId) {
    return {
      ...snapshot,
      people: { ...snapshot.people, savedMentors: snapshot.people.savedMentors.filter((mentor) => mentor.mentorId !== action.entityId) },
    };
  }

  if (action.actionKind === 'mark_conversation_read') {
    return { ...snapshot, people: { ...snapshot.people, unreadMessages: 0, followUps: [] } };
  }

  if (action.actionKind === 'dismiss_recommendation' || action.actionKind === 'snooze_recommendation') {
    return {
      ...snapshot,
      recommendations: snapshot.recommendations.filter((recommendation) => recommendation.id !== action.entityId),
      focus: {
        ...snapshot.focus,
        primaryAction: snapshot.focus.primaryAction?.key === action.key ? snapshot.focus.secondaryActions[0] ?? null : snapshot.focus.primaryAction,
        secondaryActions: snapshot.focus.secondaryActions.filter((item) => item.key !== action.key),
      },
    };
  }

  return snapshot;
}

async function recordRecommendationEvent(userId: string, action: DashboardAction, eventType: string) {
  await supabase.from('task_recommendation_events').insert({
    user_id: userId,
    task_id: action.kind === 'task' ? action.entityId : null,
    recommendation_key: action.key,
    event_type: eventType,
    metadata: { source: 'dashboard_v2', tool_key: action.toolKey },
  });
}

export function useDashboardAction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  return useMutation({
    mutationFn: async ({ action, payload = {} }: MutationInput) => {
      if (!userId) throw new Error('Authentication required');
      const now = new Date().toISOString();

      switch (action.actionKind) {
        case 'complete_task': {
          if (!action.entityId) throw new Error('Task id is required');
          const { error } = await supabase.from('daily_tasks').update({ is_completed: true, completed_at: now }).eq('id', action.entityId).eq('user_id', userId);
          if (error) throw error;
          await recordRecommendationEvent(userId, action, 'completed');
          break;
        }
        case 'reschedule_task': {
          if (!action.entityId || !payload.date) throw new Error('Task id and date are required');
          const { error } = await supabase.from('daily_tasks').update({ task_date: payload.date, rescheduled_at: now }).eq('id', action.entityId).eq('user_id', userId);
          if (error) throw error;
          await recordRecommendationEvent(userId, action, 'rescheduled');
          break;
        }
        case 'snooze_recommendation':
        case 'dismiss_recommendation': {
          if (!action.entityId) throw new Error('Recommendation id is required');
          const isSnooze = action.actionKind === 'snooze_recommendation';
          if (action.kind === 'task') {
            const cooldown = new Date(Date.now() + (isSnooze ? 24 : 14 * 24) * 60 * 60_000).toISOString();
            const { error } = await supabase.from('daily_tasks').update({
              recommendation_status: 'dismissed',
              dismissed_at: now,
              feedback_status: isSnooze ? 'remind_later' : 'not_relevant',
              cooldown_until: cooldown,
            }).eq('id', action.entityId).eq('user_id', userId);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('personalized_recommendations').update({ is_dismissed: true }).eq('id', action.entityId).eq('user_id', userId);
            if (error) throw error;
          }
          await recordRecommendationEvent(userId, action, isSnooze ? 'remind_later' : 'not_relevant');
          break;
        }
        case 'complete_daily_mission': {
          if (!action.entityId) throw new Error('Mission id is required');
          const { error } = await supabase.from('daily_missions').update({ completed: true }).eq('id', action.entityId).eq('user_id', userId);
          if (error) throw error;
          break;
        }
        case 'complete_routine_item': {
          if (!action.entityId) throw new Error('Routine item id is required');
          const { error } = await supabase.from('routine_task_completions').upsert({
            user_id: userId,
            routine_task_id: action.entityId,
            task_title: payload.routineTitle || action.title,
            period_type: 'daily',
            period_date: localDateKey(),
            status: 'completed',
            completed_at: now,
          }, { onConflict: 'user_id,routine_task_id,period_type,period_date' });
          if (error) throw error;
          break;
        }
        case 'remove_saved_mentor': {
          if (!action.entityId) throw new Error('Mentor id is required');
          const { error } = await supabase.from('mentor_saves').delete().eq('user_id', userId).eq('mentor_id', action.entityId);
          if (error) throw error;
          break;
        }
        case 'save_mentor': {
          const mentorId = payload.mentorId || action.entityId;
          if (!mentorId) throw new Error('Mentor id is required');
          const { error } = await supabase.from('mentor_saves').upsert({
            user_id: userId,
            mentor_id: mentorId,
            source: 'dashboard',
          }, { onConflict: 'user_id,mentor_id', ignoreDuplicates: true });
          if (error) throw error;
          break;
        }
        case 'mark_conversation_read': {
          if (!action.entityId) throw new Error('Conversation id is required');
          const { error } = await supabase.from('messages').update({ is_read: true }).eq('conversation_id', action.entityId).neq('sender_id', userId);
          if (error) throw error;
          break;
        }
        case 'create_follow_up_task': {
          const title = payload.title?.trim() || action.title;
          const { error } = await supabase.from('daily_tasks').insert({
            user_id: userId,
            task_text: title,
            task_date: payload.date || localDateKey(),
            task_source: 'manual',
            priority: action.urgency,
            source_tool: action.toolKey,
            source_route: null,
            is_completed: false,
          });
          if (error) throw error;
          break;
        }
        case 'create_task': {
          const title = payload.title?.trim() || action.title;
          const { error } = await supabase.from('daily_tasks').insert({
            user_id: userId,
            task_text: title,
            task_description: action.description,
            task_date: payload.date || localDateKey(),
            task_source: 'manual',
            priority: action.urgency,
            source_tool: action.toolKey,
            source_route: null,
            is_completed: false,
          });
          if (error) throw error;
          break;
        }
        case 'update_kpi': {
          if (!action.entityId || typeof payload.value !== 'number') throw new Error('KPI id and value are required');
          const { error } = await supabase.from('kpi_goals').update({ current_value: payload.value, updated_at: now }).eq('id', action.entityId).eq('user_id', userId);
          if (error) throw error;
          break;
        }
        case 'toggle_content_bookmark': {
          if (!payload.postId) throw new Error('Post id is required');
          const query = supabase.from('user_bookmarks');
          const { error } = payload.remove
            ? await query.delete().eq('user_id', userId).eq('post_id', payload.postId)
            : await query.upsert({ user_id: userId, post_id: payload.postId }, { onConflict: 'user_id,post_id' });
          if (error) throw error;
          break;
        }
        case 'toggle_funding_bookmark': {
          if (!payload.fundingOpportunityId) throw new Error('Funding opportunity id is required');
          const query = supabase.from('user_funding_bookmarks');
          const { error } = payload.remove
            ? await query.delete().eq('user_id', userId).eq('funding_opportunity_id', payload.fundingOpportunityId)
            : await query.upsert({ user_id: userId, funding_opportunity_id: payload.fundingOpportunityId }, { onConflict: 'user_id,funding_opportunity_id' });
          if (error) throw error;
          break;
        }
        case 'open_tool':
          return;
        default:
          throw new Error(`Unsupported dashboard action: ${action.actionKind satisfies never}`);
      }

      window.dispatchEvent(new CustomEvent('ct:tool-milestone', { detail: { tool: action.toolKey, action: action.actionKind } }));
    },
    onMutate: async ({ action, payload }) => {
      if (!userId) return undefined;
      const queryKey = dashboardSnapshotQueryKey(userId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<DashboardSnapshotV1>(queryKey);
      if (previous) queryClient.setQueryData(queryKey, applyOptimisticDashboardAction(previous, action, payload));
      return { previous };
    },
    onError: (error, _input, context) => {
      if (userId && context?.previous) queryClient.setQueryData(dashboardSnapshotQueryKey(userId), context.previous);
      toast.error(error instanceof Error ? error.message : 'Unable to update the dashboard');
    },
    onSuccess: (_data, { action }) => {
      captureEvent('dashboard_inline_action_completed', {
        action_kind: action.actionKind,
        tool_key: action.toolKey,
        recommendation_key: action.key,
      });
      void supabase.functions.invoke('track-activity', {
        body: {
          activity_type: 'dashboard_inline_action_completed',
          activity_data: { action_kind: action.actionKind, recommendation_key: action.key },
          page_path: '/dashboard',
          source_tool: action.toolKey,
          source_entity_type: action.kind,
          source_entity_id: action.entityId,
          event_key: `${action.actionKind}:${action.key}:${new Date().toISOString().slice(0, 10)}`,
        },
      });
      toast.success('Dashboard updated');
    },
    onSettled: async () => {
      if (userId) await queryClient.invalidateQueries({ queryKey: dashboardSnapshotQueryKey(userId) });
    },
  });
}
