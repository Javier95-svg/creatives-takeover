import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Target, 
  TrendingUp,
  Users,
  DollarSign,
  Lightbulb,
  Award
} from "lucide-react";

const BusinessReadinessQuiz = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const questions = [
    {
      id: 0,
      icon: Lightbulb,
      category: "Idea Clarity",
      question: "How clearly can you describe your business idea?",
      options: [
        { text: "I have a vague concept", score: 1 },
        { text: "I can explain it in a few sentences", score: 2 },
        { text: "I have a clear value proposition", score: 3 },
        { text: "I can pitch it in 30 seconds", score: 4 }
      ]
    },
    {
      id: 1,
      icon: Users,
      category: "Market Understanding", 
      question: "How well do you know your target customers?",
      options: [
        { text: "Not sure who they are", score: 1 },
        { text: "I have some general ideas", score: 2 },
        { text: "I know their main characteristics", score: 3 },
        { text: "I've talked to potential customers", score: 4 }
      ]
    },
    {
      id: 2,
      icon: TrendingUp,
      category: "Market Research",
      question: "How much market research have you done?",
      options: [
        { text: "None yet", score: 1 },
        { text: "Basic Google searches", score: 2 },
        { text: "Some competitor analysis", score: 3 },
        { text: "Comprehensive market analysis", score: 4 }
      ]
    },
    {
      id: 3,
      icon: DollarSign,
      category: "Financial Planning",
      question: "What's your current financial preparation?",
      options: [
        { text: "No financial planning", score: 1 },
        { text: "Rough cost estimates", score: 2 },
        { text: "Basic revenue projections", score: 3 },
        { text: "Detailed financial model", score: 4 }
      ]
    },
    {
      id: 4,
      icon: Target,
      category: "Execution Readiness",
      question: "How ready are you to start executing?",
      options: [
        { text: "Just exploring ideas", score: 1 },
        { text: "Planning to start someday", score: 2 },
        { text: "Ready to start in 6 months", score: 3 },
        { text: "Ready to start immediately", score: 4 }
      ]
    }
  ];

  const getScore = () => {
    return Object.values(answers).reduce((sum, score) => sum + score, 0);
  };

  const getScoreLevel = (score: number) => {
    if (score <= 8) return { level: "Explorer", color: "text-yellow-600", bg: "bg-yellow-100" };
    if (score <= 12) return { level: "Planner", color: "text-blue-600", bg: "bg-blue-100" };
    if (score <= 16) return { level: "Strategist", color: "text-green-600", bg: "bg-green-100" };
    return { level: "Executor", color: "text-purple-600", bg: "bg-purple-100" };
  };

  const getRecommendations = (score: number) => {
    if (score <= 8) {
      return {
        title: "Perfect Starting Point! 🌱",
        description: "You're in the exploration phase, which is exactly where many successful entrepreneurs began.",
        actions: [
          "Use our AI to validate and refine your business idea",
          "Get comprehensive market analysis to understand opportunities", 
          "Receive a structured business plan to guide your next steps"
        ],
        urgency: "Start with our free business plan generator to transform your idea into a clear roadmap."
      };
    }
    if (score <= 12) {
      return {
        title: "Great Foundation! 📋", 
        description: "You've done some groundwork. Let's build on that momentum and fill in the gaps.",
        actions: [
          "Validate your assumptions with data-driven insights",
          "Get detailed competitor analysis and market positioning",
          "Create financial projections and funding strategies"
        ],
        urgency: "You're ready for the next level. Get a comprehensive business plan to accelerate your progress."
      };
    }
    if (score <= 16) {
      return {
        title: "Strategic Advantage! 🎯",
        description: "You're well-prepared and strategic. Perfect time to create a professional business plan.",
        actions: [
          "Get investor-ready documentation and presentations", 
          "Refine your go-to-market strategy with AI insights",
          "Validate financial models and growth projections"
        ],
        urgency: "You're almost launch-ready. Get professional documentation to secure funding and partnerships."
      };
    }
    return {
      title: "Launch Ready! 🚀",
      description: "Impressive! You're execution-ready. A professional business plan will help you secure funding and partnerships.",
      actions: [
        "Create investor-pitch materials and executive summaries",
        "Get final validation and risk assessment", 
        "Generate partnership and scaling strategies"
      ],
      urgency: "You're ready to scale. Get professional business documentation to attract investors and partners."
    };
  };

  const handleAnswer = (questionId: number, score: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: score }));
    
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(prev => prev + 1), 300);
    } else {
      setTimeout(() => setShowResults(true), 300);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const score = getScore();
  const scoreLevel = getScoreLevel(score);
  const recommendations = getRecommendations(score);

  if (showResults) {
    return (
      <section className="py-16 bg-gradient-to-br from-muted/30 to-background">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <Card className="overflow-hidden">
              <CardHeader className="text-center pb-6">
                <div className="flex justify-center mb-4">
                  <Award className="w-16 h-16 text-primary" />
                </div>
                <CardTitle className="text-3xl mb-2">Your Business Readiness Score</CardTitle>
                <div className="flex justify-center items-center gap-4 mb-4">
                  <div className="text-5xl font-bold text-primary">{score}</div>
                  <div className="text-muted-foreground">out of 20</div>
                </div>
                <Badge className={`${scoreLevel.bg} ${scoreLevel.color} text-lg px-4 py-2`}>
                  {scoreLevel.level} Level
                </Badge>
              </CardHeader>
              
              <CardContent className="space-y-8">
                <div className="text-center">
                  <h3 className="text-2xl font-semibold mb-3">{recommendations.title}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {recommendations.description}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6">
                  <h4 className="font-semibold mb-4 text-primary">Recommended Next Steps:</h4>
                  <ul className="space-y-3">
                    {recommendations.actions.map((action, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6 text-center">
                  <p className="text-muted-foreground mb-4 font-medium">
                    {recommendations.urgency}
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                      <a href="/dream2plan">
                        Create My Business Plan <ArrowRight className="ml-2 w-5 h-5" />
                      </a>
                    </Button>
                    <Button variant="outline" onClick={resetQuiz}>
                      Retake Quiz
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-6 border-t">
                  {questions.map((q, index) => {
                    const Icon = q.icon;
                    const answered = answers[q.id] !== undefined;
                    return (
                      <div key={q.id} className="text-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                          answered ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="text-xs text-muted-foreground">{q.category}</div>
                        {answered && (
                          <div className="text-sm font-semibold text-primary">
                            {answers[q.id]}/4
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  const currentQ = questions[currentQuestion];
  const Icon = currentQ.icon;

  return (
    <section className="py-16 bg-gradient-to-br from-muted/30 to-background">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-4">
              <Target className="w-4 h-4 mr-2" />
              Business Readiness Assessment
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 takeover-gradient">
              How Ready Is Your Business Idea?
            </h2>
            <p className="text-lg text-muted-foreground">
              Take this 2-minute assessment to discover your entrepreneurial readiness level 
              and get personalized recommendations.
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <Badge variant="outline">{currentQuestion + 1} of {questions.length}</Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="w-4 h-4" />
                  {currentQ.category}
                </div>
              </div>
              <Progress value={progress} className="mb-4" />
              <CardTitle className="text-xl leading-relaxed">{currentQ.question}</CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {currentQ.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(currentQ.id, option.score)}
                    className="w-full p-4 text-left rounded-lg border border-muted hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="group-hover:text-primary transition-colors">
                        {option.text}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
              
              {currentQuestion > 0 && (
                <Button 
                  variant="ghost" 
                  onClick={() => setCurrentQuestion(prev => prev - 1)}
                  className="mt-6"
                >
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  Previous Question
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground">
            ⚡ Get instant results and personalized recommendations
          </div>
        </div>
      </div>
    </section>
  );
};

export default BusinessReadinessQuiz;