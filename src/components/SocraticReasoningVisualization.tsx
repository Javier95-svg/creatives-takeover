import React, { useState } from 'react';
import { 
  ReasoningAnalysis, 
  LogicGap, 
  Assumption, 
  LogicalFallacy,
  EvidenceStrength,
  BusinessEntity,
  ReasoningType
} from '@/types/socratic';

interface SocraticReasoningVisualizationProps {
  analysis: ReasoningAnalysis;
  onClose: () => void;
  onExploreGap: (gap: LogicGap) => void;
  onTestAssumption: (assumption: Assumption) => void;
}

const SocraticReasoningVisualization: React.FC<SocraticReasoningVisualizationProps> = ({
  analysis,
  onClose,
  onExploreGap,
  onTestAssumption
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'gaps' | 'assumptions' | 'fallacies' | 'evidence'>('overview');

  const getReasoningTypeColor = (type: ReasoningType): string => {
    const colors = {
      'problem_solution_fit': 'bg-[hsl(var(--blue-primary))]/10 text-[hsl(var(--blue-primary))]',
      'market_validation': 'bg-[hsl(var(--green-primary))]/10 text-[hsl(var(--green-primary))]',
      'financial_modeling': 'bg-warning-subtle text-warning',
      'competitive_analysis': 'bg-[hsl(var(--blue-primary))]/10 text-[hsl(var(--blue-primary))]',
      'growth_strategy': 'bg-[hsl(var(--red-primary))]/10 text-[hsl(var(--red-primary))]',
      'risk_assessment': 'bg-[hsl(var(--red-primary))]/10 text-[hsl(var(--red-primary))]',
      'decision_making': 'bg-muted text-foreground'
    };
    return colors[type] || 'bg-muted text-foreground';
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-[hsl(var(--green-primary))]';
    if (confidence >= 0.6) return 'text-warning';
    return 'text-[hsl(var(--red-primary))]';
  };

  const getImpactColor = (impact: 'low' | 'medium' | 'high'): string => {
    const colors = {
      'low': 'bg-[hsl(var(--green-primary))]/10 text-[hsl(var(--green-primary))]',
      'medium': 'bg-warning-subtle text-warning',
      'high': 'bg-[hsl(var(--red-primary))]/10 text-[hsl(var(--red-primary))]'
    };
    return colors[impact];
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Reasoning Type and Confidence */}
      <div className="bg-white p-6 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Reasoning Analysis</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getReasoningTypeColor(analysis.reasoningType)}`}>
            {analysis.reasoningType.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getConfidenceColor(analysis.confidence)}`}>
              {Math.round(analysis.confidence * 100)}%
            </div>
            <div className="text-sm text-muted-foreground">Overall Confidence</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-info">
              {analysis.logicGaps.length}
            </div>
            <div className="text-sm text-muted-foreground">Logic Gaps</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {analysis.assumptions.length}
            </div>
            <div className="text-sm text-muted-foreground">Assumptions</div>
          </div>
        </div>
      </div>

      {/* Key Entities */}
      {analysis.entities.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Key Business Concepts</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.entities.slice(0, 10).map((entity, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-muted text-foreground rounded-full text-sm"
              >
                {entity.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Evidence Strength */}
      <div className="bg-white p-6 rounded-lg border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Evidence Strength</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Overall Evidence</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-muted rounded-full h-2">
                <div 
                  className="bg-info h-2 rounded-full" 
                  style={{ width: `${analysis.evidenceStrength.overall * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium">{Math.round(analysis.evidenceStrength.overall * 100)}%</span>
            </div>
          </div>
          
          {Object.entries(analysis.evidenceStrength.byType).map(([type, strength]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground capitalize">{type}</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-muted rounded-full h-2">
                  <div 
                    className="bg-gray-600 h-2 rounded-full" 
                    style={{ width: `${strength * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{Math.round(strength * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLogicGaps = () => (
    <div className="space-y-4">
      {analysis.logicGaps.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-success text-4xl mb-2">✅</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Logic Gaps Found</h3>
          <p className="text-muted-foreground">Your reasoning appears to be well-structured!</p>
        </div>
      ) : (
        analysis.logicGaps.map((gap, index) => (
          <div key={gap.id} className="bg-white p-6 rounded-lg border border-border">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-foreground mb-2">{gap.description}</h4>
                <p className="text-sm text-muted-foreground mb-3">{gap.type.replace('_', ' ').toUpperCase()}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(gap.impact)}`}>
                {gap.impact.toUpperCase()} IMPACT
              </span>
            </div>
            
            <div className="mb-4">
              <h5 className="text-sm font-medium text-foreground mb-2">Suggestions:</h5>
              <ul className="list-disc list-inside space-y-1">
                {gap.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">{suggestion}</li>
                ))}
              </ul>
            </div>
            
            <button
              onClick={() => onExploreGap(gap)}
              className="px-4 py-2 bg-info text-white rounded-lg hover:bg-info transition-colors text-sm font-medium"
            >
              Explore This Gap
            </button>
          </div>
        ))
      )}
    </div>
  );

  const renderAssumptions = () => (
    <div className="space-y-4">
      {analysis.assumptions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-success text-4xl mb-2">🎯</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Assumptions Detected</h3>
          <p className="text-muted-foreground">Your statements appear to be well-supported!</p>
        </div>
      ) : (
        analysis.assumptions.map((assumption, index) => (
          <div key={assumption.id} className="bg-white p-6 rounded-lg border border-border">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-foreground mb-2">"{assumption.text}"</h4>
                <p className="text-sm text-muted-foreground mb-3">{assumption.type.replace('_', ' ').toUpperCase()}</p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(assumption.confidence)} bg-opacity-20`}>
                {Math.round(assumption.confidence * 100)}% CONFIDENCE
              </div>
            </div>
            
            <div className="mb-4">
              <h5 className="text-sm font-medium text-foreground mb-2">Validation Methods:</h5>
              <ul className="list-disc list-inside space-y-1">
                {assumption.validationMethods.map((method, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">{method}</li>
                ))}
              </ul>
            </div>
            
            <button
              onClick={() => onTestAssumption(assumption)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              Test This Assumption
            </button>
          </div>
        ))
      )}
    </div>
  );

  const renderFallacies = () => (
    <div className="space-y-4">
      {analysis.logicalFallacies.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-success text-4xl mb-2">🧠</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Logical Fallacies Detected</h3>
          <p className="text-muted-foreground">Your reasoning appears to be logically sound!</p>
        </div>
      ) : (
        analysis.logicalFallacies.map((fallacy, index) => (
          <div key={index} className="bg-white p-6 rounded-lg border border-border">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-foreground mb-2">{fallacy.description}</h4>
                <p className="text-sm text-muted-foreground mb-3">{fallacy.type.replace('_', ' ').toUpperCase()}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(fallacy.impact)}`}>
                {fallacy.impact.toUpperCase()} IMPACT
              </span>
            </div>
            
            <div className="bg-info-subtle p-4 rounded-lg">
              <h5 className="text-sm font-medium text-info mb-2">Suggested Correction:</h5>
              <p className="text-sm text-info">{fallacy.correction}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderEvidence = () => (
    <div className="space-y-6">
      {/* Evidence Strength Overview */}
      <div className="bg-white p-6 rounded-lg border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Evidence Strength Analysis</h3>
        <div className="space-y-4">
          {Object.entries(analysis.evidenceStrength.byType).map(([type, strength]) => (
            <div key={type} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-full bg-muted"></div>
                <span className="text-sm font-medium text-foreground capitalize">{type}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      strength >= 0.8 ? 'bg-success' : 
                      strength >= 0.5 ? 'bg-warning' : 'bg-destructive'
                    }`}
                    style={{ width: `${strength * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium w-12 text-right">{Math.round(strength * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Evidence Gaps */}
      {analysis.evidenceStrength.gaps.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Evidence Gaps</h3>
          <div className="space-y-2">
            {analysis.evidenceStrength.gaps.map((gap, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-destructive rounded-full"></div>
                <span className="text-sm text-muted-foreground">{gap}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">🧠 Socratic Reasoning Analysis</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-muted-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'gaps', label: 'Logic Gaps', icon: '🔍', count: analysis.logicGaps.length },
              { id: 'assumptions', label: 'Assumptions', icon: '💭', count: analysis.assumptions.length },
              { id: 'fallacies', label: 'Fallacies', icon: '⚠️', count: analysis.logicalFallacies.length },
              { id: 'evidence', label: 'Evidence', icon: '📈' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-info text-info'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {tab.icon} {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-2 px-2 py-1 bg-destructive-subtle text-destructive rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'gaps' && renderLogicGaps()}
          {activeTab === 'assumptions' && renderAssumptions()}
          {activeTab === 'fallacies' && renderFallacies()}
          {activeTab === 'evidence' && renderEvidence()}
        </div>
      </div>
    </div>
  );
};

export default SocraticReasoningVisualization;
