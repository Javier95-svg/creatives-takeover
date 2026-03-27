import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Loader2, CheckCircle2, AlertCircle, XCircle, Progress } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAccessTokenSafely } from "@/integrations/supabase/auth";
import { useAuth } from "@/contexts/AuthContext";

interface BizMapStructuredProps {
  sessionId?: string;
  onComplete?: (components: Record<string, any>) => void;
}

interface ValidationError {
  component: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

interface StructuredResponse {
  status: 'collecting' | 'validating' | 'complete' | 'error';
  currentComponent: string | null;
  question: string;
  collectedComponents: Record<string, any>;
  validationErrors: ValidationError[];
  completionPercentage: number;
  sessionId?: string;
}

const COMPONENT_LABELS: Record<string, string> = {
  problem: 'Problem',
  target_user: 'Target User',
  value_prop: 'Value Proposition',
  revenue: 'Revenue Model',
  distribution: 'Distribution',
  costs: 'Costs',
  risks: 'Risks',
  assumptions: 'Assumptions'
};

const COMPONENT_ORDER = [
  'problem',
  'target_user',
  'value_prop',
  'revenue',
  'distribution',
  'costs',
  'risks',
  'assumptions'
];

export const BizMapStructured = ({ sessionId: initialSessionId, onComplete }: BizMapStructuredProps) => {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentComponent, setCurrentComponent] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [collectedComponents, setCollectedComponents] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [status, setStatus] = useState<'collecting' | 'validating' | 'complete' | 'error'>('collecting');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  // Initialize session
  useEffect(() => {
    if (!sessionId) {
      initializeSession();
    } else {
      loadSessionStatus();
    }
  }, [sessionId]);

  const initializeSession = async () => {
    try {
      setIsLoading(true);
      const accessToken = await getAccessTokenSafely();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bizmap-structured/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || ''}`
        }
      });

      if (!response.ok) throw new Error('Failed to initialize session');

      const data: StructuredResponse = await response.json();
      setSessionId(data.sessionId || null);
      setCurrentQuestion(data.question);
      setCurrentComponent(data.currentComponent);
      setCompletionPercentage(data.completionPercentage);
      setStatus(data.status);
    } catch (error: any) {
      console.error('Failed to initialize session:', error);
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessionStatus = async () => {
    if (!sessionId) return;

    try {
      const accessToken = await getAccessTokenSafely();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bizmap-structured/status?session_id=${sessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken || ''}`
        }
      });

      if (!response.ok) throw new Error('Failed to load session');

      const data: StructuredResponse = await response.json();
      setCurrentQuestion(data.question);
      setCurrentComponent(data.currentComponent);
      setCompletionPercentage(data.completionPercentage);
      setCollectedComponents(data.collectedComponents);
      setValidationErrors(data.validationErrors);
      setStatus(data.status);

      if (data.status === 'complete' && onComplete) {
        onComplete(data.collectedComponents);
      }
    } catch (error: any) {
      console.error('Failed to load session:', error);
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || !sessionId || !currentComponent || isLoading) return;

    setIsLoading(true);
    setValidationErrors([]);

    try {
      const accessToken = await getAccessTokenSafely();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bizmap-structured/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || ''}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          component_type: currentComponent,
          answer: answer.trim(),
          context: collectedComponents
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process answer');
      }

      const data: StructuredResponse = await response.json();
      
      setCurrentQuestion(data.question);
      setCurrentComponent(data.currentComponent);
      setCompletionPercentage(data.completionPercentage);
      setCollectedComponents(data.collectedComponents);
      setValidationErrors(data.validationErrors);
      setStatus(data.status);
      setAnswer('');

      if (data.status === 'complete' && onComplete) {
        onComplete(data.collectedComponents);
      }

      // Focus input for next answer
      inputRef.current?.focus();
    } catch (error: any) {
      console.error('Failed to submit answer:', error);
      setValidationErrors([{
        component: currentComponent || '',
        message: error.message || 'Failed to process your answer. Please try again.',
        severity: 'error'
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [answer, sessionId, currentComponent, collectedComponents, isLoading, onComplete]);

  const getComponentStatus = (component: string) => {
    if (collectedComponents[component]) return 'complete';
    if (component === currentComponent) return 'current';
    return 'pending';
  };

  const getStatusIcon = (componentStatus: string) => {
    switch (componentStatus) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'current':
        return <Progress className="w-4 h-4 text-primary animate-spin" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  const getErrorsForComponent = (component: string) => {
    return validationErrors.filter(err => err.component === component);
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">BizMap AI - Structured</h2>
          <Badge variant={status === 'complete' ? 'default' : 'secondary'}>
            {completionPercentage}% Complete
          </Badge>
        </div>
        <ProgressBar value={completionPercentage} className="h-2" />
        <p className="text-sm text-muted-foreground">
          Building your business map with structured components. Answer each question to proceed.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Progress Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Components</CardTitle>
              <CardDescription>8 components to complete</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {COMPONENT_ORDER.map((component) => {
                const componentStatus = getComponentStatus(component);
                const errors = getErrorsForComponent(component);
                
                return (
                  <div
                    key={component}
                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      componentStatus === 'current' ? 'bg-primary/10 border border-primary/20' :
                      componentStatus === 'complete' ? 'bg-green-500/10' :
                      'bg-muted/50'
                    }`}
                  >
                    {getStatusIcon(componentStatus)}
                    <span className="flex-1 text-sm font-medium">
                      {COMPONENT_LABELS[component]}
                    </span>
                    {errors.length > 0 && (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Validation Errors Summary */}
          {validationErrors.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg text-destructive">Validation Issues</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {validationErrors.map((error, index) => (
                  <Alert
                    key={index}
                    variant={error.severity === 'error' ? 'destructive' : 'default'}
                    className="text-xs"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-xs font-medium">
                      {COMPONENT_LABELS[error.component] || error.component}
                      {error.field && ` - ${error.field}`}
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                      {error.message}
                      {error.suggestion && (
                        <div className="mt-1 text-muted-foreground">
                          <strong>Suggestion:</strong> {error.suggestion}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Current Question */}
          {status !== 'complete' && currentComponent && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  <CardTitle>
                    {COMPONENT_LABELS[currentComponent]} ({COMPONENT_ORDER.indexOf(currentComponent) + 1}/8)
                  </CardTitle>
                </div>
                <CardDescription>
                  {currentQuestion}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Textarea
                    ref={inputRef}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    disabled={isLoading}
                    className="min-h-[100px]"
                    rows={5}
                  />
                  
                  {/* Component-specific validation errors */}
                  {getErrorsForComponent(currentComponent).length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {getErrorsForComponent(currentComponent).map(err => err.message).join('. ')}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      type="submit"
                      disabled={!answer.trim() || isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Completion State */}
          {status === 'complete' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  Business Map Complete!
                </CardTitle>
                <CardDescription>
                  All 8 components have been collected and validated.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {COMPONENT_ORDER.map((component) => {
                    const componentData = collectedComponents[component];
                    if (!componentData) return null;

                    return (
                      <Card key={component}>
                        <CardHeader>
                          <CardTitle className="text-base">{COMPONENT_LABELS[component]}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-64">
                            {JSON.stringify(componentData, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {status === 'error' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  An error occurred. Please try refreshing or contact support.
                </p>
                <Button onClick={() => initializeSession()} className="mt-4">
                  Restart
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

