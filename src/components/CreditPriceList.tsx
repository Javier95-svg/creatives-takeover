import { Coins } from "lucide-react";
import { CREDIT_COSTS } from "@/config/constants";

export function CreditPriceList() {
    const prices = [
        { name: "Launch Report", cost: CREDIT_COSTS.LAUNCH_REPORT },
        { name: "Asset Generation", cost: CREDIT_COSTS.ASSET_GENERATION },
        { name: "Market Research", cost: CREDIT_COSTS.MARKET_RESEARCH },
        { name: "Market Validation", cost: CREDIT_COSTS.MARKET_VALIDATION },
        { name: "Financial Analysis", cost: CREDIT_COSTS.FINANCIAL_ANALYSIS },
        { name: "Pitch Deck & One-Pager", cost: CREDIT_COSTS.PITCH_DECK_GENERATION },
        { name: "Investor Matching", cost: CREDIT_COSTS.INVESTOR_MATCHING },
        { name: "Roadmap Generation", cost: CREDIT_COSTS.ROADMAP_GENERATION },
        { name: "Sprint Task", cost: CREDIT_COSTS.SPRINT_TASK_GENERATION },
        { name: "AI Chat Message", cost: CREDIT_COSTS.AI_CHAT_MESSAGE },
        { name: "Tech Stack", cost: CREDIT_COSTS.TECH_STACK_GENERATION },
        { name: "PDF Export", cost: CREDIT_COSTS.PDF_EXPORT },
        { name: "Discovery Call", cost: CREDIT_COSTS.DISCOVERY_CALL },
    ];

    return (
        <div className="space-y-1 text-xs text-muted-foreground">
            {prices.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                    <span>• {item.name}:</span>
                    <span className="font-medium flex items-center gap-0.5">
                        {item.cost} <Coins className="h-3 w-3 inline" />
                    </span>
                </div>
            ))}
        </div>
    );
}
