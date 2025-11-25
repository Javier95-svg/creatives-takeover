import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Save, Send } from 'lucide-react';
import { useCustomPromptChains, CustomPromptChain } from '@/hooks/useCustomPromptChains';
import { toast } from 'sonner';

interface CustomPromptChainCreatorProps {
  onClose: () => void;
  onSuccess?: () => void;
  editingChain?: CustomPromptChain | null;
}

const promptCategories = [
  { id: "ai", name: "AI & Automation" },
  { id: "ecommerce", name: "E-commerce" },
  { id: "saas", name: "SaaS & Tech" },
  { id: "creator", name: "Creator Economy" },
  { id: "local", name: "Local Business" },
  { id: "consulting", name: "Consulting" },
  { id: "sustainability", name: "Green & Climate Tech" },
  { id: "health", name: "Health & Wellness" },
];

const stepTitles = [
  "Business Concept",
  "Target Customer",
  "Validation Plan",
  "Revenue Model",
  "Marketing Strategy",
  "Operations Plan",
  "Launch Roadmap"
];

const defaultDayRanges = [
  "Days 1-2",
  "Days 3-4",
  "Days 5-7",
  "Days 8-10",
  "Days 11-14",
  "Days 15-21",
  "Days 22-30"
];

export default function CustomPromptChainCreator({ onClose, onSuccess, editingChain }: CustomPromptChainCreatorProps) {
  const { createChain, updateChain, publishChain, loading } = useCustomPromptChains();
  
  const [formData, setFormData] = useState({
    conceptTitle: editingChain?.concept_title || '',
    description: editingChain?.description || '',
    category: editingChain?.category || '',
    tags: editingChain?.tags || [] as string[],
    difficulty: (editingChain?.difficulty || 'Medium') as "Easy" | "Medium" | "Hard",
    steps: editingChain?.steps || Array.from({ length: 7 }, (_, i) => ({
      step: i + 1,
      title: stepTitles[i] || '',
      dayRange: defaultDayRanges[i] || '',
      prompt: '',
    })),
  });

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.conceptTitle.trim()) {
      newErrors.conceptTitle = 'Concept title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    // Validate that exactly 7 steps exist
    if (formData.steps.length !== 7) {
      toast.error('Prompt chain must have exactly 7 steps');
      return false;
    }

    // Validate all 7 steps are filled
    let incompleteSteps = 0;
    formData.steps.forEach((step, index) => {
      if (!step.title.trim()) {
        newErrors[`step${index}_title`] = `Step ${index + 1} title is required`;
        incompleteSteps++;
      }
      if (!step.dayRange.trim()) {
        newErrors[`step${index}_dayRange`] = `Step ${index + 1} day range is required`;
        incompleteSteps++;
      }
      if (!step.prompt.trim()) {
        newErrors[`step${index}_prompt`] = `Step ${index + 1} prompt text is required`;
        incompleteSteps++;
      }
    });

    if (incompleteSteps > 0) {
      toast.error(`Please complete all 7 steps. ${incompleteSteps} field(s) are missing.`);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingChain) {
        await updateChain(editingChain.id, {
          concept_title: formData.conceptTitle,
          description: formData.description,
          category: formData.category,
          tags: formData.tags,
          difficulty: formData.difficulty,
          steps: formData.steps,
          published: false,
        });
      } else {
        await createChain({
          concept_title: formData.conceptTitle,
          description: formData.description,
          category: formData.category,
          tags: formData.tags,
          difficulty: formData.difficulty,
          steps: formData.steps,
          published: false,
          author_name: '', // Will be set from profile in the hook
        });
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handlePublish = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      let chainId = editingChain?.id;
      
      if (editingChain) {
        // Update and publish
        await updateChain(editingChain.id, {
          concept_title: formData.conceptTitle,
          description: formData.description,
          category: formData.category,
          tags: formData.tags,
          difficulty: formData.difficulty,
          steps: formData.steps,
          published: true,
        });
        await publishChain(editingChain.id);
      } else {
        // Create and publish
        const newChain = await createChain({
          concept_title: formData.conceptTitle,
          description: formData.description,
          category: formData.category,
          tags: formData.tags,
          difficulty: formData.difficulty,
          steps: formData.steps,
          published: true,
          author_name: '', // Will be set from profile in the hook
        });
        chainId = newChain.id;
        await publishChain(chainId);
      }
      
      // Success message is handled in the hook
      // Refresh the library to show the new published chain
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) });
  };

  const updateStep = (index: number, field: 'title' | 'dayRange' | 'prompt', value: string) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData({ ...formData, steps: newSteps });
    // Clear error for this field
    if (errors[`step${index}_${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`step${index}_${field}`];
      setErrors(newErrors);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-card">
        <CardHeader className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                {editingChain ? 'Edit Prompt Chain' : 'Create Your Own Prompt Chain'}
              </CardTitle>
              <CardDescription className="mt-2">
                Create a custom 7-step business idea prompt chain. <strong>Exactly 7 prompts are required</strong> - one for each step of the business journey. Once published, your chain will be discoverable by all users in the Prompt Library.
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="conceptTitle">Concept Title *</Label>
              <Input
                id="conceptTitle"
                value={formData.conceptTitle}
                onChange={(e) => {
                  setFormData({ ...formData, conceptTitle: e.target.value });
                  if (errors.conceptTitle) {
                    const newErrors = { ...errors };
                    delete newErrors.conceptTitle;
                    setErrors(newErrors);
                  }
                }}
                placeholder="e.g., AI-Powered Personal Finance Coach"
                className={errors.conceptTitle ? 'border-red-500' : ''}
              />
              {errors.conceptTitle && (
                <p className="text-sm text-red-500">{errors.conceptTitle}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (errors.description) {
                    const newErrors = { ...errors };
                    delete newErrors.description;
                    setErrors(newErrors);
                  }
                }}
                placeholder="Describe your business concept..."
                rows={3}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => {
                    setFormData({ ...formData, category: value });
                    if (errors.category) {
                      const newErrors = { ...errors };
                      delete newErrors.category;
                      setErrors(newErrors);
                    }
                  }}
                >
                  <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {promptCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-red-500">{errors.category}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Difficulty *</Label>
                <RadioGroup
                  value={formData.difficulty}
                  onValueChange={(value) => setFormData({ ...formData, difficulty: value as "Easy" | "Medium" | "Hard" })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Easy" id="easy" />
                    <Label htmlFor="easy">Easy</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Medium" id="medium" />
                    <Label htmlFor="medium">Medium</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Hard" id="hard" />
                    <Label htmlFor="hard">Hard</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add a tag and press Enter"
                />
                <Button type="button" onClick={addTag} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 7 Prompt Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">7 Prompt Steps *</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Each step must have a title, day range, and prompt text. <strong>Exactly 7 steps are required</strong> - no more, no less.
                </p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {formData.steps.filter(s => s.title.trim() && s.dayRange.trim() && s.prompt.trim()).length} / 7 Complete
              </Badge>
            </div>

            {formData.steps.map((step, index) => {
              const isStepComplete = step.title.trim() && step.dayRange.trim() && step.prompt.trim();
              return (
              <Card key={index} className={`p-4 ${isStepComplete ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Step {step.step}</Badge>
                    {isStepComplete && (
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs">
                        ✓ Complete
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`step${index}_title`}>Title *</Label>
                      <Input
                        id={`step${index}_title`}
                        value={step.title}
                        onChange={(e) => updateStep(index, 'title', e.target.value)}
                        placeholder={stepTitles[index] || `Step ${index + 1} Title`}
                        className={errors[`step${index}_title`] ? 'border-red-500' : ''}
                      />
                      {errors[`step${index}_title`] && (
                        <p className="text-sm text-red-500">{errors[`step${index}_title`]}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`step${index}_dayRange`}>Day Range *</Label>
                      <Input
                        id={`step${index}_dayRange`}
                        value={step.dayRange}
                        onChange={(e) => updateStep(index, 'dayRange', e.target.value)}
                        placeholder={defaultDayRanges[index] || "e.g., Days 1-2"}
                        className={errors[`step${index}_dayRange`] ? 'border-red-500' : ''}
                      />
                      {errors[`step${index}_dayRange`] && (
                        <p className="text-sm text-red-500">{errors[`step${index}_dayRange`]}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`step${index}_prompt`}>Prompt Text *</Label>
                    <Textarea
                      id={`step${index}_prompt`}
                      value={step.prompt}
                      onChange={(e) => updateStep(index, 'prompt', e.target.value)}
                      placeholder="Enter the prompt text for this step..."
                      rows={4}
                      className={errors[`step${index}_prompt`] ? 'border-red-500' : ''}
                    />
                    {errors[`step${index}_prompt`] && (
                      <p className="text-sm text-red-500">{errors[`step${index}_prompt`]}</p>
                    )}
                  </div>
                </div>
              </Card>
            );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={loading}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
            <Button
              onClick={handlePublish}
              disabled={loading}
              className="flex-1"
            >
              <Send className="w-4 h-4 mr-2" />
              Publish to Library
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

