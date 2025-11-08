import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Save, Plus, Trash2, MoveUp, MoveDown, Palette } from "lucide-react";
import { toast } from "sonner";

interface Slide {
  type: string;
  content: any;
}

interface DeckEditorProps {
  deck: any;
  onSave: (updates: any) => void;
  onBack: () => void;
}

const DeckEditor = ({ deck, onSave, onBack }: DeckEditorProps) => {
  const [title, setTitle] = useState(deck.title);
  const [slides, setSlides] = useState<Slide[]>(deck.slides || []);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [theme, setTheme] = useState(deck.theme || { primaryColor: "#3b82f6", secondaryColor: "#10b981", fontFamily: "Inter" });

  const currentSlide = slides[currentSlideIndex];

  const handleSave = () => {
    onSave({ title, slides, theme });
  };

  const handleUpdateSlide = (field: string, value: any) => {
    const updatedSlides = [...slides];
    updatedSlides[currentSlideIndex] = {
      ...updatedSlides[currentSlideIndex],
      content: {
        ...updatedSlides[currentSlideIndex].content,
        [field]: value
      }
    };
    setSlides(updatedSlides);
  };

  const handleAddSlide = () => {
    const newSlide = {
      type: "custom",
      content: { title: "New Slide", text: "Add your content here..." }
    };
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
    toast.success("Slide added");
  };

  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) {
      toast.error("Cannot delete the last slide");
      return;
    }
    const updatedSlides = slides.filter((_, i) => i !== index);
    setSlides(updatedSlides);
    if (currentSlideIndex >= updatedSlides.length) {
      setCurrentSlideIndex(updatedSlides.length - 1);
    }
    toast.success("Slide deleted");
  };

  const handleMoveSlide = (index: number, direction: "up" | "down") => {
    if ((direction === "up" && index === 0) || (direction === "down" && index === slides.length - 1)) {
      return;
    }
    const updatedSlides = [...slides];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [updatedSlides[index], updatedSlides[newIndex]] = [updatedSlides[newIndex], updatedSlides[index]];
    setSlides(updatedSlides);
    setCurrentSlideIndex(newIndex);
  };

  const renderSlidePreview = (slide: Slide, index: number) => {
    const isActive = index === currentSlideIndex;
    return (
      <div
        key={index}
        onClick={() => setCurrentSlideIndex(index)}
        className={"p-3 border rounded-lg cursor-pointer transition-all " + (isActive ? "border-primary bg-primary/5 ring-2 ring-primary" : "hover:border-muted-foreground")}
      >
        <div className="text-xs font-semibold mb-1 flex items-center justify-between">
          <span>Slide {index + 1}</span>
          <div className="flex gap-1">
            <button onClick={(e) => { e.stopPropagation(); handleMoveSlide(index, "up"); }} disabled={index === 0} className="p-1 hover:bg-muted rounded disabled:opacity-30">
              <MoveUp className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleMoveSlide(index, "down"); }} disabled={index === slides.length - 1} className="p-1 hover:bg-muted rounded disabled:opacity-30">
              <MoveDown className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleDeleteSlide(index); }} className="p-1 hover:bg-destructive/10 text-destructive rounded">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground capitalize">{slide.type}</div>
        <div className="text-xs font-medium mt-1 truncate">{slide.content?.title || "Untitled"}</div>
      </div>
    );
  };

  const renderSlideEditor = () => {
    if (!currentSlide) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Slide Type</label>
          <Select value={currentSlide.type} onValueChange={(value) => {
            const updatedSlides = [...slides];
            updatedSlides[currentSlideIndex] = { ...updatedSlides[currentSlideIndex], type: value };
            setSlides(updatedSlides);
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title Slide</SelectItem>
              <SelectItem value="problem">Problem</SelectItem>
              <SelectItem value="solution">Solution</SelectItem>
              <SelectItem value="market">Market</SelectItem>
              <SelectItem value="business-model">Business Model</SelectItem>
              <SelectItem value="traction">Traction</SelectItem>
              <SelectItem value="team">Team</SelectItem>
              <SelectItem value="financials">Financials</SelectItem>
              <SelectItem value="ask">The Ask</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Slide Title</label>
          <Input
            value={currentSlide.content?.title || ""}
            onChange={(e) => handleUpdateSlide("title", e.target.value)}
            placeholder="Enter slide title"
          />
        </div>

        {currentSlide.type === "title" && (
          <div>
            <label className="text-sm font-medium mb-2 block">Subtitle</label>
            <Input
              value={currentSlide.content?.subtitle || ""}
              onChange={(e) => handleUpdateSlide("subtitle", e.target.value)}
              placeholder="Enter subtitle"
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium mb-2 block">Content</label>
          <Textarea
            value={currentSlide.content?.text || ""}
            onChange={(e) => handleUpdateSlide("text", e.target.value)}
            placeholder="Enter slide content, bullet points, or description..."
            rows={8}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Tip: Use bullet points (•) or dashes (-) for lists
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Library
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Deck Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter pitch deck title"
          className="text-lg font-semibold"
        />
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Slides</h3>
            <Button size="sm" variant="outline" onClick={handleAddSlide}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {slides.map((slide, index) => renderSlidePreview(slide, index))}
          </div>
        </div>

        <div className="lg:col-span-9">
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Edit Slide {currentSlideIndex + 1} of {slides.length}
                </h3>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="color"
                      value={theme.primaryColor}
                      onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                      className="w-8 h-8 rounded border cursor-pointer"
                      title="Primary Color"
                    />
                    <input
                      type="color"
                      value={theme.secondaryColor}
                      onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                      className="w-8 h-8 rounded border cursor-pointer"
                      title="Secondary Color"
                    />
                  </div>
                </div>
              </div>
              {renderSlideEditor()}
            </CardContent>
          </Card>

          <Card className="mt-6 bg-muted/30">
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-3 text-sm">Slide Preview</h4>
              <div 
                className="aspect-video rounded-lg border-2 p-8 flex flex-col justify-center"
                style={{ 
                  backgroundColor: "white",
                  borderColor: theme.primaryColor 
                }}
              >
                <h2 className="text-3xl font-bold mb-4" style={{ color: theme.primaryColor }}>
                  {currentSlide?.content?.title || "Slide Title"}
                </h2>
                {currentSlide?.content?.subtitle && (
                  <p className="text-xl mb-6" style={{ color: theme.secondaryColor }}>
                    {currentSlide.content.subtitle}
                  </p>
                )}
                {currentSlide?.content?.text && (
                  <div className="text-base text-gray-700 whitespace-pre-wrap">
                    {currentSlide.content.text}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DeckEditor;
