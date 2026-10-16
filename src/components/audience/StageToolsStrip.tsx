import { Link } from "react-router-dom";

import { getCoreFounderToolsForStage, type FounderJourneyStage } from "@/config/founderToolCatalog";
import { BIZMAP_STAGE_ORDER, FOUNDER_STAGE_LABELS } from "@/lib/bizmapStageOrder";

// The operating stages and the core tool for each, read from the tool catalog
// so the page never names a tool the product doesn't have.
const STAGES = BIZMAP_STAGE_ORDER.slice(0, 6).map((stage, index) => ({
  stage,
  label: FOUNDER_STAGE_LABELS[index],
  tool: getCoreFounderToolsForStage(stage as FounderJourneyStage)[0],
}));

const StageToolsStrip = () => (
  <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {STAGES.map(({ stage, label, tool }, index) => (
      <li key={stage} className="audience-card surface-panel trust-outline !gap-2 !p-5">
        <span className="audience-card__number">
          {String(index + 1).padStart(2, "0")} · {label}
        </span>
        {tool ? (
          <>
            <Link to={tool.route} className="audience-card__title hover:text-primary">
              {tool.name}
            </Link>
            <p className="audience-card__body">{tool.purpose}</p>
          </>
        ) : null}
      </li>
    ))}
  </ol>
);

export default StageToolsStrip;
