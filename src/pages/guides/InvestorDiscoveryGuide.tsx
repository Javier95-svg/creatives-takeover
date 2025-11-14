import GuideLayout from "@/components/guides/GuideLayout";
import GuideSection from "@/components/guides/GuideSection";
import CopyableTemplate from "@/components/guides/CopyableTemplate";
import DownloadButton from "@/components/guides/DownloadButton";
import { Search, List, Target, Mail, BarChart3, Handshake } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const InvestorDiscoveryGuide = () => {
  const platforms = [
    {
      name: "Crunchbase",
      url: "crunchbase.com",
      description: "Database of investors, funding rounds, and startup data",
      bestFor: "Research investor portfolios and funding history",
    },
    {
      name: "AngelList",
      url: "angellist.com",
      description: "Connect with angels and VCs, apply to syndicates",
      bestFor: "Connecting with angel investors and early-stage VCs",
    },
    {
      name: "Signal",
      url: "signal.nfx.com",
      description: "Free tool to discover and track relevant investors",
      bestFor: "Finding investors based on your startup profile",
    },
    {
      name: "PitchBook",
      url: "pitchbook.com",
      description: "Comprehensive VC/PE database (subscription required)",
      bestFor: "Deep research on investor activity and trends",
    },
    {
      name: "F6S",
      url: "f6s.com",
      description: "Startup programs, accelerators, and funding opportunities",
      bestFor: "Finding accelerators and grant programs",
    },
  ];

  const coldEmailTemplate = `Subject: [Mutual Connection] recommended I reach out

Hi [Investor Name],

[Mutual connection] suggested I connect with you about [Your Company]. We're building [one-sentence description of what you do and for whom].

We've [key traction metric, e.g., "reached $50K MRR in 6 months" or "signed 3 enterprise customers including [notable name]"], and are raising a $[X] [round type] to [specific use of funds].

Given your investment in [portfolio company] and focus on [relevant sector], I'd love to get 15 minutes to share what we're working on.

Are you open to a brief call next week?

Best,
[Your Name]
[Title]
[Link to deck or one-pager]`;

  const warmIntroTemplate = `Subject: Intro to [Investor Name] at [VC Firm]

Hi [Connector],

Hope you're doing well! I wanted to reach out because we're raising our seed round and I noticed you're connected to [Investor Name] at [VC Firm].

Quick context: We're [Company Name], building [one-sentence description]. We've [key metric] and are raising $[X] to [goal].

Given [VC Firm]'s investment in [similar portfolio company], I think [Investor Name] would be a great fit. Would you be comfortable making an introduction?

Happy to send you our deck and any materials that would be helpful.

Thanks for considering!
[Your Name]`;

  const researchChecklist = [
    "Review their portfolio companies (stage, sector, geography)",
    "Read their blog posts or Medium articles for investment thesis",
    "Check their LinkedIn for recent activity and interests",
    "Look up their past investments on Crunchbase",
    "Identify which partner focuses on your industry",
    "Note their typical check size and ownership targets",
    "See if they lead rounds or follow other investors",
    "Check their fund size and vintage (when it closed)",
  ];

  return (
    <GuideLayout
      title="Investor Discovery + Outreach Basics"
      description="Learn how to find the right investors, research their fit, and craft outreach messages that get responses."
      breadcrumbs={[{ name: "Investor Discovery Guide", url: "/insighta/investor-discovery" }]}
      seoKeywords="find investors, investor outreach, startup investors, angel investors, venture capital"
    >
      <GuideSection id="where-to-find" title="Where to Find Investors" icon={Search}>
        <p className="mb-6">
          Start your investor search using these platforms and resources:
        </p>
        <div className="space-y-4">
          {platforms.map((platform, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">{platform.name}</CardTitle>
                <CardDescription>
                  <a 
                    href={`https://${platform.url}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {platform.url}
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">{platform.description}</p>
                <p className="text-sm font-semibold text-muted-foreground">
                  Best for: {platform.bestFor}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-muted p-4 rounded-lg mt-6">
          <h4 className="font-semibold mb-2">Other Great Sources:</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li><strong>Demo Days:</strong> Y Combinator, Techstars, and other accelerator showcases</li>
            <li><strong>LinkedIn:</strong> Search for VCs and angels in your industry</li>
            <li><strong>Twitter/X:</strong> Follow VCs who share investment theses publicly</li>
            <li><strong>Local Networks:</strong> Startup meetups, pitch events, entrepreneurship groups</li>
            <li><strong>Your Investors' Networks:</strong> Ask current angels for warm intros</li>
          </ul>
        </div>
      </GuideSection>

      <GuideSection id="target-list" title="Building Your Investor Target List" icon={List}>
        <p className="mb-6">
          Create a prioritized list of 50-100 potential investors. Quality over quantity!
        </p>

        <h3 className="text-xl font-semibold mb-4">Target List Template (use a spreadsheet)</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-2 text-left text-sm">Investor/Firm</th>
                <th className="border border-border p-2 text-left text-sm">Type</th>
                <th className="border border-border p-2 text-left text-sm">Stage Focus</th>
                <th className="border border-border p-2 text-left text-sm">Relevant Portfolio</th>
                <th className="border border-border p-2 text-left text-sm">Connection</th>
                <th className="border border-border p-2 text-left text-sm">Priority</th>
                <th className="border border-border p-2 text-left text-sm">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border p-2 text-sm">Example VC</td>
                <td className="border border-border p-2 text-sm">VC</td>
                <td className="border border-border p-2 text-sm">Seed/Series A</td>
                <td className="border border-border p-2 text-sm">Company X, Y</td>
                <td className="border border-border p-2 text-sm">Via John Doe</td>
                <td className="border border-border p-2 text-sm">High</td>
                <td className="border border-border p-2 text-sm">Intro sent</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <DownloadButton 
            label="Download Investor Tracking Template" 
            url="#"
            fileName="investor-tracking-template.xlsx"
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 p-4 mt-6">
          <p className="text-sm">
            <strong>💡 Pro Tip:</strong> Use Airtable or Notion for your investor tracker. 
            Add tags for stage, sector, and connection type to easily filter your list.
          </p>
        </div>
      </GuideSection>

      <GuideSection id="research-fit" title="How to Research Investor Fit" icon={Target}>
        <p className="mb-6">
          Before reaching out, do your homework. A well-researched approach shows respect 
          and dramatically increases response rates.
        </p>

        <h3 className="text-xl font-semibold mb-4">Research Checklist</h3>
        <div className="space-y-2">
          {researchChecklist.map((item, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {index + 1}
                  </div>
                  <p className="text-sm pt-1">{item}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-muted p-4 rounded-lg mt-6">
          <h4 className="font-semibold mb-2">Red Flags (Don't Waste Your Time):</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>They don't invest in your stage (e.g., Series A fund when you're pre-seed)</li>
            <li>No portfolio companies in your sector or adjacent markets</li>
            <li>Geographic restrictions (some only invest locally)</li>
            <li>Fund is closed or fully deployed</li>
            <li>Conflict of interest (invested in direct competitor)</li>
          </ul>
        </div>
      </GuideSection>

      <GuideSection id="outreach" title="Crafting Your Outreach Message" icon={Mail}>
        <p className="mb-6">
          Your first message needs to be concise, personalized, and show you've done your homework.
        </p>

        <h3 className="text-xl font-semibold mb-4">Warm Introduction Email Template</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Use this when someone is making an intro for you:
        </p>
        <CopyableTemplate content={warmIntroTemplate} />

        <h3 className="text-xl font-semibold mb-4 mt-8">Cold Outreach Email Template</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Use sparingly - warm intros are 10x more effective:
        </p>
        <CopyableTemplate content={coldEmailTemplate} />

        <div className="bg-muted p-4 rounded-lg mt-6">
          <h4 className="font-semibold mb-2">Email Best Practices:</h4>
          <ul className="list-disc pl-6 space-y-2 text-sm">
            <li><strong>Keep it short:</strong> 5-7 sentences max. Busy people skim.</li>
            <li><strong>Lead with traction:</strong> Numbers speak louder than vision.</li>
            <li><strong>Show you've researched them:</strong> Reference their portfolio or thesis.</li>
            <li><strong>Include a clear ask:</strong> Usually a 15-20 minute intro call.</li>
            <li><strong>Make it easy to say yes:</strong> Attach your deck or link to materials.</li>
            <li><strong>Follow up once:</strong> If no response in 7-10 days, send one polite follow-up.</li>
          </ul>
        </div>
      </GuideSection>

      <GuideSection id="tracking" title="Tracking & Managing Conversations" icon={BarChart3}>
        <p className="mb-6">
          Stay organized as you juggle multiple investor conversations. Use your tracking spreadsheet 
          to log every interaction.
        </p>

        <h3 className="text-xl font-semibold mb-4">What to Track</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Info</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Email, phone, LinkedIn</li>
                <li>Firm and role</li>
                <li>How you got connected</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interaction Log</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Date of each touchpoint</li>
                <li>Meeting notes and key questions</li>
                <li>Next steps and follow-up dates</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>To contact, intro sent, first call, partner meeting</li>
                <li>Due diligence, term sheet, closed, passed</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interest Level</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Hot, warm, cold</li>
                <li>Reasons for pass (learn for next time)</li>
                <li>Timeline expectations</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </GuideSection>

      <GuideSection id="first-calls" title="Tips for Successful First Calls" icon={Handshake}>
        <p className="mb-6">
          You got the meeting! Here's how to make it count:
        </p>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Before the Call</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Review their portfolio and recent investments</li>
                <li>Prepare 3-5 key questions about their investment process</li>
                <li>Have your pitch deck ready to share (but don't present unless asked)</li>
                <li>Test your video/audio setup</li>
                <li>Have traction metrics memorized</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">During the Call</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Start with a 2-minute pitch, then let them ask questions</li>
                <li>Listen more than you talk—understand their concerns</li>
                <li>Be honest about challenges and risks</li>
                <li>Ask about their decision-making process and timeline</li>
                <li>End with clear next steps</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">After the Call</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Send thank-you email within 24 hours</li>
                <li>Address any questions that came up</li>
                <li>Share additional materials if requested</li>
                <li>Log notes and next steps in your tracker</li>
                <li>Set calendar reminder for follow-up</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="bg-muted p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>🎯 Remember:</strong> First calls are about fit, not closing. Focus on building 
            relationship and determining if there's mutual interest to dig deeper.
          </p>
        </div>
      </GuideSection>
    </GuideLayout>
  );
};

export default InvestorDiscoveryGuide;
