import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { withErrorBoundary, logInfo } from "../_shared/logger.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { checkAndDeductCredits, getUserFromAuth } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PDFRequest {
  reportContent: string;
  businessName: string;
  userAnswers: {
    overview: string;
    market: string;
    problem: string;
    solution: string;
    channels: string;
    pricing: string;
    goals: string;
  };
  successScore?: any;
  validationScore?: {
    reddit_discussions?: any[];
  };
}

serve(withErrorBoundary(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return withIdempotency(req, 'generate-pdf-report', async () => {
    // Authenticate user
    const user = await getUserFromAuth(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check and deduct credits before processing
    const creditCost = CREDIT_COSTS.PDF_EXPORT;
    const creditCheck = await checkAndDeductCredits(
      user.id,
      creditCost,
      'PDF Export'
    );

    if (!creditCheck.success) {
      return new Response(
        JSON.stringify({ 
          error: creditCheck.error || 'Insufficient credits',
          required: creditCost
        }),
        { 
          status: creditCheck.errorCode === 'INSUFFICIENT_CREDITS' ? 402 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { reportContent, businessName, userAnswers, successScore, validationScore }: PDFRequest = await req.json();
    logInfo('pdf:request_received', { hasScore: Boolean(successScore), hasRedditData: Boolean(validationScore?.reddit_discussions?.length) });

    // Generate enhanced PDF content with professional formatting
    const enhancedPDFContent = generateProfessionalPDFContent(reportContent, businessName, userAnswers, successScore, validationScore);

    // Use Puppeteer to generate PDF from HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              margin: 0; 
              padding: 40px; 
              line-height: 1.6; 
              color: #333;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #6366f1; 
              padding-bottom: 20px; 
              margin-bottom: 30px; 
            }
            .logo { 
              font-size: 28px; 
              font-weight: bold; 
              color: #6366f1; 
              margin-bottom: 10px; 
            }
            .business-name { 
              font-size: 24px; 
              color: #1f2937; 
              margin-bottom: 5px; 
            }
            .report-date { 
              color: #6b7280; 
              font-size: 14px; 
            }
            .score-section {
              background: linear-gradient(135deg, #6366f1, #8b5cf6);
              color: white;
              padding: 20px;
              border-radius: 10px;
              margin: 20px 0;
              text-align: center;
            }
            .score-number {
              font-size: 48px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .section { 
              margin-bottom: 25px; 
            }
            .section h2 { 
              color: #6366f1; 
              border-left: 4px solid #6366f1; 
              padding-left: 15px; 
              margin-bottom: 15px; 
            }
            .section h3 { 
              color: #1f2937; 
              margin-bottom: 10px; 
            }
            .highlight-box { 
              background: #f8fafc; 
              border-left: 4px solid #6366f1; 
              padding: 15px; 
              margin: 15px 0; 
            }
            .action-item { 
              background: #fef3c7; 
              border-left: 4px solid #f59e0b; 
              padding: 10px; 
              margin: 10px 0; 
            }
            .footer { 
              text-align: center; 
              margin-top: 40px; 
              padding-top: 20px; 
              border-top: 1px solid #e5e7eb; 
              color: #6b7280; 
              font-size: 12px; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 15px 0; 
            }
            th, td { 
              border: 1px solid #e5e7eb; 
              padding: 10px; 
              text-align: left; 
            }
            th { 
              background: #f9fafb; 
              font-weight: bold; 
            }
            .page-break { 
              page-break-before: always; 
            }
            @media print {
              body { margin: 0; }
              .page-break { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          ${enhancedPDFContent}
        </body>
      </html>
    `;

    // For now, return the HTML content - in production you'd use Puppeteer
    // This allows the frontend to generate the PDF using jsPDF or similar
    return new Response(JSON.stringify({ 
      success: true, 
      htmlContent: htmlContent,
      pdfReady: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  });
}, { fn: 'generate-pdf-report' }));

function generateProfessionalPDFContent(reportContent: string, businessName: string, userAnswers: any, successScore: any) {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `
    <div class="header">
      <div class="logo">BizMap AI</div>
      <div class="business-name">${businessName || 'Business Launch Report'}</div>
      <div class="report-date">Generated on ${currentDate}</div>
    </div>

    ${successScore ? `
    <div class="score-section">
      <div class="score-number">${Math.round(successScore.overall_score || 0)}</div>
      <div>Overall Success Score</div>
      <div style="font-size: 14px; margin-top: 10px;">
        Risk Level: ${successScore.risk_assessment || 'Medium'} • 
        Success Likelihood: ${successScore.success_likelihood || 'Moderate'}
      </div>
    </div>
    ` : ''}

    <div class="section">
      <h2>📊 Business Overview</h2>
      <div class="highlight-box">
        <strong>Business Concept:</strong> ${userAnswers.overview}
      </div>
      <div class="highlight-box">
        <strong>Target Market:</strong> ${userAnswers.market}
      </div>
      <div class="highlight-box">
        <strong>Problem Being Solved:</strong> ${userAnswers.problem}
      </div>
    </div>

    <div class="page-break"></div>

    <div class="section">
      <h2>🚀 Solution & Strategy</h2>
      <div class="highlight-box">
        <strong>Solution Approach:</strong> ${userAnswers.solution}
      </div>
      <div class="highlight-box">
        <strong>Marketing Channels:</strong> ${userAnswers.channels}
      </div>
      <div class="highlight-box">
        <strong>Pricing Strategy:</strong> ${userAnswers.pricing}
      </div>
      <div class="highlight-box">
        <strong>Goals & Objectives:</strong> ${userAnswers.goals}
      </div>
    </div>

    ${successScore && successScore.key_strengths ? `
    <div class="section">
      <h2>💪 Key Strengths</h2>
      ${successScore.key_strengths.map((strength: string) => `
        <div class="highlight-box">✅ ${strength}</div>
      `).join('')}
    </div>
    ` : ''}

    ${successScore && successScore.improvement_areas ? `
    <div class="section">
      <h2>📈 Areas for Improvement</h2>
      ${successScore.improvement_areas.map((improvement: string) => `
        <div class="action-item">⚠️ ${improvement}</div>
      `).join('')}
    </div>
    ` : ''}

    <div class="page-break"></div>

    <div class="section">
      <h2>📋 Detailed Launch Report</h2>
      <div style="white-space: pre-wrap; line-height: 1.8;">
        ${reportContent.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
      </div>
    </div>

    ${successScore && successScore.action_recommendations ? `
    <div class="section">
      <h2>🎯 Next Steps</h2>
      ${successScore.action_recommendations.map((action: string, index: number) => `
        <div class="action-item">
          <strong>Step ${index + 1}:</strong> ${action}
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${validationScore?.reddit_discussions && validationScore.reddit_discussions.length > 0 ? `
    <div class="page-break"></div>
    <div class="section">
      <h2>🔍 Reddit Community Insights</h2>
      <p style="margin-bottom: 20px; color: #6b7280;">
        Real discussions from Reddit communities analyzing your business idea. These insights provide valuable market validation data.
      </p>
      
      <div style="margin-bottom: 20px;">
        <h3 style="color: #6366f1; margin-bottom: 10px;">Summary Statistics</h3>
        <table>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
          <tr>
            <td>Total Reddit Posts Analyzed</td>
            <td>${validationScore.reddit_discussions.length}</td>
          </tr>
          <tr>
            <td>Demand Signals (Positive Sentiment)</td>
            <td>${validationScore.reddit_discussions.filter((p: any) => p.sentiment === 'positive').length}</td>
          </tr>
          <tr>
            <td>Total Community Engagement</td>
            <td>${validationScore.reddit_discussions.reduce((sum: number, p: any) => sum + (p.upvotes || 0), 0)} upvotes, ${validationScore.reddit_discussions.reduce((sum: number, p: any) => sum + (p.comments || 0), 0)} comments</td>
          </tr>
        </table>
      </div>

      <h3 style="color: #6366f1; margin-bottom: 10px; margin-top: 20px;">Top Relevant Discussions</h3>
      ${validationScore.reddit_discussions
        .sort((a: any, b: any) => (b.relevance_score || 0) - (a.relevance_score || 0))
        .slice(0, 5)
        .map((post: any, idx: number) => `
        <div class="highlight-box" style="margin-bottom: 15px;">
          <strong>${idx + 1}. ${post.title}</strong><br>
          <span style="color: #6b7280; font-size: 14px;">
            r/${post.subreddit} • ${post.upvotes || 0} upvotes • ${post.comments || 0} comments • 
            Sentiment: <span style="color: ${post.sentiment === 'positive' ? '#10b981' : post.sentiment === 'negative' ? '#ef4444' : '#6b7280'}">${post.sentiment}</span> • 
            Relevance: ${post.relevance_score || 0}%
          </span>
          ${post.url ? `<br><a href="${post.url}" style="color: #6366f1; font-size: 12px;">View on Reddit →</a>` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="footer">
      <p>This report was generated by BizMap AI on ${currentDate}</p>
      <p>This analysis is for informational purposes only and should not be considered as professional business advice.</p>
      <p>© ${new Date().getFullYear()} Creatives Takeover LTD. All rights reserved.</p>
    </div>
  `;
}