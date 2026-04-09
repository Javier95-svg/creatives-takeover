const ICP_DRAFT_STORAGE_PREFIX = 'icp_builder_draft';

export const getIcpDraftStorageKey = (userId?: string) => `${ICP_DRAFT_STORAGE_PREFIX}:${userId || 'anonymous'}`;
