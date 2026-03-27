import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Zap, BarChart3 } from "lucide-react";
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
import { useCountUp } from "@/hooks/useCountUp";
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

  // Animated counters
  const { count: revenueCount, ref: revenueRef } = useCountUp(1.8, 2000);
  const { count: speedCount, ref: speedRef } = useCountUp(12, 2000);
  const { count: marginCount, ref: marginRef } = useCountUp(85, 2000);

  // Chart 1: Operational Velocity (Small Teams vs Legacy)
  const operationalVelocityData = [
    { year: '2020', legacy: 10, aiNative: 15 },
    { year: '2021', legacy: 12, aiNative: 35 },
    { year: '2022', legacy: 13, aiNative: 85 },
    { year: '2023', legacy: 13, aiNative: 180 },
    { year: '2024', legacy: 14, aiNative: 320 },
    { year: '2025', legacy: 15, aiNative: 580 },
  ];

  // Chart 2: Market Value Capture (Disrupters vs Incumbents)
  const marketValueData = [
    { year: '2020', incumbents: 90, disrupters: 10 },
    { year: '2021', incumbents: 82, disrupters: 18 },
    { year: '2022', incumbents: 70, disrupters: 30 },
    { year: '2023', incumbents: 55, disrupters: 45 },
    { year: '2024', incumbents: 40, disrupters: 60 },
    { year: '2025', incumbents: 25, disrupters: 75 },
  ];


  return (
    <section className="py-20 lg:py-28 relative overflow-hidden font-poppins">
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
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header - Enhanced */}
        <div className="text-center mb-16 sm:mb-20">
          <Badge variant="outline" className="mb-5 text-xs uppercase tracking-wide text-muted-foreground">
            The Power of Small Teams 👥
          </Badge>
          <h2 className="font-space-grotesk text-3xl sm:text-4xl lg:text-5xl font-semibold mb-6 tracking-tight text-primary">
            The Future of Work Is Here
          </h2>
          <p className="font-poppins text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto px-4 leading-relaxed">
            Technology is enabling small teams to build exceptional products and business models that can successfully compete with large enterprises.
          </p>
        </div>

        {/* Key Statistics */}
        {!isMobile && (
          <div ref={chartAnimationRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="border-border/70 bg-card shadow-sm">
              <CardContent className="p-6 text-center">
                <div ref={revenueRef} className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  ${revenueCount.toFixed(1)}M
                </div>
                <div className="text-sm text-muted-foreground mb-1">Revenue Per Employee</div>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-600">4.5x Industry Avg</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card shadow-sm">
              <CardContent className="p-6 text-center">
                <div ref={speedRef} className="text-3xl md:text-4xl font-bold text-muted-foreground mb-2">
                  {speedCount.toFixed(0)}x
                </div>
                <div className="text-sm text-muted-foreground mb-1">Faster Time-to-Market</div>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Zap className="w-4 h-4 text-accent" />
                  <span className="text-xs text-accent">vs Legacy Enterprise</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card shadow-sm">
              <CardContent className="p-6 text-center">
                <div ref={marginRef} className="text-3xl md:text-4xl font-bold text-accent mb-2">
                  {marginCount.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground mb-1">Profit Margins</div>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-600">vs 20% Legacy Avg</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Chart 1: Operational Velocity */}
          <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="font-space-grotesk text-base sm:text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Operational Velocity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartVisible && (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={operationalVelocityData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="nicheGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                        </linearGradient>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis
                        dataKey="year"
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '12px' }}
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
                        dataKey="aiNative"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        className="chart-line"
                        dot={{
                          fill: 'hsl(var(--primary))',
                          r: 5,
                          strokeWidth: 2,
                          stroke: 'hsl(var(--background))',
                          style: {
                            filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.5))',
                            transition: 'all 0.3s ease'
                          }
                        }}
                        activeDot={{
                          r: 7,
                          fill: 'hsl(var(--primary))',
                          stroke: 'hsl(var(--background))',
                          strokeWidth: 2,
                          style: {
                            filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.8))',
                            transition: 'all 0.3s ease'
                          }
                        }}
                        name="AI-Native Teams"
                        animationBegin={0}
                        animationDuration={2500}
                        animationEasing="ease-out"
                        style={{
                          filter: 'drop-shadow(0 2px 4px hsl(var(--primary) / 0.3))',
                          transition: 'all 0.3s ease'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="legacy"
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
                        name="Legacy Enterprise"
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
                Small, AI-native teams are executing 12x faster than legacy enterprises, removing the traditional scale advantage.
              </p>
            </CardContent>
          </Card>

          {/* Chart 2: Market Value Capture */}
          <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="font-space-grotesk text-base sm:text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Market Value Capture
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartVisible && (
                <div className="chart-container" style={{ animationDelay: '0.2s' }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={marketValueData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="specializedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        </linearGradient>
                        <linearGradient id="generalGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.15} />
                        </linearGradient>
                        <filter id="areaGlow">
                          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis
                        dataKey="year"
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
                        dataKey="disrupters"
                        stackId="1"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        fill="url(#specializedGradient)"
                        fillOpacity={0.7}
                        name="Disrupters"
                        className="chart-area"
                        animationBegin={0}
                        animationDuration={2800}
                        animationEasing="ease-out"
                        style={{
                          filter: 'drop-shadow(0 2px 4px hsl(var(--primary) / 0.2))',
                          transition: 'all 0.3s ease'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="incumbents"
                        stackId="1"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2}
                        fill="url(#generalGradient)"
                        fillOpacity={0.4}
                        name="Incumbents"
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
                By 2025, agile disrupters are projected to capture 75% of new market value, leaving incumbents behind.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Narrative Conclusion */}
        <div ref={textSectionRef} className="mt-12 max-w-4xl mx-auto">
          <div className="bg-muted/40 border border-border/70 rounded-lg p-8">
            <h3 className="font-space-grotesk text-2xl font-semibold mb-4 text-center">
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
