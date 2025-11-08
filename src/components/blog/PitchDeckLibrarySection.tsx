import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Presentation, Plus, Edit, Trash2, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import TemplateGallery from "./pitch-deck-library/TemplateGallery";
import DeckEditor from "./pitch-deck-library/DeckEditor";
import { format } from "date-fns";

interface PitchDeck {
  id: string;
  title: string;
  template_id: string;
  slides: any[];
  theme: any;
  created_at: string;
  updated_at: string;
}

const PitchDeckLibrarySection = () => {
  const [decks, setDecks] = useState<PitchDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"library" | "templates" | "editor">("library");
  const [selectedDeck, setSelectedDeck] = useState<PitchDeck | null>(null);

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("pitch_decks")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setDecks(data || []);
    } catch (error) {
      console.error("Error loading decks:", error);
      toast.error("Failed to load pitch decks");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to create a pitch deck");
        return;
      }

      const newDeck = {
        user_id: user.id,
        title: "New Pitch Deck",
        template_id: templateId,
        slides: getTemplateSlides(templateId),
        theme: { primaryColor: "#3b82f6", secondaryColor: "#10b981", fontFamily: "Inter" }
      };

      const { data, error } = await supabase
        .from("pitch_decks")
        .insert(newDeck)
        .select()
        .single();

      if (error) throw error;

      setDecks([data, ...decks]);
      setSelectedDeck(data);
      setView("editor");
      toast.success("Pitch deck created! Start customizing.");
    } catch (error) {
      console.error("Error creating deck:", error);
      toast.error("Failed to create pitch deck");
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (!confirm("Are you sure you want to delete this pitch deck?")) return;

    try {
      const { error } = await supabase
        .from("pitch_decks")
        .delete()
        .eq("id", deckId);

      if (error) throw error;

      setDecks(decks.filter(d => d.id !== deckId));
      toast.success("Pitch deck deleted");
    } catch (error) {
      console.error("Error deleting deck:", error);
      toast.error("Failed to delete pitch deck");
    }
  };

  const handleEditDeck = (deck: PitchDeck) => {
    setSelectedDeck(deck);
    setView("editor");
  };

  const handleSaveDeck = async (updatedDeck: Partial<PitchDeck>) => {
    if (!selectedDeck) return;

    try {
      const { error } = await supabase
        .from("pitch_decks")
        .update(updatedDeck)
        .eq("id", selectedDeck.id);

      if (error) throw error;

      setDecks(decks.map(d => d.id === selectedDeck.id ? { ...d, ...updatedDeck } : d));
      toast.success("Pitch deck saved");
    } catch (error) {
      console.error("Error saving deck:", error);
      toast.error("Failed to save pitch deck");
    }
  };

  const handleExportPDF = (deck: PitchDeck) => {
    toast.success("Exporting " + deck.title + " as PDF...", {
      description: "This feature exports your deck for presentations"
    });
  };

  const getTemplateSlides = (templateId: string) => {
    const templates: Record<string, any[]> = {
      "standard": [
        { type: "title", content: { title: "Your Company Name", subtitle: "Pitch Deck 2024" } },
        { type: "problem", content: { title: "The Problem", text: "Describe the pain point you are solving..." } },
        { type: "solution", content: { title: "Our Solution", text: "Explain your unique solution..." } },
        { type: "market", content: { title: "Market Opportunity", text: "Show the market size and growth..." } },
        { type: "business-model", content: { title: "Business Model", text: "How you make money..." } },
        { type: "traction", content: { title: "Traction", text: "Your progress and metrics..." } },
        { type: "team", content: { title: "The Team", text: "Introduce your founding team..." } },
        { type: "financials", content: { title: "Financials", text: "Revenue projections..." } },
        { type: "ask", content: { title: "The Ask", text: "How much you are raising..." } }
      ],
      "quick": [
        { type: "title", content: { title: "Your Company", subtitle: "Quick Pitch" } },
        { type: "problem", content: { title: "Problem", text: "The pain point..." } },
        { type: "solution", content: { title: "Solution", text: "Your solution..." } },
        { type: "market", content: { title: "Market", text: "Market size..." } },
        { type: "ask", content: { title: "Investment Ask", text: "Seeking $XXX,XXX..." } }
      ],
      "saas": [
        { type: "title", content: { title: "SaaS Product Name", subtitle: "Revolutionizing [Industry]" } },
        { type: "problem", content: { title: "Customer Pain Points", text: "What challenges do customers face..." } },
        { type: "solution", content: { title: "Product Demo", text: "Screenshots and key features..." } },
        { type: "value", content: { title: "Value Proposition", text: "Why customers choose us..." } },
        { type: "market", content: { title: "TAM/SAM/SOM", text: "Market opportunity..." } },
        { type: "metrics", content: { title: "Key Metrics", text: "MRR, CAC, LTV, Churn..." } },
        { type: "roadmap", content: { title: "Product Roadmap", text: "Future features..." } },
        { type: "team", content: { title: "Team", text: "Leadership and advisors..." } },
        { type: "ask", content: { title: "Funding Ask", text: "Series A $X million..." } }
      ]
    };
    return templates[templateId] || templates["standard"];
  };

  if (view === "templates") {
    return (
      <section className="py-20 px-4 bg-gradient-to-br from-muted/30 to-background" data-section="pitch-deck">
        <div className="container mx-auto max-w-7xl">
          <Button variant="outline" onClick={() => setView("library")} className="mb-6">
            ← Back to Library
          </Button>
          <TemplateGallery onSelectTemplate={handleCreateFromTemplate} />
        </div>
      </section>
    );
  }

  if (view === "editor" && selectedDeck) {
    return (
      <section className="py-20 px-4 bg-gradient-to-br from-muted/30 to-background" data-section="pitch-deck">
        <div className="container mx-auto max-w-7xl">
          <DeckEditor 
            deck={selectedDeck}
            onSave={handleSaveDeck}
            onBack={() => {
              setView("library");
              setSelectedDeck(null);
            }}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-muted/30 to-background relative overflow-hidden" data-section="pitch-deck">
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute top-10 left-10 w-64 h-64 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-secondary rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6">
            <Presentation className="h-6 w-6 text-primary" />
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight pb-2">
              Pitch Deck Library
            </h2>
            <span className="text-4xl md:text-5xl">📊</span>
          </div>
          <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
            Create professional pitch decks with our templates and easy-to-use design tools
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <Button size="lg" onClick={() => setView("templates")} className="gap-2">
            <Plus className="w-5 h-5" />
            Create New Pitch Deck
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading your pitch decks...</div>
        ) : decks.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="pt-12 pb-12 text-center">
              <Presentation className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No pitch decks yet</h3>
              <p className="text-muted-foreground mb-6">
                Start by choosing a template and customize it to create your perfect pitch
              </p>
              <Button onClick={() => setView("templates")} size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Deck
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks.map((deck) => (
              <Card key={deck.id} className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{deck.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {deck.slides?.length || 0} slides • Updated {format(new Date(deck.updated_at), "MMM dd, yyyy")}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {deck.template_id}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditDeck(deck)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportPDF(deck)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteDeck(deck.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PitchDeckLibrarySection;
