import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO, { createBreadcrumbSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import WaitlistTemplateLibrary from '@/components/waitlist/WaitlistTemplateLibrary';
import WaitlistMakerWallpaper from '@/components/wallpapers/WaitlistMakerWallpaper';
import { useAuth } from '@/contexts/AuthContext';
import type { WaitlistTemplateDefinition } from '@/lib/waitlistTemplates';

const LAST_EDITOR_STORAGE_KEY = 'waitlist_builder_last_editor_v1';

export default function WaitlistTemplatesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const structuredData = useMemo(
    () => [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Waitlist Maker Templates',
        description: 'Choose a waitlist landing page template for your startup idea.',
        url: 'https://creatives-takeover.com/waitlist/templates',
      },
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Waitlist Maker', url: '/waitlist' },
        { name: 'Templates', url: '/waitlist/templates' },
      ]),
    ],
    [],
  );

  const handleSelectTemplate = (template: WaitlistTemplateDefinition) => {
    if (!user) {
      navigate('/auth?redirect=' + encodeURIComponent(`/waitlist?template=${template.id}`));
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        const rawDraft = window.localStorage.getItem(LAST_EDITOR_STORAGE_KEY);
        const draft = rawDraft ? JSON.parse(rawDraft) : null;
        const currentTemplateId = draft?.content?.templateId;
        if (currentTemplateId && currentTemplateId !== template.id) {
          const shouldReplace = window.confirm('Replace the current editor contents with this template? Your current draft is preserved in this browser until you confirm.');
          if (!shouldReplace) return;
        }
      } catch {
        // Ignore malformed browser drafts and continue with the selected template.
      }
    }

    navigate(`/waitlist?template=${template.id}`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <SEO
        title="Waitlist Maker Templates - Creatives Takeover"
        description="Turn your idea into a landing page that attracts early believers before you write a line of code."
        keywords="waitlist templates, landing page templates, startup waitlist"
        url="/waitlist/templates"
        structuredData={structuredData}
      />
      <WaitlistMakerWallpaper />
      <div className="relative z-10">
        <Navigation />

        <main className="px-4 pt-28 pb-16 md:pt-32 md:pb-20 lg:pt-36">
          <div className="container mx-auto max-w-[1580px] space-y-8">
            <div className="mx-auto max-w-4xl space-y-4 px-2 text-center">
              <h1 className="pb-2 text-center font-bold leading-[0.95] text-4xl sm:text-[2.85rem] md:text-5xl lg:text-6xl">
                <span className="takeover-gradient creatives-font">Pick Your Design</span>
              </h1>
              <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
                Eight distinct designs. One purpose. Show the world what your product is about before you write a single line of code.
              </p>
            </div>

            <WaitlistTemplateLibrary
              onSelectTemplate={handleSelectTemplate}
            />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
