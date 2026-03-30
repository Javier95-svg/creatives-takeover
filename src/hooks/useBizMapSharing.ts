import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { trackActivity } from '@/lib/activity';
import {
  type BizMapShareSourceType,
  type BizMapShareVisibility,
  type BizMapSharedOutputRecord,
  type BizMapSharedSnapshot,
  getBizMapLinkedInPostText,
  getBizMapLinkedInShareUrl,
  getBizMapShareUrl,
  getBizMapSharedOutputBySource,
  regenerateBizMapSharedOutputSlug,
  updateBizMapSharedOutputVisibility,
  upsertBizMapSharedOutput,
} from '@/lib/bizmapSharing';

interface UseBizMapSharingOptions {
  sourceType: BizMapShareSourceType;
  sourceId: string | null;
  getPayload: () => {
    title: string;
    summary: string;
    snapshot: BizMapSharedSnapshot;
  };
}

export function useBizMapSharing({ sourceType, sourceId, getPayload }: UseBizMapSharingOptions) {
  const { user } = useAuth();

  const [shareRecord, setShareRecord] = useState<BizMapSharedOutputRecord | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadExistingRecord = useCallback(async () => {
    if (!user?.id || !sourceId) {
      setShareRecord(null);
      return null;
    }

    try {
      const existing = await getBizMapSharedOutputBySource(user.id, sourceType, sourceId);
      setShareRecord(existing);
      return existing;
    } catch (error) {
      console.error('Failed to load shared output:', error);
      return null;
    }
  }, [sourceId, sourceType, user?.id]);

  useEffect(() => {
    void loadExistingRecord();
  }, [loadExistingRecord]);

  const ensureShareRecord = useCallback(async () => {
    if (!user?.id) {
      toast.error('Sign in to create a share link.');
      return null;
    }

    if (!sourceId) {
      toast.error('Save or finish this output before sharing it.');
      return null;
    }

    setIsPreparing(true);
    try {
      const payload = getPayload();
      const { record, created } = await upsertBizMapSharedOutput({
        userId: user.id,
        sourceType,
        sourceId,
        title: payload.title,
        summary: payload.summary,
        snapshot: payload.snapshot,
      });

      setShareRecord(record);

      await trackActivity(
        created ? 'bizmap_share_link_created' : 'bizmap_share_link_refreshed',
        {
          sourceType,
          sourceId,
          shareId: record.id,
          visibility: record.visibility,
        },
        user.id,
      );

      return record;
    } catch (error) {
      console.error('Failed to prepare share record:', error);
      toast.error('Unable to prepare a share link right now.');
      return null;
    } finally {
      setIsPreparing(false);
    }
  }, [getPayload, sourceId, sourceType, user?.id]);

  const openShareDialog = useCallback(async () => {
    const record = await ensureShareRecord();
    if (!record) return;
    setIsDialogOpen(true);
  }, [ensureShareRecord]);

  const copyShareLink = useCallback(async () => {
    const record = shareRecord ?? await ensureShareRecord();
    if (!record) return;

    await navigator.clipboard.writeText(getBizMapShareUrl(record.slug));
    toast.success('Share link copied.');

    await trackActivity(
      'bizmap_share_link_copied',
      {
        sourceType,
        sourceId,
        shareId: record.id,
        visibility: record.visibility,
      },
      user?.id,
    );
  }, [ensureShareRecord, shareRecord, sourceId, sourceType, user?.id]);

  const copyLinkedInPost = useCallback(async () => {
    const record = shareRecord ?? await ensureShareRecord();
    if (!record) return;

    await navigator.clipboard.writeText(getBizMapLinkedInPostText(record));
    toast.success('LinkedIn post text copied.');

    await trackActivity(
      'bizmap_share_linkedin_text_copied',
      {
        sourceType,
        sourceId,
        shareId: record.id,
      },
      user?.id,
    );
  }, [ensureShareRecord, shareRecord, sourceId, sourceType, user?.id]);

  const openSharedPage = useCallback(async () => {
    const record = shareRecord ?? await ensureShareRecord();
    if (!record) return;

    window.open(getBizMapShareUrl(record.slug), '_blank', 'noopener,noreferrer');

    await trackActivity(
      'bizmap_share_link_opened',
      {
        sourceType,
        sourceId,
        shareId: record.id,
      },
      user?.id,
    );
  }, [ensureShareRecord, shareRecord, sourceId, sourceType, user?.id]);

  const shareOnLinkedIn = useCallback(async () => {
    const record = shareRecord ?? await ensureShareRecord();
    if (!record) return;

    window.open(getBizMapLinkedInShareUrl(record.slug), '_blank', 'noopener,noreferrer');

    await trackActivity(
      'bizmap_share_linkedin_clicked',
      {
        sourceType,
        sourceId,
        shareId: record.id,
      },
      user?.id,
    );
  }, [ensureShareRecord, shareRecord, sourceId, sourceType, user?.id]);

  const updateVisibility = useCallback(async (visibility: BizMapShareVisibility) => {
    if (!user?.id || !shareRecord) return;

    setIsUpdatingVisibility(true);
    try {
      const updated = await updateBizMapSharedOutputVisibility(shareRecord.id, user.id, visibility);
      setShareRecord(updated);

      toast.success(
        visibility === 'private'
          ? 'Share link disabled.'
          : visibility === 'public'
            ? 'Share page is now public.'
            : 'Share page is now unlisted.',
      );

      await trackActivity(
        'bizmap_share_visibility_updated',
        {
          sourceType,
          sourceId,
          shareId: shareRecord.id,
          visibility,
        },
        user.id,
      );
    } catch (error) {
      console.error('Failed to update share visibility:', error);
      toast.error('Unable to update share visibility right now.');
    } finally {
      setIsUpdatingVisibility(false);
    }
  }, [shareRecord, sourceId, sourceType, user?.id]);

  const regenerateLink = useCallback(async () => {
    if (!user?.id || !shareRecord) return;

    setIsPreparing(true);
    try {
      const updated = await regenerateBizMapSharedOutputSlug(
        shareRecord.id,
        user.id,
        sourceType,
        shareRecord.title,
      );
      setShareRecord(updated);
      toast.success('New share link created.');

      await trackActivity(
        'bizmap_share_link_regenerated',
        {
          sourceType,
          sourceId,
          shareId: shareRecord.id,
        },
        user.id,
      );
    } catch (error) {
      console.error('Failed to regenerate share link:', error);
      toast.error('Unable to regenerate the share link right now.');
    } finally {
      setIsPreparing(false);
    }
  }, [shareRecord, sourceId, sourceType, user?.id]);

  return {
    shareRecord,
    isPreparing,
    isUpdatingVisibility,
    isDialogOpen,
    setIsDialogOpen,
    openShareDialog,
    copyShareLink,
    copyLinkedInPost,
    openSharedPage,
    shareOnLinkedIn,
    updateVisibility,
    regenerateLink,
  };
}
