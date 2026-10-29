import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import HomeSectionHeader from "@/components/home/HomeSectionHeader";
import { Timer, User } from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const TypedText = ({ text, startDelay }: { text: string; startDelay: number }) => {
  const { displayedText, isTyping } = useTypingAnimation({
    text,
    speed: 28,
    startDelay
  });

  return (
    <span className="absolute inset-0" aria-hidden="true">
      {displayedText}
      {isTyping && <span className="inline-block w-0.5 h-4 bg-primary ml-1 animate-pulse" />}
    </span>
  );
};

// The full text is laid out (invisibly) from the start and the typed copy is
// drawn on top of it, so the paragraph never grows while it types. Growing
// text pushed everything below it down: 0.52 of the phone CLS on 2026-10-29.
const TypedParagraph = ({
  text,
  startDelay = 0,
  active,
  className = ""
}: {
  text: string;
  startDelay?: number;
  active: boolean;
  className?: string;
}) => (
  <p className={`relative ${className}`}>
    <span className="sr-only">{text}</span>
    <span className="invisible" aria-hidden="true">{text}</span>
    {active && <TypedText text={text} startDelay={startDelay} />}
  </p>
);

const AISpecializationTrends = () => {
  const [chartVisible, setChartVisible] = useState(false);
  const [textSectionVisible, setTextSectionVisible] = useState(false);
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const typingSpeed = 24;
  // Reserved before the charts draw, so their arrival shifts nothing below.
  const chartHeight = isMobile ? 220 : 300;
  const firstNarrative =
    "Starting a software business takes less money and fewer people than it used to. AI tools now handle work that once needed a team, and focused products for a specific group of people can reach customers anywhere.";
  const secondNarrative =
    "Lower costs also mean more competition and less room for guesswork. Founders who learn what their customers need before they build are better placed to succeed, and that is the work Creatives Takeover is built to support.";
  const secondStartDelay = firstNarrative.length * typingSpeed + 600;

  // Scroll-triggered animations
  const { ref: chartAnimationRef, isVisible: chartIsVisible } = useScrollAnimation(200);
  const { ref: textSectionRef, isVisible: textSectionIsVisible } = useScrollAnimation(120);

  useEffect(() => {
    if (chartIsVisible && !chartVisible) {
      if (prefersReducedMotion) {
        setChartVisible(true);
        return;
      }
      const timer = setTimeout(() => setChartVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, [chartIsVisible, chartVisible, prefersReducedMotion]);

  useEffect(() => {
    if (textSectionIsVisible && !textSectionVisible) {
      if (prefersReducedMotion) {
        setTextSectionVisible(true);
        return;
      }
      const timer = setTimeout(() => setTextSectionVisible(true), 400);
      return () => clearTimeout(timer);
    }
  }, [textSectionIsVisible, textSectionVisible, prefersReducedMotion]);

  // Published figures only (checked 2026-10-24). Carta, Solo Founders Report
  // 2025 (9 Dec 2025): "From 2019 to H1 2025, the share of new startups with a
  // solo founder has risen from 23.7% to 36.3%" and "solo-led companies
  // represented 30% of startups founded in 2024". U.S. startups on Carta.
  const soloFounderData = [
    { period: '2019', share: 23.7 },
    { period: '2024', share: 30 },
    { period: 'H1 2025', share: 36.3 },
  ];

  // Stripe, "Indexing the AI economy": the top 100 AI companies on Stripe
  // reached $1M in annualized revenue in a median 11.5 months, "four months
  // ahead of the fastest-growing SaaS companies" (so about 15.5 months).
  const timeToRevenueData = [
    { group: 'Top 100 AI companies', months: 11.5 },
    { group: 'Fastest-growing SaaS', months: 15.5 },
  ];

  const axisStyle = { fontSize: '12px' };
  const valueLabelStyle = { fill: 'hsl(var(--foreground))', fontSize: 13, fontWeight: 600 };

  return (
    <section className="section-shell relative overflow-hidden">
      <style>{`
        @keyframes chartFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes lineDraw {
          from {
            stroke-dashoffset: 1000;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes areaFill {
          from {
            opacity: 0;
            transform: scaleY(0.85);
            transform-origin: bottom;
          }
          to {
            opacity: 1;
            transform: scaleY(1);
          }
        }
        .chart-container {
          animation: chartFadeIn 0.7s ease-out both;
        }
        .chart-line {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: lineDraw 2.2s ease-out forwards;
        }
        .chart-area {
          animation: areaFill 2.4s ease-out forwards;
        }
      `}</style>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <HomeSectionHeader badge="The Power of Small Teams" title="What AI Changes for Small Teams">
          Small teams now do work that used to need a large one.
        </HomeSectionHeader>

        <div ref={chartAnimationRef}>
        {/* Charts Grid: published figures, each with its source */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Chart 1: Solo founders */}
          <Card className="hx-chart overflow-hidden">
            <CardHeader>
              <CardTitle className="font-space-grotesk text-base sm:text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                More Startups Begin With One Founder
              </CardTitle>
              <p className="hx-chart__stat">
                36.3%<span>of new U.S. startups on Carta had a solo founder in H1 2025, up from 23.7% in 2019</span>
              </p>
            </CardHeader>
            <CardContent className={isMobile ? "px-4 pb-5" : undefined}>
              <div style={{ minHeight: chartHeight }}>
              {chartVisible && (
                <div className="chart-container mx-auto w-full max-w-[340px] sm:max-w-none">
                  <ResponsiveContainer width="100%" height={chartHeight}>
                    <BarChart data={soloFounderData} margin={{ top: 28, right: 10, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="hxBarStrong" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0" stopColor="hsl(192 90% 56%)" />
                          <stop offset="1" stopColor="hsl(262 83% 64%)" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                      <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" style={axisStyle} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" style={axisStyle} unit="%" domain={[0, 40]} ticks={[0, 10, 20, 30, 40]} tickLine={false} />
                      <Bar
                        dataKey="share"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={72}
                        animationDuration={prefersReducedMotion ? 0 : 1200}
                        isAnimationActive={!prefersReducedMotion}
                      >
                        {soloFounderData.map((entry, index) => (
                          <Cell
                            key={entry.period}
                            fill={index === soloFounderData.length - 1 ? 'url(#hxBarStrong)' : 'hsl(var(--primary) / 0.35)'}
                          />
                        ))}
                        <LabelList dataKey="share" position="top" formatter={(value: number) => `${value}%`} style={valueLabelStyle} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Share of new startups with a solo founder. Starting a company now takes fewer people.
              </p>
              <p className="text-xs text-muted-foreground/80 mt-2">
                Source:{" "}
                <a href="https://carta.com/data/solo-founders-report/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                  Carta, Solo Founders Report 2025
                </a>
                , U.S. startups on Carta.
              </p>
            </CardContent>
          </Card>

          {/* Chart 2: Time to first $1M */}
          <Card className="hx-chart overflow-hidden">
            <CardHeader>
              <CardTitle className="font-space-grotesk text-base sm:text-lg flex items-center gap-2">
                <Timer className="w-5 h-5 text-primary" />
                AI Products Reach Revenue Sooner
              </CardTitle>
              <p className="hx-chart__stat">
                11.5 mo<span>median for the top 100 AI companies on Stripe to reach $1M in annualized revenue</span>
              </p>
            </CardHeader>
            <CardContent className={isMobile ? "px-4 pb-5" : undefined}>
              <div style={{ minHeight: chartHeight }}>
              {chartVisible && (
                <div className="chart-container mx-auto w-full max-w-[340px] sm:max-w-none" style={{ animationDelay: '0.2s' }}>
                  <ResponsiveContainer width="100%" height={chartHeight}>
                    <BarChart data={timeToRevenueData} layout="vertical" margin={{ top: 5, right: isMobile ? 84 : 72, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="hxBarSide" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0" stopColor="hsl(262 83% 64%)" />
                          <stop offset="1" stopColor="hsl(330 85% 62%)" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" style={axisStyle} domain={[0, 18]} ticks={[0, 6, 12, 18]} unit=" mo" tickLine={false} />
                      <YAxis type="category" dataKey="group" stroke="hsl(var(--muted-foreground))" style={axisStyle} width={isMobile ? 120 : 150} tickLine={false} />
                      <Bar
                        dataKey="months"
                        radius={[0, 8, 8, 0]}
                        maxBarSize={56}
                        animationDuration={prefersReducedMotion ? 0 : 1200}
                        isAnimationActive={!prefersReducedMotion}
                      >
                        {timeToRevenueData.map((entry, index) => (
                          <Cell key={entry.group} fill={index === 0 ? 'url(#hxBarSide)' : 'hsl(var(--muted-foreground) / 0.4)'} />
                        ))}
                        <LabelList dataKey="months" position="right" formatter={(value: number) => `${value} months`} style={valueLabelStyle} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Median time to reach $1M in annualized revenue. Stripe reports the top AI companies got there four months ahead of the fastest-growing SaaS companies.
              </p>
              <p className="text-xs text-muted-foreground/80 mt-2">
                Source:{" "}
                <a href="https://stripe.com/guides/indexing-the-ai-economy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                  Stripe, Indexing the AI economy
                </a>
                , top 100 AI companies on Stripe.
              </p>
            </CardContent>
          </Card>
        </div>
        </div>

        {/* Narrative Conclusion */}
        <div ref={textSectionRef} className="mt-4">
          <div className="hx-why">
            <h3 className="hx-why__title">
              Why It Matters Now
            </h3>
            <TypedParagraph
              text={firstNarrative}
              startDelay={0}
              active={textSectionVisible}
              className="text-base text-muted-foreground leading-relaxed mb-4"
            />
            <TypedParagraph
              text={secondNarrative}
              startDelay={secondStartDelay}
              active={textSectionVisible}
              className="text-base text-muted-foreground leading-relaxed"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AISpecializationTrends;
