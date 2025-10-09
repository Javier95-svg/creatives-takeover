import { 
  BusinessEntity, 
  Assumption, 
  LogicGap, 
  BusinessNLPResult, 
  ReasoningType,
  LogicalFallacy,
  EvidenceStrength
} from '@/types/socratic';

export interface BusinessNLPConfig {
  enableEntityExtraction: boolean;
  enableAssumptionDetection: boolean;
  enableLogicGapAnalysis: boolean;
  enableFallacyDetection: boolean;
  confidenceThreshold: number;
}

export const useSocraticNLP = (config: BusinessNLPConfig = {
  enableEntityExtraction: true,
  enableAssumptionDetection: true,
  enableLogicGapAnalysis: true,
  enableFallacyDetection: true,
  confidenceThreshold: 0.6
}) => {
  
  // Enhanced business entity patterns with fuzzy matching and semantic variations
  const entityPatterns = {
    problem: [
      // Core problem indicators
      /\b(problem|issue|challenge|pain\s+point|struggle|frustration|difficulty|obstacle|barrier)\b/gi,
      // Action-based problem indicators
      /\b(can't|unable\s+to|difficult\s+to|struggling\s+with|facing|dealing\s+with|battling|fighting)\b/gi,
      // Need/want with constraints
      /\b(need|want|desire|wish|hope|aspire)\b.*\b(but|however|unfortunately|however|yet|still)\b/gi,
      // Semantic variations and context-aware patterns
      /\b(people\s+are\s+struggling|customers\s+complain|users\s+find\s+it\s+difficult|clients\s+struggle)\b/gi,
      /\b(pain\s+points|frustrations|challenges|difficulties|issues|problems|struggles)\b/gi,
      /\b(having\s+trouble|running\s+into\s+issues|experiencing\s+problems|facing\s+challenges)\b/gi,
      /\b(not\s+working|doesn't\s+work|failing|broken|ineffective|inefficient|slow|complicated)\b/gi
    ],
    solution: [
      // Core solution indicators
      /\b(solution|solve|fix|address|resolve|help|provide|offer|deliver|enable|facilitate)\b/gi,
      // Product/service references
      /\b(our\s+product|our\s+service|our\s+platform|our\s+app|our\s+tool|our\s+system|we|our\s+company)\b/gi,
      // Action verbs for solutions
      /\b(build|create|develop|design|launch|introduce|implement|establish|found|start)\b/gi,
      // Solution benefits and outcomes
      /\b(makes\s+easy|simplifies|streamlines|improves|enhances|optimizes|accelerates|reduces)\b/gi,
      /\b(allows|enables|helps|assists|supports|empowers|guides|teaches|educates)\b/gi,
      // Value proposition indicators
      /\b(better\s+than|faster\s+than|more\s+efficient|cost-effective|affordable|convenient)\b/gi,
      /\b(unique|innovative|revolutionary|cutting-edge|advanced|superior|premium)\b/gi
    ],
    market: [
      // Core market indicators
      /\b(market|industry|sector|space|field|vertical|niche|segment|category)\b/gi,
      // Market size and scope
      /\b(target\s+market|customer\s+base|audience|demographics|market\s+size|addressable\s+market)\b/gi,
      // Financial market indicators
      /\b(\$[\d,]+|\d+%\s+of|\d+\s+million|\d+\s+billion|market\s+value|revenue\s+potential)\b/gi,
      // Market characteristics
      /\b(emerging|growing|mature|declining|saturated|competitive|fragmented|consolidated)\b/gi,
      /\b(market\s+trends|industry\s+trends|market\s+growth|market\s+share|market\s+opportunity)\b/gi
    ],
    customer: [
      // Core customer indicators
      /\b(customers|users|clients|buyers|consumers|people|individuals|businesses|companies)\b/gi,
      // Customer targeting
      /\b(target|ideal|potential|prospective|primary|secondary)\s+(customer|client|user|audience|market)\b/gi,
      // Customer analysis
      /\b(demographics|segments|personas|buyer\s+profiles|customer\s+segments|user\s+groups)\b/gi,
      // Customer behavior
      /\b(customer\s+behavior|user\s+behavior|buying\s+patterns|customer\s+journey|user\s+journey)\b/gi,
      /\b(customer\s+needs|user\s+needs|customer\s+pain\s+points|user\s+pain\s+points)\b/gi,
      // Customer metrics
      /\b(customer\s+acquisition|user\s+acquisition|customer\s+retention|user\s+retention)\b/gi
    ],
    competitor: [
      // Core competitor indicators
      /\b(competitor|competition|rival|alternative|substitute|opponent|opposition)\b/gi,
      // Comparison indicators
      /\b(like|similar\s+to|comparable\s+to|versus|vs|compared\s+to|relative\s+to)\b/gi,
      // Market position indicators
      /\b(market\s+leader|established\s+player|incumbent|dominant|major\s+player|key\s+player)\b/gi,
      // Competitive analysis
      /\b(competitive\s+advantage|competitive\s+position|competitive\s+landscape|market\s+position)\b/gi,
      /\b(differentiation|unique\s+selling\s+proposition|USP|competitive\s+moat|barriers\s+to\s+entry)\b/gi,
      // Competitor types
      /\b(direct\s+competitor|indirect\s+competitor|potential\s+competitor|emerging\s+competitor)\b/gi
    ],
    revenue: [
      // Core revenue indicators
      /\b(revenue|income|sales|earnings|profit|revenue\s+stream|income\s+stream)\b/gi,
      // Pricing models
      /\b(pricing|price|cost|fee|subscription|one-time|recurring|perpetual|freemium)\b/gi,
      // Financial patterns
      /\b(\$[\d,]+\s+(per|per\s+month|per\s+year|annually|monthly|weekly|daily))\b/gi,
      /\b(revenue\s+model|monetization|pricing\s+strategy|pricing\s+model|revenue\s+projections)\b/gi,
      // Revenue metrics
      /\b(ARR|MRR|recurring\s+revenue|monthly\s+recurring\s+revenue|annual\s+recurring\s+revenue)\b/gi,
      /\b(gross\s+revenue|net\s+revenue|revenue\s+growth|revenue\s+target|revenue\s+forecast)\b/gi
    ],
    cost: [
      // Core cost indicators
      /\b(cost|expense|spending|investment|budget|expenditure|outlay|capital)\b/gi,
      // Cost types
      /\b(operating\s+cost|fixed\s+cost|variable\s+cost|startup\s+cost|development\s+cost)\b/gi,
      // Cost characteristics
      /\b(expensive|cheap|affordable|cost-effective|budget-friendly|premium|economical)\b/gi,
      // Cost analysis
      /\b(cost\s+structure|cost\s+breakdown|unit\s+cost|cost\s+per\s+acquisition|cost\s+of\s+goods\s+sold)\b/gi,
      /\b(COGS|CAC|customer\s+acquisition\s+cost|lifetime\s+value|LTV|cost\s+optimization)\b/gi,
      // Financial planning
      /\b(budget\s+planning|financial\s+projections|cost\s+forecasting|break-even|cash\s+flow)\b/gi
    ],
    assumption: [
      // Core assumption indicators
      /\b(assume|assumption|believe|think|expect|anticipate|presume|suppose|imagine)\b/gi,
      // Confidence indicators
      /\b(probably|likely|unlikely|certainly|definitely|maybe|perhaps|possibly|hopefully)\b/gi,
      // Conditional reasoning
      /\b(based\s+on|given\s+that|assuming|if|when|provided\s+that|in\s+case)\b/gi,
      // Implicit assumptions
      /\b(it\s+seems|appears\s+to|looks\s+like|suggests\s+that|implies\s+that|indicates\s+that)\b/gi,
      // Market assumptions
      /\b(market\s+will|customers\s+will|users\s+will|demand\s+will|growth\s+will)\b/gi,
      // Business assumptions
      /\b(revenue\s+will|profit\s+will|costs\s+will|competition\s+will|technology\s+will)\b/gi,
      // Behavioral assumptions
      /\b(people\s+want|users\s+prefer|customers\s+like|buyers\s+need|consumers\s+desire)\b/gi
    ],
    evidence: [
      // Direct evidence indicators
      /\b(data\s+shows|research\s+indicates|studies\s+show|evidence\s+suggests|findings\s+reveal)\b/gi,
      // Source-based evidence
      /\b(according\s+to|based\s+on\s+research|survey\s+results|market\s+data|industry\s+reports)\b/gi,
      // Validation indicators
      /\b(proven|validated|tested|confirmed|demonstrated|verified|established|documented)\b/gi,
      // Research methods
      /\b(studies|research|analysis|survey|poll|interview|focus\s+group|case\s+study)\b/gi,
      // Data sources
      /\b(market\s+research|user\s+research|customer\s+feedback|analytics|metrics|statistics)\b/gi,
      // Evidence quality
      /\b(reliable|credible|trustworthy|authoritative|peer-reviewed|scientific|empirical)\b/gi,
      // Evidence types
      /\b(quantitative|qualitative|statistical|anecdotal|observational|experimental)\b/gi
    ]
  };

  // Assumption detection patterns
  const assumptionPatterns = {
    market: [
      /\b(market will|customers will|demand will|growth will)\b/gi,
      /\b(people want|users need|customers prefer)\b/gi,
      /\b(trending|growing|increasing|expanding)\b/gi
    ],
    customer: [
      /\b(customers are|customers will|customers prefer)\b/gi,
      /\b(users want|buyers need|consumers like)\b/gi,
      /\b(target audience|ideal customer|primary user)\b/gi
    ],
    financial: [
      /\b(revenue will|profit will|growth will|costs will)\b/gi,
      /\b(pricing will|market size|unit economics)\b/gi,
      /\b(break-even|ROI|return on investment)\b/gi
    ],
    competitive: [
      /\b(competitors are|market is|industry is)\b/gi,
      /\b(barriers to entry|competitive advantage|moat)\b/gi,
      /\b(market share|positioning|differentiation)\b/gi
    ],
    technical: [
      /\b(technology will|platform will|system will)\b/gi,
      /\b(scalable|efficient|reliable|secure)\b/gi,
      /\b(development time|technical feasibility)\b/gi
    ],
    regulatory: [
      /\b(regulations|compliance|legal|permits|licenses)\b/gi,
      /\b(government|policy|law|requirements)\b/gi,
      /\b(approved|certified|licensed|compliant)\b/gi
    ]
  };

  // Enhanced logical fallacy detection patterns
  const fallacyPatterns = {
    confirmation_bias: [
      /\b(proves|confirms|validates)\b.*\b(what I thought|my idea|my belief|my assumption|my hypothesis)\b/gi,
      /\b(see|look at|obviously|clearly|evidently)\b.*\b(supports|shows|demonstrates|confirms)\b/gi,
      /\b(I knew it|exactly as expected|just as I thought|told you so)\b/gi,
      /\b(only looking for|only considering|ignoring|dismissing)\b.*\b(evidence|data|information)\b/gi
    ],
    correlation_causation: [
      /\b(because|since|due to)\b.*\b(correlates|happened together|coincided|occurred simultaneously)\b/gi,
      /\b(correlation|relationship|connection)\b.*\b(causes|leads to|results in|creates|produces)\b/gi,
      /\b(when|whenever)\b.*\b(happens|occurs|increases)\b.*\b(so|therefore|thus)\b/gi,
      /\b(associated with|linked to|related to)\b.*\b(means|causes|implies)\b/gi
    ],
    sunk_cost: [
      /\b(already invested|spent so much|too much time|can't quit now|too far to stop)\b/gi,
      /\b(we have to|must continue|no turning back|committed to|stuck with)\b/gi,
      /\b(wasted|lost|thrown away)\b.*\b(money|time|effort|resources)\b.*\b(so|therefore|thus)\b/gi,
      /\b(put too much into|invested heavily in|committed to)\b.*\b(can't|must not|shouldn't)\b.*\b(give up|quit|abandon)\b/gi
    ],
    appeal_authority: [
      /\b(expert says|industry leader|successful entrepreneur|authority|guru|specialist)\b.*\b(so|therefore|thus|must be)\b/gi,
      /\b(according to|based on|as stated by)\b.*\b(authority|expert|guru|leader|specialist|professional)\b/gi,
      /\b(studies show|research indicates|experts agree|everyone knows)\b.*\b(so|therefore|thus)\b/gi,
      /\b(trusted source|reliable authority|industry standard)\b.*\b(says|indicates|suggests)\b/gi
    ],
    false_dichotomy: [
      /\b(either|or|must choose between|only two options|only way)\b/gi,
      /\b(all or nothing|win or lose|succeed or fail|right or wrong|good or bad)\b/gi,
      /\b(if not this|then that|no middle ground|black or white)\b/gi,
      /\b(only alternative|only choice|only option|no other way)\b/gi
    ],
    hasty_generalization: [
      /\b(all|every|none|never|always|everyone|nobody)\b.*\b(based on|from|using|considering)\b.*\b(few|some|one|limited|small)\b/gi,
      /\b(general trend|typical|usually|normally)\b.*\b(single example|one case|few instances|limited sample)\b/gi,
      /\b(my experience|what I've seen|in my case|personally)\b.*\b(proves|shows|means)\b.*\b(all|every|everyone)\b/gi,
      /\b(few|some|limited|small)\b.*\b(examples|cases|instances)\b.*\b(proves|shows|demonstrates)\b.*\b(all|every|general)\b/gi
    ],
    straw_man: [
      /\b(they say|people claim|argument is|position is)\b.*\b(but|however|actually|really)\b/gi,
      /\b(misrepresenting|mischaracterizing|distorting|oversimplifying)\b.*\b(argument|position|claim|view)\b/gi,
      /\b(so you're saying|you mean|you believe)\b.*\b(extreme|absurd|unreasonable)\b/gi
    ],
    ad_hominem: [
      /\b(you're just|you're only|you're being|you don't understand|you're wrong)\b.*\b(because|since|due to)\b.*\b(personal|background|experience|position)\b/gi,
      /\b(typical|obvious|clearly)\b.*\b(you|your type|people like you)\b.*\b(would|always|never)\b/gi,
      /\b(attacking|criticizing|blaming)\b.*\b(person|individual|character)\b.*\b(instead of|rather than)\b.*\b(argument|position|evidence)\b/gi
    ],
    appeal_to_emotion: [
      /\b(feel|emotion|heart|gut|instinct)\b.*\b(tells me|says|indicates|shows)\b/gi,
      /\b(imagine|think about|consider)\b.*\b(how|what if|the impact|consequences)\b/gi,
      /\b(people will|customers will|everyone will)\b.*\b(love|hate|appreciate|resent)\b/gi,
      /\b(emotional|feeling|passionate)\b.*\b(about|regarding|concerning)\b.*\b(so|therefore|thus)\b/gi
    ],
    slippery_slope: [
      /\b(if we|once we|if this|if that)\b.*\b(then|next|soon|eventually)\b.*\b(will|would|could)\b/gi,
      /\b(leads to|results in|causes|creates)\b.*\b(chain reaction|domino effect|cascade|spiral)\b/gi,
      /\b(slippery slope|snowball effect|inevitable|unavoidable)\b.*\b(consequences|results|outcome)\b/gi,
      /\b(small step|first step|beginning)\b.*\b(toward|towards|to)\b.*\b(disaster|catastrophe|ruin)\b/gi
    ],
    post_hoc: [
      /\b(after|following|since)\b.*\b(this happened|that occurred|the change)\b.*\b(therefore|so|thus)\b/gi,
      /\b(sequence|order|timing)\b.*\b(proves|shows|demonstrates|indicates)\b.*\b(causation|cause|effect)\b/gi,
      /\b(happened first|occurred before|came after)\b.*\b(so|therefore|thus)\b.*\b(caused|resulted in|led to)\b/gi
    ],
    red_herring: [
      /\b(but what about|don't forget|remember|consider)\b.*\b(different|other|unrelated|separate)\b.*\b(issue|problem|topic)\b/gi,
      /\b(changing the subject|distracting from|avoiding|deflecting)\b.*\b(real|actual|main|primary)\b.*\b(issue|question|point)\b/gi,
      /\b(irrelevant|unrelated|off-topic|beside the point)\b.*\b(information|data|evidence|argument)\b/gi
    ],
    bandwagon: [
      /\b(everyone|everybody|all|most|majority)\b.*\b(is doing|believes|thinks|agrees)\b.*\b(so|therefore|thus)\b/gi,
      /\b(trending|popular|mainstream|widely accepted)\b.*\b(so|therefore|thus)\b.*\b(correct|right|true|good)\b/gi,
      /\b(jumping on|following|joining)\b.*\b(bandwagon|trend|movement|crowd)\b/gi,
      /\b(peer pressure|social proof|groupthink)\b.*\b(influences|affects|determines)\b.*\b(decision|choice|belief)\b/gi
    ]
  };

  // Extract business entities from text
  const extractEntities = (text: string): BusinessEntity[] => {
    const entities: BusinessEntity[] = [];
    
    Object.entries(entityPatterns).forEach(([type, patterns]) => {
      patterns.forEach(pattern => {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match.index !== undefined) {
            entities.push({
              type: type as BusinessEntity['type'],
              text: match[0],
              confidence: 0.8,
              context: text.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50),
              position: { start: match.index, end: match.index + match[0].length }
            });
          }
        }
      });
    });

    return entities;
  };

  // Enhanced assumption detection with semantic similarity
  const detectAssumptions = (text: string): Assumption[] => {
    const assumptions: Assumption[] = [];
    
    // Pattern-based detection
    Object.entries(assumptionPatterns).forEach(([type, patterns]) => {
      patterns.forEach(pattern => {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match.index !== undefined) {
            assumptions.push({
              id: `assumption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              text: match[0],
              type: type as Assumption['type'],
              confidence: 0.7,
              evidence: [],
              risks: [],
              validationMethods: []
            });
          }
        }
      });
    });

    // Semantic similarity-based detection
    const semanticAssumptions = detectSemanticAssumptions(text);
    assumptions.push(...semanticAssumptions);

    // Context-based assumption detection
    const contextAssumptions = detectContextualAssumptions(text);
    assumptions.push(...contextAssumptions);

    // Remove duplicates and merge similar assumptions
    return mergeSimilarAssumptions(assumptions);
  };

  // Detect assumptions using semantic similarity
  const detectSemanticAssumptions = (text: string): Assumption[] => {
    const assumptions: Assumption[] = [];
    
    // Semantic patterns for implicit assumptions
    const semanticPatterns = [
      // Future predictions
      {
        pattern: /\b(will|going to|planning to|expecting to|anticipating|hoping to)\b.*\b(succeed|work|grow|increase|decrease|change|happen)\b/gi,
        type: 'market' as const,
        confidence: 0.8
      },
      // Customer behavior assumptions
      {
        pattern: /\b(customers|users|people|buyers|clients)\b.*\b(want|need|prefer|like|desire|choose|buy|purchase)\b/gi,
        type: 'customer' as const,
        confidence: 0.75
      },
      // Market size assumptions
      {
        pattern: /\b(market|industry|sector)\b.*\b(large|big|huge|massive|growing|expanding|emerging)\b/gi,
        type: 'market' as const,
        confidence: 0.7
      },
      // Competitive assumptions
      {
        pattern: /\b(competitors|competition|rivals)\b.*\b(not doing|missing|lacking|failing to|unable to)\b/gi,
        type: 'competitive' as const,
        confidence: 0.8
      },
      // Technology assumptions
      {
        pattern: /\b(technology|tech|platform|system|app|software)\b.*\b(will make|enables|allows|facilitates|simplifies)\b/gi,
        type: 'technical' as const,
        confidence: 0.7
      },
      // Financial assumptions
      {
        pattern: /\b(revenue|profit|income|sales|earnings)\b.*\b(will|going to|expected to|projected to)\b/gi,
        type: 'financial' as const,
        confidence: 0.8
      }
    ];

    semanticPatterns.forEach(({ pattern, type, confidence }) => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match.index !== undefined) {
          assumptions.push({
            id: `semantic_assumption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text: match[0],
            type,
            confidence,
            evidence: [],
            risks: [],
            validationMethods: []
          });
        }
      }
    });

    return assumptions;
  };

  // Detect contextual assumptions based on surrounding text
  const detectContextualAssumptions = (text: string): Assumption[] => {
    const assumptions: Assumption[] = [];
    
    // Look for assumption indicators in context
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    sentences.forEach((sentence, index) => {
      const trimmedSentence = sentence.trim();
      
      // Check for assumption indicators in sentence context
      if (trimmedSentence.match(/\b(obviously|clearly|naturally|of course|surely|certainly|definitely)\b/gi)) {
        // Previous sentence might contain an assumption
        if (index > 0) {
          const previousSentence = sentences[index - 1].trim();
          if (previousSentence.length > 10) {
            assumptions.push({
              id: `contextual_assumption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              text: previousSentence,
              type: 'market',
              confidence: 0.6,
              evidence: [],
              risks: [],
              validationMethods: []
            });
          }
        }
      }
      
      // Check for comparative assumptions
      if (trimmedSentence.match(/\b(better than|superior to|more than|less than|different from|unlike|compared to)\b/gi)) {
        assumptions.push({
          id: `comparative_assumption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: trimmedSentence,
          type: 'competitive',
          confidence: 0.7,
          evidence: [],
          risks: [],
          validationMethods: []
        });
      }
      
      // Check for causal assumptions
      if (trimmedSentence.match(/\b(because|since|due to|as a result|therefore|thus|hence)\b/gi)) {
        assumptions.push({
          id: `causal_assumption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: trimmedSentence,
          type: 'market',
          confidence: 0.65,
          evidence: [],
          risks: [],
          validationMethods: []
        });
      }
    });

    return assumptions;
  };

  // Merge similar assumptions to avoid duplicates
  const mergeSimilarAssumptions = (assumptions: Assumption[]): Assumption[] => {
    const merged: Assumption[] = [];
    const processed = new Set<string>();
    
    assumptions.forEach(assumption => {
      // Create a normalized key for similarity comparison
      const normalizedText = assumption.text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (!processed.has(normalizedText)) {
        // Find similar assumptions
        const similar = assumptions.filter(a => {
          const otherNormalized = a.text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          return otherNormalized === normalizedText;
        });
        
        if (similar.length > 1) {
          // Merge similar assumptions
          const mergedAssumption: Assumption = {
            ...assumption,
            confidence: similar.reduce((sum, a) => sum + a.confidence, 0) / similar.length,
            validationMethods: [...new Set(similar.flatMap(a => a.validationMethods))],
            risks: [...new Set(similar.flatMap(a => a.risks))]
          };
          merged.push(mergedAssumption);
        } else {
          merged.push(assumption);
        }
        
        processed.add(normalizedText);
      }
    });
    
    return merged;
  };

  // Detect logical gaps
  const detectLogicGaps = (text: string, assumptions: Assumption[]): LogicGap[] => {
    const gaps: LogicGap[] = [];
    
    // Check for missing evidence
    if (assumptions.length > 0 && !text.match(/\b(data|research|study|evidence|proof|validation)\b/gi)) {
      gaps.push({
        id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'missing_evidence',
        description: 'Statements made without supporting evidence or data',
        impact: 'high',
        suggestions: ['Provide supporting data', 'Conduct market research', 'Validate assumptions with customers']
      });
    }

    // Check for unclear assumptions
    const unclearAssumptions = assumptions.filter(a => a.confidence < 0.5);
    if (unclearAssumptions.length > 0) {
      gaps.push({
        id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'unclear_assumption',
        description: 'Some assumptions are unclear or weakly supported',
        impact: 'medium',
        suggestions: ['Clarify assumptions', 'Provide more context', 'Explain reasoning']
      });
    }

    // Check for contradictions
    const entities = extractEntities(text);
    const problems = entities.filter(e => e.type === 'problem');
    const solutions = entities.filter(e => e.type === 'solution');
    
    if (problems.length > 0 && solutions.length === 0) {
      gaps.push({
        id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'insufficient_validation',
        description: 'Problem identified but no clear solution proposed',
        impact: 'high',
        suggestions: ['Define your solution', 'Explain how you solve the problem', 'Describe your value proposition']
      });
    }

    return gaps;
  };

  // Enhanced logical fallacy detection with argument structure analysis
  const detectFallacies = (text: string): LogicalFallacy[] => {
    const fallacies: LogicalFallacy[] = [];
    
    // Pattern-based fallacy detection
    Object.entries(fallacyPatterns).forEach(([type, patterns]) => {
      patterns.forEach(pattern => {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match.index !== undefined) {
            const impact = assessFallacyImpact(type as LogicalFallacy['type'], match[0]);
            fallacies.push({
              type: type as LogicalFallacy['type'],
              description: `Potential ${type.replace('_', ' ')} detected: "${match[0]}"`,
              impact,
              correction: getFallacyCorrection(type as LogicalFallacy['type'])
            });
          }
        }
      });
    });

    // Argument structure analysis
    const structuralFallacies = analyzeArgumentStructure(text);
    fallacies.push(...structuralFallacies);

    // Contextual fallacy detection
    const contextualFallacies = detectContextualFallacies(text);
    fallacies.push(...contextualFallacies);

    // Remove duplicates and merge similar fallacies
    return mergeSimilarFallacies(fallacies);
  };

  // Assess the impact of a detected fallacy
  const assessFallacyImpact = (fallacyType: LogicalFallacy['type'], text: string): 'low' | 'medium' | 'high' => {
    const highImpactFallacies = ['confirmation_bias', 'correlation_causation', 'false_dichotomy'];
    const mediumImpactFallacies = ['sunk_cost', 'appeal_authority', 'hasty_generalization', 'straw_man', 'post_hoc'];
    
    if (highImpactFallacies.includes(fallacyType)) {
      return 'high';
    } else if (mediumImpactFallacies.includes(fallacyType)) {
      return 'medium';
    } else {
      return 'low';
    }
  };

  // Analyze argument structure for logical issues
  const analyzeArgumentStructure = (text: string): LogicalFallacy[] => {
    const fallacies: LogicalFallacy[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Check for missing premises
    if (sentences.length >= 2) {
      const conclusionIndicators = /\b(therefore|thus|hence|so|consequently|as a result|it follows that)\b/gi;
      const premiseIndicators = /\b(because|since|due to|given that|as|for|in view of)\b/gi;
      
      const hasConclusion = sentences.some(s => conclusionIndicators.test(s));
      const hasPremises = sentences.some(s => premiseIndicators.test(s));
      
      if (hasConclusion && !hasPremises) {
        fallacies.push({
          type: 'hasty_generalization',
          description: 'Conclusion reached without clear supporting premises',
          impact: 'high',
          correction: 'Provide clear reasoning or evidence to support your conclusion'
        });
      }
    }
    
    // Check for circular reasoning
    const circularPattern = /\b(because|since|due to)\b.*\b(same|identical|equivalent|similar)\b.*\b(reason|cause|explanation)\b/gi;
    if (circularPattern.test(text)) {
      fallacies.push({
        type: 'correlation_causation',
        description: 'Potential circular reasoning detected',
        impact: 'high',
        correction: 'Avoid using the conclusion to support itself - provide independent evidence'
      });
    }
    
    // Check for weak analogies
    const analogyPattern = /\b(just like|similar to|same as|analogous to)\b.*\b(so|therefore|thus)\b/gi;
    if (analogyPattern.test(text)) {
      fallacies.push({
        type: 'hasty_generalization',
        description: 'Weak analogy may not support the conclusion',
        impact: 'medium',
        correction: 'Ensure the analogy is relevant and the similarities outweigh the differences'
      });
    }
    
    return fallacies;
  };

  // Detect contextual fallacies based on conversation flow
  const detectContextualFallacies = (text: string): LogicalFallacy[] => {
    const fallacies: LogicalFallacy[] = [];
    
    // Check for moving goalposts
    const goalpostPattern = /\b(but that's not|that's different|that doesn't count|but what about)\b/gi;
    if (goalpostPattern.test(text)) {
      fallacies.push({
        type: 'red_herring' as LogicalFallacy['type'],
        description: 'Potential goalpost moving detected',
        impact: 'medium' as const,
        correction: 'Address the original point before introducing new criteria'
      });
    }
    
    // Check for personal incredulity
    const incredulityPattern = /\b(I don't understand|can't see how|hard to believe|doesn't make sense)\b.*\b(so|therefore|thus)\b/gi;
    if (incredulityPattern.test(text)) {
      fallacies.push({
        type: 'appeal_to_emotion' as LogicalFallacy['type'],
        description: 'Personal incredulity may not be a valid argument',
        impact: 'low' as const,
        correction: 'Provide evidence or reasoning rather than relying on personal disbelief'
      });
    }
    
    // Check for burden of proof shifting
    const burdenPattern = /\b(prove it|show me|you can't prove|there's no evidence against)\b/gi;
    if (burdenPattern.test(text)) {
      fallacies.push({
        type: 'appeal_authority',
        description: 'Burden of proof may be shifted inappropriately',
        impact: 'medium',
        correction: 'The person making the claim typically bears the burden of proof'
      });
    }
    
    return fallacies;
  };

  // Merge similar fallacies to avoid duplicates
  const mergeSimilarFallacies = (fallacies: LogicalFallacy[]): LogicalFallacy[] => {
    const merged: LogicalFallacy[] = [];
    const processed = new Set<string>();
    
    fallacies.forEach(fallacy => {
      // Create a normalized key for similarity comparison
      const normalizedDesc = fallacy.description.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (!processed.has(normalizedDesc)) {
        // Find similar fallacies
        const similar = fallacies.filter(f => {
          const otherNormalized = f.description.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          return otherNormalized === normalizedDesc;
        });
        
        if (similar.length > 1) {
          // Merge similar fallacies
          const mergedFallacy: LogicalFallacy = {
            ...fallacy,
            impact: similar.some(f => f.impact === 'high') ? 'high' : 
                   similar.some(f => f.impact === 'medium') ? 'medium' : 'low'
          };
          merged.push(mergedFallacy);
        } else {
          merged.push(fallacy);
        }
        
        processed.add(normalizedDesc);
      }
    });
    
    return merged;
  };

  // Get correction suggestions for fallacies
  const getFallacyCorrection = (fallacyType: LogicalFallacy['type']): string => {
    const corrections = {
      confirmation_bias: 'Consider evidence that might contradict your assumptions',
      correlation_causation: 'Distinguish between correlation and causation',
      sunk_cost: 'Focus on future value rather than past investment',
      appeal_authority: 'Evaluate the argument on its merits, not just the source',
      false_dichotomy: 'Consider alternative options beyond the two presented',
      hasty_generalization: 'Base conclusions on sufficient evidence',
      straw_man: 'Address the actual argument, not a distorted version',
      ad_hominem: 'Focus on the argument, not the person making it',
      appeal_to_emotion: 'Support your position with evidence and reasoning',
      slippery_slope: 'Show clear causal connections between steps',
      post_hoc: 'Establish causation beyond mere sequence of events',
      red_herring: 'Stay focused on the main issue being discussed',
      bandwagon: 'Evaluate the argument on its merits, not its popularity'
    };
    return corrections[fallacyType] || 'Review the logical reasoning';
  };

  // Determine reasoning type from text
  const determineReasoningType = (text: string): ReasoningType => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('problem') && lowerText.includes('solution')) {
      return 'problem_solution_fit';
    }
    if (lowerText.includes('market') || lowerText.includes('customer') || lowerText.includes('demand')) {
      return 'market_validation';
    }
    if (lowerText.includes('revenue') || lowerText.includes('cost') || lowerText.includes('financial')) {
      return 'financial_modeling';
    }
    if (lowerText.includes('competitor') || lowerText.includes('competition')) {
      return 'competitive_analysis';
    }
    if (lowerText.includes('growth') || lowerText.includes('scale') || lowerText.includes('expansion')) {
      return 'growth_strategy';
    }
    if (lowerText.includes('risk') || lowerText.includes('challenge') || lowerText.includes('threat')) {
      return 'risk_assessment';
    }
    
    return 'decision_making';
  };

  // Calculate evidence strength
  const calculateEvidenceStrength = (text: string): EvidenceStrength => {
    const evidenceTypes = {
      data: (text.match(/\b(data|statistics|numbers|metrics|analytics)\b/gi) || []).length,
      research: (text.match(/\b(research|study|survey|analysis)\b/gi) || []).length,
      testimony: (text.match(/\b(testimonial|feedback|review|customer say)\b/gi) || []).length,
      observation: (text.match(/\b(observed|noticed|seen|experienced)\b/gi) || []).length,
      analysis: (text.match(/\b(analysis|evaluation|assessment|comparison)\b/gi) || []).length
    };

    const totalEvidence = Object.values(evidenceTypes).reduce((sum, count) => sum + count, 0);
    const overall = totalEvidence > 0 ? Math.min(totalEvidence / 5, 1) : 0;

    return {
      overall,
      byType: {
        data: Math.min(evidenceTypes.data / 3, 1),
        research: Math.min(evidenceTypes.research / 2, 1),
        testimony: Math.min(evidenceTypes.testimony / 2, 1),
        observation: Math.min(evidenceTypes.observation / 2, 1),
        analysis: Math.min(evidenceTypes.analysis / 2, 1)
      },
      gaps: Object.entries(evidenceTypes)
        .filter(([_, count]) => count === 0)
        .map(([type, _]) => `Missing ${type} evidence`)
    };
  };

  // Enhanced confidence calculation with multi-factor analysis
  const calculateEnhancedConfidence = (
    entities: BusinessEntity[],
    assumptions: Assumption[],
    evidenceStrength: EvidenceStrength,
    logicalGaps: LogicGap[],
    fallacies: LogicalFallacy[],
    text: string
  ): number => {
    // Factor 1: Entity Clarity (0-1)
    const entityClarity = Math.min(entities.length / 8, 1);
    
    // Factor 2: Assumption Support (0-1)
    const assumptionSupport = assumptions.length > 0 
      ? assumptions.reduce((sum, a) => sum + a.confidence, 0) / assumptions.length 
      : 0.5; // Neutral if no assumptions detected
    
    // Factor 3: Evidence Strength (0-1)
    const evidenceFactor = evidenceStrength.overall;
    
    // Factor 4: Logical Coherence (0-1)
    const logicalCoherence = Math.max(0, 1 - (logicalGaps.length * 0.2 + fallacies.length * 0.15));
    
    // Factor 5: Completeness Score (0-1)
    const completenessScore = calculateCompletenessScore(entities, text);
    
    // Factor 6: Language Certainty (0-1)
    const languageCertainty = calculateLanguageCertainty(text);
    
    // Factor 7: Structural Quality (0-1)
    const structuralQuality = calculateStructuralQuality(text);
    
    // Weighted combination of factors
    const weights = {
      entityClarity: 0.15,
      assumptionSupport: 0.20,
      evidenceFactor: 0.25,
      logicalCoherence: 0.20,
      completenessScore: 0.10,
      languageCertainty: 0.05,
      structuralQuality: 0.05
    };
    
    const confidence = 
      entityClarity * weights.entityClarity +
      assumptionSupport * weights.assumptionSupport +
      evidenceFactor * weights.evidenceFactor +
      logicalCoherence * weights.logicalCoherence +
      completenessScore * weights.completenessScore +
      languageCertainty * weights.languageCertainty +
      structuralQuality * weights.structuralQuality;
    
    return Math.min(Math.max(confidence, 0), 1); // Clamp between 0 and 1
  };

  // Calculate completeness score based on reasoning type requirements
  const calculateCompletenessScore = (entities: BusinessEntity[], text: string): number => {
    const reasoningType = determineReasoningType(text);
    const entityTypes = entities.map(e => e.type);
    
    // Required entities for different reasoning types
    const requiredEntities = {
      problem_solution_fit: ['problem', 'solution'] as BusinessEntity['type'][],
      market_validation: ['market', 'customer'] as BusinessEntity['type'][],
      financial_modeling: ['revenue', 'cost'] as BusinessEntity['type'][],
      competitive_analysis: ['competitor'] as BusinessEntity['type'][],
      growth_strategy: ['customer', 'market'] as BusinessEntity['type'][],
      risk_assessment: ['problem'] as BusinessEntity['type'][],
      decision_making: ['problem', 'solution'] as BusinessEntity['type'][]
    };
    
    const required = requiredEntities[reasoningType] || [];
    const present = required.filter(req => entityTypes.includes(req));
    
    return present.length / required.length;
  };

  // Calculate language certainty based on confidence indicators
  const calculateLanguageCertainty = (text: string): number => {
    const certaintyWords = (text.match(/\b(confident|certain|sure|definitely|absolutely|clearly|obviously|evidently)\b/gi) || []).length;
    const uncertaintyWords = (text.match(/\b(uncertain|unsure|maybe|perhaps|might|could|possibly|probably|likely)\b/gi) || []).length;
    const hedgingWords = (text.match(/\b(think|believe|assume|suppose|imagine|guess|estimate)\b/gi) || []).length;
    
    const totalWords = text.split(/\s+/).length;
    const certaintyRatio = certaintyWords / Math.max(totalWords / 20, 1); // Normalize by text length
    const uncertaintyRatio = (uncertaintyWords + hedgingWords) / Math.max(totalWords / 20, 1);
    
    return Math.max(0, Math.min(1, 0.5 + (certaintyRatio - uncertaintyRatio) * 0.5));
  };

  // Calculate structural quality of reasoning
  const calculateStructuralQuality = (text: string): number => {
    // Check for logical connectors
    const logicalConnectors = (text.match(/\b(therefore|thus|hence|because|since|as a result|consequently|however|but|although)\b/gi) || []).length;
    
    // Check for evidence indicators
    const evidenceIndicators = (text.match(/\b(data|research|study|survey|analysis|evidence|proof|example|instance)\b/gi) || []).length;
    
    // Check for reasoning structure
    const reasoningStructure = (text.match(/\b(first|second|third|initially|then|finally|in conclusion|to summarize)\b/gi) || []).length;
    
    // Check for specific examples
    const specificExamples = (text.match(/\b(for example|for instance|such as|like|including)\b/gi) || []).length;
    
    const totalWords = text.split(/\s+/).length;
    const structuralElements = logicalConnectors + evidenceIndicators + reasoningStructure + specificExamples;
    
    return Math.min(1, structuralElements / Math.max(totalWords / 50, 1)); // Normalize by text length
  };

  // Main analysis function with enhanced confidence calculation
  const analyzeBusinessReasoning = (text: string): BusinessNLPResult => {
    const entities = config.enableEntityExtraction ? extractEntities(text) : [];
    const assumptions = config.enableAssumptionDetection ? detectAssumptions(text) : [];
    const logicalGaps = config.enableLogicGapAnalysis ? detectLogicGaps(text, assumptions) : [];
    const fallacies = config.enableFallacyDetection ? detectFallacies(text) : [];
    const reasoningType = determineReasoningType(text);
    const evidenceStrength = calculateEvidenceStrength(text);
    
    // Calculate enhanced confidence using multi-factor analysis
    const confidence = calculateEnhancedConfidence(
      entities,
      assumptions,
      evidenceStrength,
      logicalGaps,
      fallacies,
      text
    );

    // Analyze sentiment and confidence indicators
    const sentiment = {
      confidence: (text.match(/\b(confident|certain|sure|definitely|absolutely)\b/gi) || []).length / 10,
      uncertainty: (text.match(/\b(uncertain|unsure|maybe|perhaps|might|could)\b/gi) || []).length / 10,
      defensiveness: (text.match(/\b(but|however|although|despite|regardless)\b/gi) || []).length / 5
    };

    return {
      entities,
      assumptions,
      logicalGaps,
      reasoningType,
      confidence,
      sentiment
    };
  };

  return {
    analyzeBusinessReasoning,
    extractEntities,
    detectAssumptions,
    detectLogicGaps,
    detectFallacies,
    determineReasoningType,
    calculateEvidenceStrength
  };
};
