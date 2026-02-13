import { Button } from "@/components/ui/button";
import { Bot, Send } from "lucide-react";

// Placeholder constants for customization
const HERO_CONFIG = {
  productName: "Creatives Takeover",
  label: "YOUR AI CO-FOUNDER",
  headline: "All your ideas, one trusted assistant.",
  subcopy: "Your AI-powered business planner and assistant that helps you turn ideas into actionable plans, validate concepts, and build your business step by step through intelligent conversation.",
  primaryCTA: "Request a demo",
  secondaryCTA: "See how it works",
  trustSignals: [
    "Private workspaces",
    "Sharing controls",
    "Investor-ready templates"
  ],
  promoCard: {
    date: "APR 10, 2026",
    title: "Introducing Advanced Planning Mode",
    description: "New AI-powered features for comprehensive business planning and strategy development.",
    cta: "Read announcement"
  }
};

export const BizMapHero = () => {
  return (
    <div className="relative w-full">
      {/* Hero Main Content */}
      <div className="container mx-auto px-4 sm:px-6 pt-16 sm:pt-20 lg:pt-24 pb-12 sm:pb-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start max-w-7xl mx-auto">
          {/* Left Column: Copy Block */}
          <div className="space-y-6 sm:space-y-8 lg:max-w-xl">
            {/* Small Label - Centered and closer to title */}
            <div className="text-center mb-1">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80 font-poppins">
                {HERO_CONFIG.label}
              </span>
            </div>

            {/* H1 */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight font-space-grotesk leading-tight text-center -mt-1">
              {HERO_CONFIG.headline}
            </h1>

            {/* Subcopy */}
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto text-center font-sans">
              {HERO_CONFIG.subcopy}
            </p>
          </div>

          {/* Right Column: Chatbot Preview */}
          <div className="space-y-6 lg:max-w-2xl lg:ml-auto">
            {/* Mini Chatbot Preview */}
            <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-lg overflow-hidden">
              <div className="space-y-4">
                {/* Chat Header */}
                <div className="flex items-center gap-2 pb-3 border-b border-border/40">
                  <Bot className="w-5 h-5 text-primary" />
                  <span className="text-base font-semibold font-poppins">BizMap AI</span>
                </div>

                {/* Message Bubbles */}
                <div className="space-y-4 min-h-[200px]">
                  {/* Assistant Message 1 */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 rounded-lg bg-muted/50 p-4">
                      <p className="text-sm text-foreground/80 leading-relaxed font-poppins">
                        Hi! I'm your AI business planner. What would you like to work on today?
                      </p>
                    </div>
                  </div>

                  {/* User Message */}
                  <div className="flex gap-3 justify-end">
                    <div className="flex-1 rounded-lg bg-primary/10 p-4 max-w-[80%]">
                      <p className="text-sm text-foreground/80 leading-relaxed font-poppins text-right">
                        I want to validate my startup idea
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-secondary">U</span>
                    </div>
                  </div>

                  {/* Assistant Message 2 */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 rounded-lg bg-muted/50 p-4">
                      <p className="text-sm text-foreground/80 leading-relaxed font-poppins">
                        Great! Let's start by understanding your target market and core problem...
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input Field (Disabled) */}
                <div className="flex gap-2 pt-3 border-t border-border/40">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    disabled
                    className="flex-1 px-4 py-3 text-sm rounded-lg border border-border/60 bg-background/50 text-muted-foreground/60 font-poppins cursor-not-allowed"
                  />
                  <Button size="icon" variant="ghost" disabled className="flex-shrink-0">
                    <Send className="w-5 h-5 text-muted-foreground/40" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
