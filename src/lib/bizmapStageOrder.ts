// Pure stage vocabulary shared by browser and email workers.
export const BIZMAP_STAGE_ORDER = [
  'IDENTITY', 'PROTOTYPE', 'VALIDATING', 'BUILDING', 'LAUNCH', 'TRACTION', 'FUNDRAISING',
] as const;
export type BizMapStage = (typeof BIZMAP_STAGE_ORDER)[number];
