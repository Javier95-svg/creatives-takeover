import React, { useState } from 'react';
import { 
  ReasoningAnalysis, 
  LogicGap, 
  Assumption, 
  SocraticQuestion,
  ReasoningType
} from '@/types/socratic';

interface SocraticReasoningPanelProps {
  analysis: ReasoningAnalysis;
  onClose: () => void;
  onAskQuestion: (question: string) => void;
  onExploreGap: (gap: LogicGap) => void;
  onTestAssumption: (assumption: Assumption) => void;
}

const SocraticReasoningPanel: React.FC<SocraticReasoningPanelProps> = ({
  analysis,
  onClose,
  onAskQuestion,
  onExploreGap,
  onTestAssumption
}) => {
  const [selectedGap, setSelectedGap] = useState<LogicGap | null>(null);
  const [selectedAssumption, setSelectedAssumption] = useState<Assumption | null>(null);

  const getReasoningTypeIcon = (type: ReasoningType): string => {
    const icons = {
      'problem_solution_fit': '🎯',
      'market_validation': '📊',
      'financial_modeling': '💰',
      'competitive_analysis': '⚔️',
      'growth_strategy': '🚀',
      'risk_assessment': '⚠️',
      'decision_making': '🤔'
    };
    return icons[type] || '🧠';
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-[hsl(var(--green-primary))] bg-[hsl(var(--green-primary))]/10';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-[hsl(var(--red-primary))] bg-[hsl(var(--red-primary))]/10';
  };

  const getImpactColor = (impact: 'low' | 'medium' | 'high'): string => {
    const colors = {
      'low': 'text-[hsl(var(--green-primary))] bg-[hsl(var(--green-primary))]/10',
      'medium': 'text-yellow-600 bg-yellow-50',
      'high': 'text-[hsl(var(--red-primary))] bg-[hsl(var(--red-primary))]/10'
    };
    return colors[impact];
  };

  const generateSocraticQuestions = (): SocraticQuestion[] => {
    const questions: SocraticQuestion[] = [];
    
    // Generate questions based on logic gaps
    analysis.logicGaps.forEach(gap => {
      if (gap.impact === 'high') {
        questions.push({
          id: `gap_${gap.id}`,
          type: 'clarification',
          question: `Let's explore this gap: ${gap.description}`,
          followUp: gap.suggestions[0],
          reasoningType: analysis.reasoningType,
          priority: 'high'
        });
      }
    });

    // Generate questions based on assumptions
    analysis.assumptions.forEach(assumption => {
      if (assumption.confidence < 0.7) {
        questions.push({
          id: `assumption_${assumption.id}`,
          type: 'assumption_testing',
          question: `How do you validate this assumption: "${assumption.text}"?`,
          followUp: `What evidence supports this ${assumption.type} assumption?`,
          reasoningType: analysis.reasoningType,
          priority: 'medium'
        });
      }
    });

    return questions.slice(0, 3); // Limit to 3 questions
  };

  const socraticQuestions = generateSocraticQuestions();

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getReasoningTypeIcon(analysis.reasoningType)}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Reasoning Analysis</h3>
            <p className="text-sm text-gray-600">{analysis.reasoningType.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Confidence Score */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Reasoning Confidence</span>
          <span className={`px-2 py-1 rounded-full text-sm font-medium ${getConfidenceColor(analysis.confidence)}`}>
            {Math.round(analysis.confidence * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              analysis.confidence >= 0.8 ? 'bg-green-500' : 
              analysis.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${analysis.confidence * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-4 border-b border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{analysis.logicGaps.length}</div>
            <div className="text-xs text-gray-600">Logic Gaps</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{analysis.assumptions.length}</div>
            <div className="text-xs text-gray-600">Assumptions</div>
          </div>
        </div>
      </div>

      {/* Socratic Questions */}
      {socraticQuestions.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">🧠 Socratic Questions</h4>
          <div className="space-y-2">
            {socraticQuestions.map((question, index) => (
              <button
                key={question.id}
                onClick={() => onAskQuestion(question.question)}
                className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="text-sm font-medium text-blue-900 mb-1">
                  {question.question}
                </div>
                {question.followUp && (
                  <div className="text-xs text-blue-700">
                    {question.followUp}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Logic Gaps */}
      {analysis.logicGaps.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">🔍 Logic Gaps</h4>
          <div className="space-y-2">
            {analysis.logicGaps.slice(0, 2).map((gap, index) => (
              <div
                key={gap.id}
                className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setSelectedGap(gap)}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="text-sm font-medium text-gray-900 flex-1">
                    {gap.description}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(gap.impact)} ml-2`}>
                    {gap.impact}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {gap.suggestions[0]}
                </div>
              </div>
            ))}
            {analysis.logicGaps.length > 2 && (
              <div className="text-xs text-gray-500 text-center">
                +{analysis.logicGaps.length - 2} more gaps
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assumptions */}
      {analysis.assumptions.length > 0 && (
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">💭 Assumptions</h4>
          <div className="space-y-2">
            {analysis.assumptions.slice(0, 2).map((assumption, index) => (
              <div
                key={assumption.id}
                className="p-3 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
                onClick={() => setSelectedAssumption(assumption)}
              >
                <div className="text-sm font-medium text-purple-900 mb-1">
                  "{assumption.text}"
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-purple-700 capitalize">
                    {assumption.type.replace('_', ' ')}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(assumption.confidence)}`}>
                    {Math.round(assumption.confidence * 100)}%
                  </div>
                </div>
              </div>
            ))}
            {analysis.assumptions.length > 2 && (
              <div className="text-xs text-gray-500 text-center">
                +{analysis.assumptions.length - 2} more assumptions
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex space-x-2">
          <button
            onClick={() => onAskQuestion("Let's explore your reasoning more deeply")}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            🧠 Explore Reasoning
          </button>
          <button
            onClick={() => onAskQuestion("What evidence supports your conclusions?")}
            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            📊 Test Evidence
          </button>
        </div>
      </div>

      {/* Modal for selected gap */}
      {selectedGap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Logic Gap: {selectedGap.type.replace('_', ' ')}</h3>
            <p className="text-gray-700 mb-4">{selectedGap.description}</p>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Suggestions:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {selectedGap.suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  onExploreGap(selectedGap);
                  setSelectedGap(null);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Explore This Gap
              </button>
              <button
                onClick={() => setSelectedGap(null)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for selected assumption */}
      {selectedAssumption && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assumption: {selectedAssumption.type.replace('_', ' ')}</h3>
            <p className="text-gray-700 mb-4">"{selectedAssumption.text}"</p>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Validation Methods:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {selectedAssumption.validationMethods.map((method, idx) => (
                  <li key={idx}>{method}</li>
                ))}
              </ul>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  onTestAssumption(selectedAssumption);
                  setSelectedAssumption(null);
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Test This Assumption
              </button>
              <button
                onClick={() => setSelectedAssumption(null)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocraticReasoningPanel;
