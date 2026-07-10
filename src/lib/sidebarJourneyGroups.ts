import { BIZMAP_STAGES, BIZMAP_STAGE_ORDER, getStageByRoute, type BizMapStage } from './bizmapStages.ts';

export type SidebarJourneyGroupId = BizMapStage | 'MORE';

export interface SidebarJourneyGroup<T extends { path: string }> {
  id: SidebarJourneyGroupId;
  label: string;
  items: T[];
}

function stageGroupLabel(stage: BizMapStage): string {
  const definition = BIZMAP_STAGES.find((entry) => entry.id === stage);
  if (!definition) return stage;
  const title = definition.title.charAt(0) + definition.title.slice(1).toLowerCase();
  return `${definition.numeral} · ${title}`;
}

// Groups already-filtered sidebar tool items by journey stage (joined on route
// — tool keys use a different naming scheme). Stage groups follow
// BIZMAP_STAGE_ORDER; stageless tools land in a trailing "More tools" group.
// Input order is preserved within each group; empty groups are omitted.
export function groupToolItemsByStage<T extends { path: string }>(items: T[]): SidebarJourneyGroup<T>[] {
  const byGroup = new Map<SidebarJourneyGroupId, T[]>();

  for (const item of items) {
    const groupId: SidebarJourneyGroupId = getStageByRoute(item.path) ?? 'MORE';
    const list = byGroup.get(groupId) ?? [];
    list.push(item);
    byGroup.set(groupId, list);
  }

  const groups: SidebarJourneyGroup<T>[] = [];
  for (const stage of BIZMAP_STAGE_ORDER) {
    const stageItems = byGroup.get(stage);
    if (!stageItems || stageItems.length === 0) continue;
    groups.push({ id: stage, label: stageGroupLabel(stage), items: stageItems });
  }

  const moreItems = byGroup.get('MORE');
  if (moreItems && moreItems.length > 0) {
    groups.push({ id: 'MORE', label: 'More tools', items: moreItems });
  }

  return groups;
}
