import { CREDIT_COSTS, MVP_CREDIT_COSTS, getCreditCostForPlan } from "@/config/constants";

export function CreditPriceList() {
    const prices = [
        { name: "ICP Builder", value: "Free on every plan" },
        { name: "Waitlist Maker", value: `${getCreditCostForPlan('WAITLIST_GENERATION', 'rookie')} credits/use on Rookie; ${CREDIT_COSTS.WAITLIST_GENERATION} on paid plans` },
        { name: "PMF Lab", value: `${CREDIT_COSTS.PMF_ANALYSIS} credits/full analysis; ${CREDIT_COSTS.PMF_SCORING} credits/evidence score on Starter+` },
        { name: "MVP Builder", value: `Uses MVP credits: ${MVP_CREDIT_COSTS.APP_BUILDER_GENERATE} new React app, ${MVP_CREDIT_COSTS.APP_BUILDER_REFINE} edit, ${MVP_CREDIT_COSTS.APP_BUILDER_ADD_FEATURE} add feature, ${MVP_CREDIT_COSTS.APP_BUILDER_DEPLOY} deploy` },
        { name: "Tech Stack Builder", value: `${CREDIT_COSTS.TECH_STACK_GENERATION} credits/use on Rising+` },
        { name: "GTM Strategist", value: `${CREDIT_COSTS.GTM_ANALYSIS} credits/use on Rising+` },
        { name: "Directories", value: "Included on Rising+" },
        { name: "VC Search", value: "Profile-view quota" },
        { name: "Accelerator Hunt", value: "Profile-view quota" },
        { name: "Email Templates", value: "Included on Starter+" },
        { name: "Pitch Deck Analyzer", value: `${CREDIT_COSTS.PITCH_DECK_ANALYZER} credits/use on Rising+` },
        { name: "Insighta Test", value: "Included on every plan" },
        { name: "Discovery Calls", value: "10 credits per confirmed booking" },
        { name: "Find a Co-Founder Posting", value: "Monthly quota" },
        { name: "Find Your Angel", value: "Pro only" },
        { name: "Newspaper", value: "Included on every plan" },
        { name: "Prompt Library", value: `Free models on Rookie/Starter; custom actions ${CREDIT_COSTS.PROMPT_GENERATION} credits on Rising+` },
    ];

    return (
        <div className="space-y-1 text-xs text-muted-foreground">
            {prices.map((item) => (
                <div key={item.name} className="flex items-start justify-between gap-3">
                    <span className="shrink-0">- {item.name}:</span>
                    <span className="font-medium text-right leading-snug">{item.value}</span>
                </div>
            ))}
        </div>
    );
}
