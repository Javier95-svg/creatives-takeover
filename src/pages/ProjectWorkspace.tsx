import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectWorkspace } from '@/hooks/useProjectWorkspace';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, Loader2, FileText, TrendingUp, Users, DollarSign, Presentation, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ProjectWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { project, messages, artifacts, loading, streaming, sendMessage } = useProjectWorkspace(id!);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim() || streaming) return;
    
    const message = input;
    setInput('');
    await sendMessage(message);
  };

  const getArtifactByType = (type: string) => {
    return artifacts.find(a => a.type === type);
  };

  const artifactTabs = [
    { value: 'overview', label: 'Overview', icon: FileText },
    { value: 'market', label: 'Market Analysis', icon: TrendingUp },
    { value: 'competitors', label: 'Competitors', icon: Users },
    { value: 'financials', label: 'Financials', icon: DollarSign },
    { value: 'pitch_deck', label: 'Pitch Deck', icon: Presentation },
  ];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Project not found</h2>
          <Button onClick={() => navigate('/projects')}>Back to Projects</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container flex items-center gap-4 h-16">
          <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{project.title}</h1>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {project.idea_summary}
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel */}
        <div className="w-1/2 border-r flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <Card className={`max-w-[80%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : ''}`}>
                    <CardContent className="p-3">
                      {typeof msg.content === 'string' ? (
                        <p className="text-sm">{msg.content}</p>
                      ) : (
                        <ReactMarkdown className="text-sm prose prose-sm dark:prose-invert">
                          {msg.content.text || ''}
                        </ReactMarkdown>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
              {streaming && (
                <div className="flex justify-start">
                  <Card>
                    <CardContent className="p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about your business idea..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                disabled={streaming}
              />
              <Button onClick={handleSend} disabled={!input.trim() || streaming}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Artifacts Panel */}
        <div className="w-1/2 flex flex-col">
          <Tabs defaultValue="overview" className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b px-4">
              {artifactTabs.map((tab) => {
                const Icon = tab.icon;
                const artifact = getArtifactByType(tab.value);
                return (
                  <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    {artifact && <span className="h-2 w-2 rounded-full bg-green-500" />}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {artifactTabs.map((tab) => {
              const artifact = getArtifactByType(tab.value);
              return (
                <TabsContent key={tab.value} value={tab.value} className="flex-1 m-0">
                  <ScrollArea className="h-full p-6">
                    {artifact ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>
                          {artifact.data.content || JSON.stringify(artifact.data, null, 2)}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-center">
                        <div>
                          <tab.icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="text-lg font-semibold mb-2">No {tab.label} Yet</h3>
                          <p className="text-sm text-muted-foreground">
                            Chat with AI to generate your {tab.label.toLowerCase()}
                          </p>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ProjectWorkspace;
