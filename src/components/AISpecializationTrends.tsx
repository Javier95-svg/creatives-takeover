import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Zap } from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";
import { useIsMobile } from "@/hooks/use-mobile";

const TypedParagraph = ({
  text,
  startDelay = 0,
  className = ""
}: {
  text: string;
  startDelay?: number;
  className?: string;
}) => {
  const { displayedText, isTyping } = useTypingAnimation({
    text,
    speed: 28,
    startDelay
  });

  return (
    <p className={className}>
      {displayedText}
      {isTyping && <span className="inline-block w-0.5 h-4 bg-primary ml-1 animate-pulse" />}
    </p>
  );
};

const AISpecializationTrends = () => {
  const [chartVisible, setChartVisible] = useState(false);
  const [textSectionVisible, setTextSectionVisible] = useState(false);
  const isMobile = useIsMobile();
  const typingSpeed = 24;
  const firstNarrative =
    "It has never been a better time to be a founder. Markets are unbundling, and software is breaking into focused, founder-sized opportunities instead of being dominated by a few general-purpose giants.";
  const secondNarrative =
    "The data shows that niche, specialized products are the ones growing fastest, raising capital, and building loyal communities of users who feel truly understood. For creative entrepreneurs, that means the barrier to starting is lower than ever, and the upside for solving a specific problem for a specific group of people has never been higher.";
  const secondStartDelay = firstNarrative.length * typingSpeed + 600;

  // Scroll-triggered animations
  const { ref: chartAnimationRef, isVisible: chartIsVisible } = useScrollAnimation(200);
  const { ref: textSectionRef, isVisible: textSectionIsVisible } = useScrollAnimation(120);

  useEffect(() => {
    if (chartIsVisible && !chartVisible) {
      const timer = setTimeout(() => setChartVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, [chartIsVisible, chartVisible]);

  useEffect(() => {
    if (textSectionIsVisible && !textSectionVisible) {
      const timer = setTimeout(() => setTextSectionVisible(true), 400);
      return () => clearTimeout(timer);
    }
  }, [textSectionIsVisible, textSectionVisible]);

  const founderLeverageData = [
    { stage: 'Manual Ops', traditional: 1, aiEnabled: 1.2 },
    { stage: 'AI Assist', traditional: 1.3, aiEnabled: 3.5 },
    { stage: 'AI Workflows', traditional: 1.6, aiEnabled: 8 },
    { stage: 'Agent Stack', traditional: 1.9, aiEnabled: 16 },
  ];

  const marketReachData = [
    { stage: 'Local', enterpriseOnly: 18, smallTeamAccess: 22 },
    { stage: 'Niche', enterpriseOnly: 36, smallTeamAccess: 55 },
    { stage: 'National', enterpriseOnly: 64, smallTeamAccess: 78 },
    { stage: 'Global', enterpriseOnly: 88, smallTeamAccess: 96 },
  ];


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
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.035] to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header - Enhanced */}
        <div className="text-center mb-14 sm:mb-16">
          <Badge variant="outline" className="homepage-section-badge mb-5">
            The Power of Small Teams 👥
          </Badge>
          <h2 className="homepage-section-title text-3xl sm:text-4xl lg:text-[2.9rem] mb-5">
            The Future of Work Is Here
          </h2>
          <p className="homepage-section-copy text-base sm:text-lg max-w-3xl mx-auto px-4">
            Technology is enabling small teams to build exceptional products and business models that can successfully compete with large enterprises.
          </p>
        </div>

        <div ref={chartAnimationRef}>
        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Chart 1: Founder Leverage */}
          <Card className="surface-panel trust-outline overflow-hidden hover:shadow-[0_22px_44px_-30px_rgba(15,23,42,0.2)] transition-shadow">
            <CardHeader>
              <CardTitle className="font-space-grotesk text-base sm:text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                AI Leverage Per Founder
              </CardTitle>
            </CardHeader>
            <CardContent className={isMobile ? "px-4 pb-5" : undefined}>
              {chartVisible && (
                <div className="chart-container mx-auto w-full max-w-[340px] sm:max-w-none">
                  <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
                    <LineChart data={founderLeverageData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="nicheGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis
                        dataKey="stage"
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '12px' }}
                        unit="x"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                          transition: 'all 0.3s ease'
                        }}
                        animationDuration={400}
                        animationEasing="ease-out"
                        cursor={{
                          fill: 'hsl(var(--primary) / 0.1)',
                          stroke: 'hsl(var(--primary))',
                          strokeWidth: 2,
                          strokeDasharray: '5 5'
                        }}
                      />
                      <Legend
                        wrapperStyle={{
                          transition: 'all 0.3s ease',
                          paddingTop: '10px'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="aiEnabled"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        className="chart-line"
                        dot={{
                          fill: 'hsl(var(--primary))',
                          r: 5,
                          strokeWidth: 2,
                          stroke: 'hsl(var(--background))',
                          style: {
                            transition: 'all 0.3s ease'
                          }
                        }}
                        activeDot={{
                          r: 7,
                          fill: 'hsl(var(--primary))',
                          stroke: 'hsl(var(--background))',
                          strokeWidth: 2,
                          style: {
                            transition: 'all 0.3s ease'
                          }
                        }}
                        name="AI-Enabled Solo Founder"
                        animationBegin={0}
                        animationDuration={2500}
                        animationEasing="ease-out"
                        style={{
                          transition: 'all 0.3s ease'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="traditional"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2.5}
                        strokeDasharray="5 5"
                        dot={{
                          fill: 'hsl(var(--muted-foreground))',
                          r: 4,
                          strokeWidth: 2,
                          stroke: 'hsl(var(--background))',
                          style: {
                            transition: 'all 0.3s ease'
                          }
                        }}
                        activeDot={{
                          r: 6,
                          fill: 'hsl(var(--muted-foreground))',
                          stroke: 'hsl(var(--background))',
                          strokeWidth: 2,
                          style: {
                            transition: 'all 0.3s ease'
                          }
                        }}
                        name="Traditional Solo Founder"
                        animationBegin={600}
                        animationDuration={2500}
                        animationEasing="ease-out"
                        style={{
                          transition: 'all 0.3s ease'
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                AI turns one founder into a multi-function operating team, compounding output across research, product, marketing, and support.
              </p>
            </CardContent>
          </Card>

          {/* Chart 2: Market Reach */}
          <Card className="surface-panel trust-outline overflow-hidden hover:shadow-[0_22px_44px_-30px_rgba(15,23,42,0.2)] transition-shadow">
            <CardHeader>
              <CardTitle className="font-space-grotesk text-base sm:text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Market Reach Without Headcount
              </CardTitle>
            </CardHeader>
            <CardContent className={isMobile ? "px-4 pb-5" : undefined}>
              {chartVisible && (
                <div className="chart-container mx-auto w-full max-w-[340px] sm:max-w-none" style={{ animationDelay: '0.2s' }}>
                  <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
                    <AreaChart data={marketReachData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="specializedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        </linearGradient>
                        <linearGradient id="generalGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.15} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis
                        dataKey="stage"
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '12px' }}
                        unit="%"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                          transition: 'all 0.3s ease'
                        }}
                        animationDuration={400}
                        animationEasing="ease-out"
                        cursor={{
                          fill: 'hsl(var(--primary) / 0.1)',
                          stroke: 'hsl(var(--primary))',
                          strokeWidth: 2,
                          strokeDasharray: '5 5'
                        }}
                      />
                      <Legend
                        wrapperStyle={{
                          transition: 'all 0.3s ease',
                          paddingTop: '10px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="smallTeamAccess"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        fill="url(#specializedGradient)"
                        fillOpacity={0.7}
                        name="Small Team Access"
                        className="chart-area"
                        animationBegin={0}
                        animationDuration={2800}
                        animationEasing="ease-out"
                        style={{
                          transition: 'all 0.3s ease'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="enterpriseOnly"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2}
                        fill="url(#generalGradient)"
                        fillOpacity={0.4}
                        name="Enterprise-Only Access"
                        className="chart-area"
                        animationBegin={500}
                        animationDuration={2800}
                        animationEasing="ease-out"
                        style={{
                          transition: 'all 0.3s ease'
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                AI tooling gives small teams access to research, production, support, and distribution workflows once reserved for larger companies.
              </p>
            </CardContent>
          </Card>
        </div>
        </div>

        {/* Narrative Conclusion */}
        <div ref={textSectionRef} className="mt-12 max-w-4xl mx-auto">
          <div className="surface-panel trust-outline rounded-[28px] p-8 sm:p-10">
            <h3 className="font-space-grotesk text-2xl font-semibold mb-4 text-center text-foreground tracking-tight">
              A Lifetime Opportunity
            </h3>
            {textSectionVisible && (
              <>
                <TypedParagraph
                  text={firstNarrative}
                  startDelay={0}
                  className="text-base text-muted-foreground leading-relaxed mb-4"
                />
                <TypedParagraph
                  text={secondNarrative}
                  startDelay={secondStartDelay}
                  className="text-base text-muted-foreground leading-relaxed"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AISpecializationTrends;
