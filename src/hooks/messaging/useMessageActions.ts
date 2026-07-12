import { messagingV2 } from '@/lib/messagingV2';

export const useMessageActions = () => ({
  accept: (conversationId: string) => messagingV2.requestStatus(conversationId, 'accepted'),
  refuse: (conversationId: string) => messagingV2.requestStatus(conversationId, 'refused'),
  markRead: messagingV2.markRead,
  setState: messagingV2.conversationState,
  deleteForEveryone: messagingV2.softDelete
});
