import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRAGIngest } from "@/hooks/useRAGIngest";
import { useRAGChat } from "@/hooks/useRAGChat";
import { Loader2, Send, Upload, BookOpen } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    title: string;
    source: string;
    similarity: number;
    excerpt: string;
  }>;
}

export default function RAGTest() {
  const [docTitle, setDocTitle] = useState("");
  const [docSource, setDocSource] = useState("");
  const [docContent, setDocContent] = useState("");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");

  const ingestMutation = useRAGIngest();
  const chatMutation = useRAGChat();

  const handleIngest = () => {
    if (!docTitle || !docContent) {
      return;
    }

    ingestMutation.mutate({
      documents: [
        {
          source: docSource || "manual_upload",
          title: docTitle,
          content: docContent,
        },
      ],
    });

    // Clear form after submission
    setDocTitle("");
    setDocSource("");
    setDocContent("");
  };

  const handleChat = () => {
    if (!userInput.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: userInput,
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setUserInput("");

    const messages = [
      ...chatMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user" as const, content: userInput },
    ];

    chatMutation.mutate(
      { messages, matchCount: 5 },
      {
        onSuccess: (data) => {
          const assistantMessage: Message = {
            role: "assistant",
            content: data.answer,
            sources: data.sources,
          };
          setChatMessages((prev) => [...prev, assistantMessage]);
        },
      }
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">RAG System Test Interface</h1>
        <p className="text-muted-foreground">
          Test document ingestion and knowledge base queries
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Ingestion Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Document Ingestion
            </CardTitle>
            <CardDescription>
              Add documents to the knowledge base for RAG queries
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title</Label>
              <Input
                id="title"
                placeholder="e.g., Product Documentation"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source (optional)</Label>
              <Input
                id="source"
                placeholder="e.g., docs, manual, api"
                value={docSource}
                onChange={(e) => setDocSource(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Document Content</Label>
              <Textarea
                id="content"
                placeholder="Paste your document content here..."
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleIngest}
              disabled={!docTitle || !docContent || ingestMutation.isPending}
              className="w-full"
            >
              {ingestMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ingesting...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Ingest Document
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Chat Interface Section */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Knowledge Base Chat
            </CardTitle>
            <CardDescription>
              Query the knowledge base using natural language
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 h-[400px] border rounded-lg p-4 mb-4">
              {chatMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Ask a question about your ingested documents
                </div>
              ) : (
                <div className="space-y-4">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className="space-y-2">
                      <div
                        className={`p-3 rounded-lg ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground ml-8"
                            : "bg-muted mr-8"
                        }`}
                      >
                        <p className="text-sm font-medium mb-1">
                          {msg.role === "user" ? "You" : "Assistant"}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="text-xs text-muted-foreground space-y-1 mr-8 pl-3 border-l-2">
                          <p className="font-medium">Sources:</p>
                          {msg.sources.map((source, sidx) => (
                            <div key={sidx} className="pl-2">
                              <p className="font-medium">
                                {source.title} ({source.source}) -{" "}
                                {(source.similarity * 100).toFixed(1)}% match
                              </p>
                              <p className="text-muted-foreground italic">
                                {source.excerpt.substring(0, 150)}...
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {chatMutation.isPending && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Searching knowledge base...</span>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2">
              <Input
                placeholder="Ask a question..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleChat()}
                disabled={chatMutation.isPending}
              />
              <Button
                onClick={handleChat}
                disabled={!userInput.trim() || chatMutation.isPending}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>1. Ingest Documents:</strong> Paste your document content in the left panel and
            click "Ingest Document" to add it to the knowledge base.
          </p>
          <p>
            <strong>2. Query Knowledge:</strong> Use the chat interface on the right to ask
            questions about your ingested documents.
          </p>
          <p>
            <strong>3. View Sources:</strong> The assistant will cite sources with similarity scores
            and excerpts from matching documents.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
