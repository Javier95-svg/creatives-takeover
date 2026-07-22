import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from '../_shared/credit-deduction.ts';
import { resolveCreditIdempotencyKey } from '../_shared/request-idempotency.ts';
import { assessPmfEvidence, PMF_SIGNAL_THRESHOLDS } from '../_shared/pmf-evidence.ts';
import { emitBusinessEvent, resolveAnalyticsErrorCode } from '../_shared/analytics.ts';

const MIN_INTERVIEWS_FOR_READY = 25;
const DECISION_GRADE_SIGNAL_THRESHOLD = 25;

function resolvePmfDecision(score: number): 'build' | 'narrow' | 'pivot' | 'stop' {
  if (score >= 75) return 'build';
  if (score >= 60) return 'narrow';
  if (score >= 40) return 'pivot';
  return 'stop';
}

// ─── CORS headers ─────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

// ─── Request / Response types ─────────────────────────────────────────────────
interface PMFEvidenceAnswers {
  testTypes: string[];
  peopleReached: number;
  conversationCount: number;
  interviews: PMFInterviewLog[];
  strongInterestCount: number;
  willingnessToPaySignal: 'yes' | 'no' | 'not_tested';
  willingnessToPayDetail?: string;
  mostPainfulQuote: string;
  urgencyProxy: string;
  consistencyNote: string;
  askedAboutPricing: number;
  joinedWaitlist: number;
  sharedWithSomeone: number;
  offeredToPay: number;
  founderUncertainties: string;
  whatWouldChangeMind: string;
  confidenceLevel: number;
  // Optional context used to fetch external demand evidence (web search)
  businessContext?: {
    productName?: string;
    targetAudience?: string;
    industry?: string;
  };
  // When present and owned by the caller, this run is a free re-score (no credit charge)
  previousAnalysisId?: string;
  // Verified responses from the founder's hosted Sean Ellis survey (real users)
  surveyEvidence?: {
    total: number;
    veryDisappointedPct: number;
    sampleVerbatims: string[];
  };
}

interface MarketEvidenceSource {
  title: string;
  url?: string;
  snippet?: string;
  relevanceScore?: number;
  publishedDate?: string;
}

// Behavioral demand evidence auto-collected from the founder's own Demo Studio
// demos. Fetched server-side (never client-supplied) so it can't be spoofed.
interface DemoEvidence {
  projectCount: number;
  views: number;
  uniqueViewers: number;
  completions: number;
  completionRate: number;
  ctaClicks: number;
  signups: number;
  windowDays: number;
}

// deno-lint-ignore no-explicit-any
async function fetchDemoEvidence(supabase: any, userId: string): Promise<DemoEvidence | null> {
  try {
    const { data: projects } = await supabase
      .from('demo_studio_projects')
      .select('id')
      .eq('owner_id', userId)
      .limit(20);
    const projectIds = ((projects ?? []) as Array<{ id: string }>).map((p) => p.id);
    if (projectIds.length === 0) return null;

    const since = new Date();
    since.setDate(since.getDate() - 90);
    const sinceIso = since.toISOString();

    const [eventsRes, signupsRes] = await Promise.all([
      supabase
        .from('demo_studio_events')
        .select('type, meta')
        .in('project_id', projectIds)
        .gte('created_at', sinceIso)
        .limit(5000),
      supabase
        .from('demo_studio_signups')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .gte('created_at', sinceIso),
    ]);

    const events = (eventsRes.data ?? []) as Array<{ type: string; meta: Record<string, unknown> | null }>;
    const uniqueSessions = (type: string) => {
      const sessions = new Set<string>();
      let count = 0;
      for (const event of events) {
        if (event.type !== type) continue;
        count += 1;
        const sid = event.meta && typeof event.meta['session_id'] === 'string' ? (event.meta['session_id'] as string) : null;
        if (sid) sessions.add(sid);
      }
      return { count, unique: sessions.size || count };
    };

    const views = uniqueSessions('demo_view');
    const completions = uniqueSessions('demo_complete');
    const ctaClicks = events.filter((event) => event.type === 'cta_click').length;
    const signups = (signupsRes.count as number | null) ?? 0;

    if (views.count === 0 && signups === 0) return null;

    return {
      projectCount: projectIds.length,
      views: views.count,
      uniqueViewers: views.unique,
      completions: completions.unique,
      completionRate: views.unique > 0 ? Math.round((completions.unique / views.unique) * 100) : 0,
      ctaClicks,
      signups,
      windowDays: 90,
    };
  } catch (err) {
    console.warn('Demo evidence fetch failed, continuing without it:', err);
    return null;
  }
}

interface PMFInterviewLog {
  id: string;
  intervieweeName: string;
  basicProfile: string;
  segment: string;
  mainFeedback: string;
  objections: string;
  missingFeatures: string;
  interestLevel: number;
  buyingIntent: 'low' | 'medium' | 'high' | 'ready_to_pay';
  landingPageShown: boolean;
  solutionPitched: boolean;
  askedAboutPricing: boolean;
  joinedWaitlist: boolean;
  referredSomeone: boolean;
  offeredToPay: boolean;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: PMFEvidenceAnswers = await req.json();

    // Basic validation
    const rawInterviews = Array.isArray(body.interviews) ? body.interviews : [];
    const preliminaryEvidence = assessPmfEvidence({ interviews: rawInterviews, surveyResponses: 0, verifiedDemoBehaviors: 0, researchSources: 0 });
    const interviews = preliminaryEvidence.uniqueInterviews;
    const loggedInterviewCount = interviews.length || body.conversationCount || 0;

    if (!body.testTypes?.length || loggedInterviewCount < 1) {
      return new Response(JSON.stringify({ error: 'Missing required evidence fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Free re-score (Section C): if a prior analysis owned by this user is referenced,
    // skip the credit charge. Ownership is verified server-side so the flag can't be spoofed.
    let isFreeReScore = false;
    let priorAnalysis: Record<string, unknown> | null = null;
    if (body.previousAnalysisId) {
      try {
        const { data: prior } = await supabase
          .from('pmf_analysis_results' as any)
          .select('id,analysis_data')
          .eq('id', body.previousAnalysisId)
          .eq('user_id', user.id)
          .maybeSingle();
        isFreeReScore = Boolean(prior);
        priorAnalysis = prior?.analysis_data && typeof prior.analysis_data === 'object'
          ? prior.analysis_data as Record<string, unknown>
          : null;
      } catch (ownershipErr) {
        console.warn('Re-score ownership check failed, charging as a normal run:', ownershipErr);
        isFreeReScore = false;
      }
    }

    // First-score gift: every account's first evidence score is free, so
    // idea-stage founders meet the tool's value before any credit charge.
    // Atomic insert makes the claim race-safe (same table the Tech Stack
    // first-build gift uses; server-side because the charge is server-side).
    let isFirstScoreGift = false;
    if (!isFreeReScore) {
      const { data: gift, error: giftError } = await supabase
        .from('feature_gifts' as any)
        .insert({ user_id: user.id, feature: 'PMF_SCORING' } as any)
        .select('user_id')
        .maybeSingle();
      if (giftError) {
        // Conflict (already claimed) or any other failure: charge normally.
        isFirstScoreGift = false;
      } else {
        isFirstScoreGift = Boolean(gift);
      }
    }

    const creditCost = CREDIT_COSTS.PMF_SCORING;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let creditResult: any = { success: true };
    let chargedCredits = 0;

    if (!isFreeReScore && !isFirstScoreGift) {
      const idempotencyKey = await resolveCreditIdempotencyKey(req, {
        userId: user.id,
        feature: 'PMF_SCORING',
        requestFingerprint: {
          testTypes: body.testTypes,
          conversationCount: loggedInterviewCount,
          peopleReached: body.peopleReached,
          strongInterestCount: body.strongInterestCount,
          demandSignals: {
            askedAboutPricing: body.askedAboutPricing,
            joinedWaitlist: body.joinedWaitlist,
            sharedWithSomeone: body.sharedWithSomeone,
            offeredToPay: body.offeredToPay,
          },
        },
      });
      creditResult = await checkAndDeductCredits(
        user.id,
        creditCost,
        'PMF Evidence Analysis',
        undefined,
        { testTypes: body.testTypes, idempotencyKey, entitlementFeature: 'PMF_SCORING' }
      );
      chargedCredits = (creditResult.usedFromQuota ?? 0) + (creditResult.usedFromBalance ?? 0);

      if (!creditResult.success) {
        return new Response(JSON.stringify({
          error: creditResult.error || 'Credit deduction failed',
          creditError: true,
          errorCode: creditResult.errorCode,
          requiredTier: creditResult.requiredTier,
          requiredCredits: creditCost,
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error('OpenAI API key not configured');

    const derivedStrongInterestCount = interviews.filter(
      (item) => item.interestLevel >= 4 || item.buyingIntent === 'high' || item.buyingIntent === 'ready_to_pay'
    ).length;
    const derivedAskedAboutPricing = interviews.filter((item) => item.askedAboutPricing).length;
    const derivedJoinedWaitlist = interviews.filter((item) => item.joinedWaitlist).length;
    const derivedSharedWithSomeone = interviews.filter((item) => item.referredSomeone).length;
    const derivedOfferedToPay = interviews.filter((item) => item.offeredToPay).length;
    const strongInterestCount = interviews.length > 0 ? derivedStrongInterestCount : (body.strongInterestCount || 0);
    const askedAboutPricing = interviews.length > 0 ? derivedAskedAboutPricing : (body.askedAboutPricing || 0);
    const joinedWaitlist = interviews.length > 0 ? derivedJoinedWaitlist : (body.joinedWaitlist || 0);
    const sharedWithSomeone = interviews.length > 0 ? derivedSharedWithSomeone : (body.sharedWithSomeone || 0);
    const offeredToPay = interviews.length > 0 ? derivedOfferedToPay : (body.offeredToPay || 0);
    const demandTotal = askedAboutPricing + joinedWaitlist + sharedWithSomeone + offeredToPay;
    const wtpDetail = body.willingnessToPaySignal === 'yes' && body.willingnessToPayDetail
      ? body.willingnessToPayDetail
      : body.willingnessToPaySignal === 'no' ? 'No WTP signal observed'
      : 'Not tested yet';
    const interviewLogSummary = interviews.length > 0
      ? interviews.map((interview, index) => (
          `${index + 1}. ${interview.intervieweeName} | Segment: ${interview.segment} | Profile: ${interview.basicProfile}\n` +
          `   Main feedback: ${interview.mainFeedback}\n` +
          `   Objections: ${interview.objections}\n` +
          `   Missing features: ${interview.missingFeatures}\n` +
          `   Interest level: ${interview.interestLevel}/5 | Buying intent: ${interview.buyingIntent}\n` +
          `   Landing page shown: ${interview.landingPageShown ? 'yes' : 'no'} | Solution pitched: ${interview.solutionPitched ? 'yes' : 'no'}\n` +
          `   Demand behaviors: pricing=${interview.askedAboutPricing ? 'yes' : 'no'}, waitlist=${interview.joinedWaitlist ? 'yes' : 'no'}, referral=${interview.referredSomeone ? 'yes' : 'no'}, pay=${interview.offeredToPay ? 'yes' : 'no'}`
        )).join('\n\n')
      : 'No structured interview records provided.';

    // ─── Evidence-backed scoring: on-demand external demand signal (best-effort) ───
    // Reuses the existing `web-search` function (Perplexity). Never blocks scoring —
    // if it fails or PERPLEXITY_API_KEY is unset, we degrade gracefully to "no citations".
    const ctx = body.businessContext ?? {};
    const productLabel = ctx.productName || ctx.targetAudience || (body.testTypes?.[0] ?? 'this product');
    let marketSources: MarketEvidenceSource[] = [];
    try {
      const painSeed = (body.mostPainfulQuote || body.urgencyProxy || body.consistencyNote || '').slice(0, 220);
      if (painSeed.trim().length > 0) {
        const audience = ctx.targetAudience ? ` among ${ctx.targetAudience}` : '';
        const searchQuery = `Are people discussing this problem${audience}: "${painSeed}". Real complaints, current workarounds, alternatives they already pay for, and willingness to pay for ${productLabel}.`;
        const searchResp = await fetch(`${supabaseUrl}/functions/v1/web-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
          },
          body: JSON.stringify({
            query: searchQuery,
            maxResults: 5,
            searchRecency: 'year',
            businessContext: ctx.industry ? { industry: ctx.industry } : undefined,
          }),
        });
        if (searchResp.ok) {
          const searchJson = await searchResp.json();
          const hostOf = (u: string) => {
            try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; }
          };
          if (searchJson?.success) {
            const rawSources: MarketEvidenceSource[] = Array.isArray(searchJson.sources) ? searchJson.sources : [];
            const citationUrls: string[] = Array.isArray(searchJson.citations) ? searchJson.citations : [];
            marketSources = rawSources
              .slice(0, 5)
              .map((s, i) => {
                const url = s.url || citationUrls[i] || undefined;
                const isPlaceholderTitle = !s.title || /^Source \d+$/.test(s.title);
                return {
                  title: isPlaceholderTitle && url ? hostOf(url) : (s.title || hostOf(url || '')),
                  url,
                  snippet: s.snippet,
                  relevanceScore: s.relevanceScore,
                  publishedDate: s.publishedDate,
                };
              })
              .filter((s) => Boolean(s.url) || Boolean(s.snippet));
            // Fall back to raw citation URLs if no structured sources came back
            if (marketSources.length === 0 && citationUrls.length > 0) {
              marketSources = citationUrls.slice(0, 5).map((u) => ({ title: hostOf(u), url: u }));
            }
          }
        } else {
          console.warn('web-search returned non-OK status:', searchResp.status);
        }
      }
    } catch (searchErr) {
      console.warn('web-search failed, continuing without external evidence:', searchErr);
    }

    const externalEvidenceBlock = marketSources.length > 0
      ? marketSources
          .map((s, i) => `[${i + 1}] ${s.title}${s.url ? ` (${s.url})` : ''}\n    ${(s.snippet || '').slice(0, 240)}`)
          .join('\n')
      : 'No external web evidence was retrieved for this run.';

    // Verified responses from the founder's hosted Sean Ellis survey (real users).
    const survey = body.surveyEvidence;
    const surveyBlock = survey && survey.total > 0
      ? `${survey.total} real users completed the founder's product survey. ${survey.veryDisappointedPct}% said they would be VERY disappointed without the product (Sean Ellis PMF benchmark is 40%).` +
        (survey.sampleVerbatims?.length
          ? `\nSample verbatims:\n${survey.sampleVerbatims.slice(0, 5).map((v) => `  • "${String(v).slice(0, 220)}"`).join('\n')}`
          : '')
      : 'No hosted survey responses were collected for this run.';

    // Behavioral demand evidence from the founder's live Demo Studio demos,
    // fetched server-side so it is verified by the platform rather than typed in.
    const demoEvidence = await fetchDemoEvidence(supabase, user.id);
    const demoBlock = demoEvidence
      ? `Auto-collected from the founder's live Demo Studio demos over the last ${demoEvidence.windowDays} days (${demoEvidence.projectCount} project${demoEvidence.projectCount === 1 ? '' : 's'}):
• Demo views: ${demoEvidence.views} (${demoEvidence.uniqueViewers} unique viewers)
• Demo completions: ${demoEvidence.completions} (${demoEvidence.completionRate}% completion rate)
• CTA clicks after watching: ${demoEvidence.ctaClicks}
• Leads/signups captured: ${demoEvidence.signups}`
      : 'No live demo behavioral data was available for this run.';

    // Evidence sources have different strength. Interviews are the unit weight;
    // hosted survey responses and verified product behavior carry 0.75 each;
    // corroborating research carries 0.25 and can never substitute for direct proof.
    const surveySignalCount = survey?.total ?? 0;
    const demoBehaviorSignalCount = demoEvidence
      ? Math.min(10, Math.max(demoEvidence.completions, demoEvidence.ctaClicks, demoEvidence.signups))
      : 0;
    const researchSignalCount = marketSources.length;
    const evidenceAssessment = assessPmfEvidence({
      interviews,
      surveyResponses: surveySignalCount,
      verifiedDemoBehaviors: demoBehaviorSignalCount,
      researchSources: researchSignalCount,
    });
    const weightedEvidenceSignalCount = evidenceAssessment.weightedSignals;
    const evidenceGrade = evidenceAssessment.grade;
    const scoreCap = evidenceGrade === 'decision_grade'
      ? 100
      : evidenceGrade === 'emerging'
        ? 74
        : evidenceGrade === 'directional'
          ? 59
          : 49;

    const systemPrompt = `You are PMF Lab, a rigorous PMF (Product-Market Fit) evidence evaluator inside a startup development platform. Founders use you in Stage III: Validation, after they already created a landing page in Stage II: Prototyping. Your job is to evaluate the QUALITY of customer-demand evidence — not the idea itself — and produce a PMF score from 0 to 100.

IMPORTANT PRODUCT RULES:
• PMF Lab is designed around real founder interviews plus landing-page feedback.
• Use the structured interview log as the PRIMARY source of truth. Treat high-level founder summaries as supporting context only.
• Use the weighted evidence ladder: 5 signals are directional, 10 reveal emerging patterns, and 25 are decision grade.
• This run has ${weightedEvidenceSignalCount} weighted signals and is ${evidenceGrade.replace('_', ' ')}.
• The score cap for this evidence grade is ${scoreCap}. Never recommend moving to Building before decision grade.
• Interviews remain the strongest individual source, but hosted surveys, verified demo behavior, and corroborating research must influence the report with the weights supplied below.
• If the founder logs many interviews but the records are thin, vague, repetitive, or missing objections/missing-feature detail, lower the score for evidence quality.

SPECIFICITY RULES — these are non-negotiable:
• When writing summaryInsight, strengths, gaps, diagnosis, or contradictions: reference specific interviewees by name and segment when the interview log supports it. Do NOT use phrases like "several participants", "some users", or "many interviewees". Name the pattern AND the person. Example: "Maria Gomez (B2B agency owner) and two others independently raised the same Slack integration blocker."
• scoreMeaning must be specific to the actual score value and the evidence submitted. Do not use generic template phrases like "your interviews show enough pain". Connect the score to what was actually found.
• nextExperiment must describe a specific test the founder can run given their actual product, segments, and gaps. It must never be a generic instruction like "run more interviews".

SCORING RUBRIC — five dimensions, each 0–20 points:

1. PAIN CLARITY (0–20)
   • 18–20: Highly specific, recurring pain described by multiple people with exact words or examples (e.g., "I lose 2 hours every Friday chasing feedback in email threads")
   • 12–17: Clear pain but not specific enough, OR came from only 1–2 people
   • 6–11: Vague or generic pain ("it's annoying", "could be better") — hard to build from
   • 0–5: No clear pain articulated

2. URGENCY (0–20)
   • 18–20: People are actively doing something about this today (workarounds, paying for alternatives, spending time on it)
   • 12–17: Strong frustration but no observed active behavior to address it
   • 6–11: "Would be nice to solve" — latent awareness, no urgency
   • 0–5: No urgency signal at all; nice-to-have at best

3. CONSISTENCY (0–20)
   • 18–20: 5+ people independently said similar things without prompting
   • 12–17: 3–4 people showed similar patterns
   • 6–11: 1–2 agreements; others had mixed or different responses
   • 0–5: Scattered results, no common thread across people

4. DEMAND PROOF (0–20)
   • 18–20: Money committed, pre-orders taken, or multiple people actively asked about pricing
   • 12–17: Waitlist signups, "when will this be ready?", or shared with peers
   • 6–11: People said "I would use it" or "sounds interesting" — no behavior
   • 0–5: No concrete demand behavior — only verbal agreement or theoretical interest

5. FOUNDER SELF-AWARENESS (0–20)
   • 18–20: Clearly identifies specific remaining unknowns AND what evidence would change their mind
   • 12–17: Knows some gaps but vague about next steps
   • 6–11: Overconfident OR says "I don't know" without specifics
   • 0–5: No reflection on what they still don't know; treating evidence as definitive

TOTAL SCORE = sum of 5 dimensions (0–100)

VERDICT RULES:
• 75–100: verdict = "ready", verdictLabel = "Strong Validation"
• 50–74: verdict = "partial", verdictLabel = "Partial Validation"
• 0–49: verdict = "weak", verdictLabel = "Insufficient Evidence"

DECISION RULES:
• Choose one decision from Build, Narrow, Pivot, or Stop based on the dimension pattern.
• Build requires overallScore >= 75 and at least ${DECISION_GRADE_SIGNAL_THRESHOLD} weighted signals.
• Narrow fits a validated pain with an overly broad segment or inconsistent pattern.
• Pivot fits evidence that the pain or solution framing is materially wrong but a better direction is visible.
• Stop fits weak urgency and demand with no credible adjacent direction after decision-grade evidence.
• Before decision grade, the decision is explicitly provisional and recommendedAction remains "iterate_before_building".

RECOMMENDATION RULES:
• Generate 3–5 recommendations ordered by urgency
• For any dimension < 8: priority = "critical" (blocking — must resolve before building)
• For any dimension 8–13: priority = "important"
• For score ≥ 75 but a dimension could be stronger: priority = "nice"
• Each recommendation must be specific and executable — no generic advice like "talk to more users"
• The "action" field must be a concrete thing to do (e.g., "DM 10 ops managers on LinkedIn using this exact opening: 'Hey [name], how do you currently track...'")
• Always include at least one "critical" recommendation even if all dimensions score above 8 — there is always one highest-leverage action

DIAGNOSIS RULES:
• diagnosis is a 3–5 sentence paragraph that synthesizes the five dimension scores into a specific pattern interpretation. It goes beyond describing what was found and explains what the pattern means for this specific product and founder. Example: "You have genuine pain signal (Pain Clarity: 16) but the buying intent is weak (Demand Proof: 7). This gap typically means the problem is real but your current solution framing is not landing as the obvious fix. The segment consistency is also low, which suggests you may be reaching too broad a range of profiles — the pain is real for some but not acute enough for others to act."

CONTRADICTION RULES:
• contradictions is an array of 1–2 specific tensions in the evidence. A contradiction is when two signals point in opposite directions and together reveal something important the founder should address. Examples:
  - "High urgency (16/20) but zero demand behaviors (no pricing asks, no waitlist signups) — this means people feel the pain but do not yet see your solution as the fix."
  - "Three interviewees said they would pay, but the same three also listed missing integrations as blockers. This suggests willingness to pay is conditional, not confirmed."
• If there are no genuine contradictions, return an empty array.

OUTPUT: Return ONLY valid JSON matching this exact schema:

{
  "overallScore": number,
  "verdict": "ready" | "partial" | "weak",
  "verdictLabel": "Strong Validation" | "Partial Validation" | "Insufficient Evidence",
  "summaryInsight": "string — 2–3 sentences grounded in specific evidence from the interview log",
  "scoreMeaning": "string — specific to this score and evidence; explain what it means for this founder right now, not generically",
  "diagnosis": "string — 3–5 sentence paragraph synthesizing the dimension pattern into a specific product/founder interpretation",
  "recommendedAction": "move_to_building" | "iterate_before_building",
  "recommendedActionTitle": "Move to Building" | "Iterate Before Building",
  "decision": "build" | "narrow" | "pivot" | "stop",
  "evidenceGrade": "insufficient" | "directional" | "emerging" | "decision_grade",
  "evidenceSignalCount": number,
  "decisionProvisional": boolean,
  "dimensions": {
    "painClarity":          { "score": number, "explanation": "string — 1–2 sentences on what specific evidence supports or hurts this score" },
    "urgency":              { "score": number, "explanation": "string" },
    "consistency":          { "score": number, "explanation": "string" },
    "demandProof":          { "score": number, "explanation": "string" },
    "founderSelfAwareness": { "score": number, "explanation": "string" }
  },
  "contradictions": ["string — 1–2 specific tensions in the evidence; empty array if none"],
  "strengths": ["string — reference named interviewees where applicable"],
  "gaps": ["string — reference named interviewees where applicable"],
  "missingFeatures": ["string — what specific users said is missing before they would adopt or buy"],
  "commonObjections": ["string — recurring objections with context about who raised them"],
  "buyingSignals": ["string — strongest specific evidence of real demand or intent"],
  "improvementsBeforeRetest": ["string — specific thing to change before the next interview round"],
  "recommendations": [
    {
      "priority": "critical" | "important" | "nice",
      "title": "string — short action name",
      "action": "string — exactly what to do, specific enough to start tomorrow",
      "timeframe": "string — e.g. This week / 2–3 weeks / Before MVP scope"
    }
  ],
  "readyToScope": boolean,
  "nextExperiment": "string — specific test to run next given the actual product, segments, and gaps found; never generic",
  "marketEvidenceSummary": "string — 1–2 sentences on whether the live external web signal corroborates or contradicts the founder's reported evidence; cite source numbers like [1], [2]. Empty string if no external evidence was provided."
}`;

    const userPrompt = `EVIDENCE SUBMITTED BY FOUNDER:

Validation methods used: ${body.testTypes.join(', ')}
People reached/contacted: ${body.peopleReached}
Actual conversations/responses: ${loggedInterviewCount}
People expressing strong interest: ${strongInterestCount}
Willingness to pay signal: ${wtpDetail}
Minimum interview threshold to move to Building: ${MIN_INTERVIEWS_FOR_READY}
Weighted evidence signals: ${weightedEvidenceSignalCount}
Evidence grade: ${evidenceGrade.replace('_', ' ')}
Signal ladder: ${PMF_SIGNAL_THRESHOLDS.directional} directional, ${PMF_SIGNAL_THRESHOLDS.emerging} emerging patterns, ${DECISION_GRADE_SIGNAL_THRESHOLD} decision grade
Source weights in this run: ${loggedInterviewCount} interviews × 1.0, ${surveySignalCount} hosted survey responses × 0.75, ${demoBehaviorSignalCount} verified demo behaviors × 0.75, ${researchSignalCount} research sources × 0.25

STRUCTURED INTERVIEW LOG:
${interviewLogSummary}

WHAT THEY HEARD:
Most painful quote/pattern: "${body.mostPainfulQuote}"
What people do today to solve this and how urgent it feels: "${body.urgencyProxy}"
Repeated objections, missing features, or consistency observation: "${body.consistencyNote}"

DEMAND SIGNALS:
• Asked about pricing: ${askedAboutPricing}
• Joined waitlist or signed up: ${joinedWaitlist}
• Shared with someone else: ${sharedWithSomeone}
• Offered to pay or pre-commit: ${offeredToPay}
Total demand behaviors: ${demandTotal}

FOUNDER REFLECTION:
What I'm still unsure about: "${body.founderUncertainties}"
What would change my mind: "${body.whatWouldChangeMind}"
Confidence level (1–10): ${body.confidenceLevel}

EXTERNAL DEMAND SIGNAL (live web search, ${marketSources.length} source${marketSources.length === 1 ? '' : 's'}):
${externalEvidenceBlock}

REAL USER SURVEY (hosted Sean Ellis test):
${surveyBlock}

LIVE DEMO BEHAVIOR (verified by the platform, not self-reported):
${demoBlock}

When scoring DEMAND PROOF and CONSISTENCY, and when writing the diagnosis, explicitly note whether this external signal corroborates or contradicts the founder's reported evidence, and reference source numbers like [1], [2] where relevant. Populate marketEvidenceSummary accordingly (empty string if no external evidence was retrieved). Do NOT inflate scores solely because external interest exists — the founder's own structured interviews remain the primary source of truth. The REAL USER SURVEY, however, IS first-class direct demand evidence: when present, weight it heavily in Demand Proof and Consistency (a survey ≥40% "very disappointed" is a strong positive signal; well below 40% is a strong negative one) and reference the % and verbatims explicitly.

LIVE DEMO BEHAVIOR is also first-class BEHAVIORAL evidence — people acted, they didn't just talk. When present: demo completions, CTA clicks, and captured leads/signups strengthen Demand Proof (reference the actual numbers). A low completion rate (<30%) on 20+ unique viewers is a negative signal about solution framing and belongs in gaps or contradictions. Raw demo views alone are reach, not demand — never count views by themselves as demand behavior.

Apply the scoring rubric to this evidence and return the PMF readiness JSON. Make the final recommendation founder-friendly and concrete.`;

    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 3500,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error('OpenAI API Error:', errorText);
        throw new Error(`OpenAI API Error: ${openaiResponse.status}`);
      }

      const aiData = await openaiResponse.json();
      let analysis;

      try {
        analysis = JSON.parse(aiData.choices[0].message.content);
      } catch {
        const content = aiData.choices[0].message.content;
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Failed to parse AI response as JSON');
        }
      }

      // Enforce the evidence ladder deterministically after generation. The
      // model explains the evidence; it cannot promote a provisional sample to
      // decision grade or bypass the score cap.
      const rawScore = typeof analysis.overallScore === 'number'
        ? Math.max(0, Math.min(100, Math.round(analysis.overallScore)))
        : 0;
      analysis.overallScore = Math.min(rawScore, scoreCap);
      analysis.evidenceGrade = evidenceGrade;
      analysis.evidenceSignalCount = weightedEvidenceSignalCount;
      analysis.directEvidenceSignalCount = evidenceAssessment.directWeightedSignals;
      analysis.independentInterviewCount = evidenceAssessment.independentInterviewCount;
      analysis.duplicateEvidenceCount = preliminaryEvidence.duplicateEvidenceCount;
      analysis.interviewQualityWeights = evidenceAssessment.interviewWeights;
      analysis.decisionProvisional = evidenceGrade !== 'decision_grade';
      analysis.evidenceBreakdown = {
        interviews: { count: loggedInterviewCount, weight: 1 },
        hostedSurveyResponses: { count: surveySignalCount, weight: 0.75 },
        verifiedDemoBehaviors: { count: demoBehaviorSignalCount, weight: 0.75 },
        corroboratingResearch: { count: researchSignalCount, weight: 0.25 },
      };
      analysis.decision = resolvePmfDecision(analysis.overallScore);
      analysis.verdict = analysis.overallScore >= 75 ? 'ready' : analysis.overallScore >= 50 ? 'partial' : 'weak';
      analysis.verdictLabel = analysis.verdict === 'ready'
        ? 'Strong Validation'
        : analysis.verdict === 'partial'
          ? 'Partial Validation'
          : 'Insufficient Evidence';
      const decisionTitles = {
        build: 'Build from Validated Evidence',
        narrow: 'Narrow the Customer or Promise',
        pivot: 'Pivot the Problem or Solution',
        stop: 'Stop and Reassess the Opportunity',
      } as const;
      analysis.recommendedAction = analysis.decision === 'build' && evidenceGrade === 'decision_grade'
        ? 'move_to_building'
        : 'iterate_before_building';
      analysis.recommendedActionTitle = evidenceGrade === 'decision_grade'
        ? decisionTitles[analysis.decision as keyof typeof decisionTitles]
        : `Provisional: ${decisionTitles[analysis.decision as keyof typeof decisionTitles]}`;
      analysis.readyToScope = analysis.recommendedAction === 'move_to_building';
      if (priorAnalysis) {
        const previousScore = Number(priorAnalysis.overallScore ?? 0);
        const previousDecision = String(priorAnalysis.decision ?? 'unknown');
        const changedDimensions = Object.entries(analysis.dimensions ?? {})
          .map(([key, value]) => {
            const nextScore = Number((value as Record<string, unknown>)?.score ?? 0);
            const previousDimensions = priorAnalysis?.dimensions as Record<string, Record<string, unknown>> | undefined;
            const priorScore = Number(previousDimensions?.[key]?.score ?? 0);
            return { dimension: key, previousScore: priorScore, nextScore, delta: nextScore - priorScore };
          })
          .filter((item) => item.delta !== 0);
        analysis.decisionChange = {
          previousDecision,
          nextDecision: analysis.decision,
          previousScore,
          nextScore: analysis.overallScore,
          scoreDelta: analysis.overallScore - previousScore,
          changedDimensions,
          explanation: previousDecision === analysis.decision
            ? `The ${analysis.decision} decision stayed stable while the evidence score changed by ${analysis.overallScore - previousScore} points.`
            : `The recommendation changed from ${previousDecision} to ${analysis.decision} because the newly weighted evidence changed the score and dimension pattern.`,
        };
      }

      // Attach evidence answers, external citations, and timestamp
      analysis.evidenceAnswers = body;
      analysis.generatedAt = new Date().toISOString();
      if (demoEvidence) analysis.demoEvidence = demoEvidence;
      analysis.dataSources = marketSources.map((s) => ({
        title: s.title,
        url: s.url,
        sourceType: 'web' as const,
        snippet: s.snippet,
        relevance: typeof s.relevanceScore === 'number' ? s.relevanceScore : undefined,
        publishedDate: s.publishedDate,
      }));
      if (typeof analysis.marketEvidenceSummary !== 'string') analysis.marketEvidenceSummary = '';

      // Store to pmf_analysis_results (each run inserts a new row → enables score trend)
      const businessDescription =
        [ctx.productName, ctx.targetAudience].filter(Boolean).join(' — ') ||
        (body.mostPainfulQuote ? `Problem: ${body.mostPainfulQuote}`.slice(0, 500) : null);
      const demandProofScore = analysis?.dimensions?.demandProof?.score;
      const demandScore =
        typeof demandProofScore === 'number'
          ? Math.max(0, Math.min(100, demandProofScore * 5))
          : null;
      const dataSourcesPayload = [
        { name: 'AI Analysis', type: 'ai_inference', reliability_score: 70 },
        ...marketSources.map((s) => ({
          title: s.title,
          url: s.url,
          sourceType: 'web',
          type: 'web_search',
          snippet: s.snippet,
          relevance: typeof s.relevanceScore === 'number' ? s.relevanceScore : undefined,
        })),
      ];

      let analysisId: string | null = null;
      try {
        const { data: storedData, error: storeError } = await supabase
          .from('pmf_analysis_results' as any)
          .insert({
            user_id: user.id,
            business_description: businessDescription,
            industry: ctx.industry || null,
            analysis_data: analysis,
            pmf_score: analysis.overallScore,
            demand_score: demandScore,
            data_sources: dataSourcesPayload,
            target_market: ctx.targetAudience || body.testTypes.join(', '),
          })
          .select('id')
          .single();

        if (!storeError && storedData) {
          analysisId = (storedData as any).id;
        } else {
          console.warn('Failed to store PMF analysis:', storeError);
        }
      } catch (storeError) {
        console.warn('Error storing PMF analysis:', storeError);
      }

      try {
        const { error: evidenceError } = await supabase
          .from('pmf_validation_evidence' as any)
          .upsert({
            user_id: user.id,
            interview_notes_count: loggedInterviewCount,
            required_signals: MIN_INTERVIEWS_FOR_READY,
          }, { onConflict: 'user_id' });
        if (evidenceError) {
          console.warn('Failed to update PMF validation evidence:', evidenceError);
        }
      } catch (evidenceError) {
        console.warn('Error updating PMF validation evidence:', evidenceError);
      }

      return new Response(JSON.stringify({
        success: true,
        analysis,
        analysisId,
        creditsUsed: chargedCredits,
        newBalance: creditResult.newBalance,
        giftUsed: isFirstScoreGift,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (aiError) {
      const err = aiError instanceof Error ? aiError : new Error(String(aiError));
      const refundSucceeded = chargedCredits > 0
        ? await refundCredits(user.id, chargedCredits, 'PMF Evidence Analysis', 'Refund: AI processing failed', { error: err.message })
        : true;
      await emitBusinessEvent({
        eventName: 'generation_failed',
        userId: user.id,
        properties: {
          tool: 'pmf_lab',
          error_code: resolveAnalyticsErrorCode(aiError),
          credits_refunded: refundSucceeded ? chargedCredits : 0,
        },
      });
      // A failed run must not consume the free first score.
      if (isFirstScoreGift) {
        await supabase
          .from('feature_gifts' as any)
          .delete()
          .eq('user_id', user.id)
          .eq('feature', 'PMF_SCORING');
      }
      throw aiError;
    }

  } catch (error) {
    console.error('Error in pmf-evidence-scorer:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
