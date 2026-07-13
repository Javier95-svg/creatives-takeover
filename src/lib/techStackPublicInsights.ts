export interface TechStackInsightProduct {
  id: string;
  name: string;
  price: string;
  cons: string[];
}

export interface TechStackInsightCategory {
  id: string;
  name: string;
  products: TechStackInsightProduct[];
}

export interface TechStackSavingsOpportunity {
  category: string;
  selectedProduct: string;
  alternativeProduct: string;
  selectedPrice: string;
  alternativePrice: string;
  potentialMonthlySavings: number;
}

export interface TechStackPublicInsights {
  fixedMonthlyCost: number;
  annualFixedCost: number;
  variableCostTools: string[];
  costVisibility: 'High' | 'Moderate' | 'Low';
  costProfile: 'Lean' | 'Balanced' | 'Heavy';
  highestFixedCost: { product: string; monthlyCost: number } | null;
  savingsOpportunities: TechStackSavingsOpportunity[];
  potentialMonthlySavings: number;
  riskSignals: string[];
  summary: string;
}

function parsePrice(price: string) {
  const normalized = price.toLowerCase();
  const variable = normalized.includes('usage-based') || normalized.includes('%') || normalized.includes('per transaction');
  const hasFreeEntry = normalized.includes('free');
  const match = normalized.match(/\$\s?(\d+(?:\.\d+)?)/);
  return {
    variable,
    hasFreeEntry,
    fixedMonthlyCost: !variable && !hasFreeEntry && match ? Number(match[1]) : 0,
  };
}

export function buildTechStackPublicInsights(
  selectedProducts: Record<string, string | null>,
  categories: TechStackInsightCategory[],
): TechStackPublicInsights {
  const selected = categories.flatMap((category) => {
    const product = category.products.find((candidate) => candidate.id === selectedProducts[category.id]);
    return product ? [{ category, product, price: parsePrice(product.price) }] : [];
  });

  const fixedMonthlyCost = selected.reduce((total, item) => total + item.price.fixedMonthlyCost, 0);
  const variableCostTools = selected
    .filter((item) => item.price.variable || item.price.hasFreeEntry)
    .map((item) => item.product.name);
  const fixedItems = selected
    .filter((item) => item.price.fixedMonthlyCost > 0)
    .sort((a, b) => b.price.fixedMonthlyCost - a.price.fixedMonthlyCost);

  const savingsOpportunities = fixedItems.flatMap<TechStackSavingsOpportunity>((item) => {
    const alternatives = item.category.products
      .filter((candidate) => candidate.id !== item.product.id)
      .map((candidate) => ({ product: candidate, price: parsePrice(candidate.price) }))
      .filter((candidate) => candidate.price.hasFreeEntry || candidate.price.fixedMonthlyCost < item.price.fixedMonthlyCost)
      .sort((a, b) => a.price.fixedMonthlyCost - b.price.fixedMonthlyCost);
    const alternative = alternatives[0];
    if (!alternative) return [];
    const potentialMonthlySavings = Math.max(0, item.price.fixedMonthlyCost - alternative.price.fixedMonthlyCost);
    if (potentialMonthlySavings <= 0) return [];
    return [{
      category: item.category.name,
      selectedProduct: item.product.name,
      alternativeProduct: alternative.product.name,
      selectedPrice: item.product.price,
      alternativePrice: alternative.product.price,
      potentialMonthlySavings,
    }];
  }).slice(0, 3);

  const riskSignals = selected
    .flatMap((item) => {
      const risk = item.product.cons.find((con) => /expensive|lock-in|complex|steep|overkill|costs? rise|costs? spiral/i.test(con));
      return risk ? [`${item.product.name}: ${risk}`] : [];
    })
    .slice(0, 3);
  if (variableCostTools.length > 0) {
    riskSignals.unshift(`${variableCostTools.length} selected ${variableCostTools.length === 1 ? 'tool has' : 'tools have'} variable or usage-based pricing, so actual spend can exceed the fixed estimate.`);
  }

  const potentialMonthlySavings = savingsOpportunities.reduce(
    (total, opportunity) => total + opportunity.potentialMonthlySavings,
    0,
  );
  const costVisibility = variableCostTools.length === 0 ? 'High' : variableCostTools.length <= 2 ? 'Moderate' : 'Low';
  const costProfile = fixedMonthlyCost < 100 ? 'Lean' : fixedMonthlyCost < 300 ? 'Balanced' : 'Heavy';
  const summary = potentialMonthlySavings > 0
    ? `You could reduce listed fixed subscriptions by up to $${potentialMonthlySavings.toFixed(0)}/month using lower-entry options in the same categories, before variable usage costs.`
    : variableCostTools.length > 0
      ? `Your listed fixed cost is lean, but ${variableCostTools.length} variable-price ${variableCostTools.length === 1 ? 'tool makes' : 'tools make'} the final monthly spend less predictable.`
      : 'Your selected stack has a clear fixed-cost footprint with no obvious lower-entry swap in the same categories.';

  return {
    fixedMonthlyCost,
    annualFixedCost: fixedMonthlyCost * 12,
    variableCostTools,
    costVisibility,
    costProfile,
    highestFixedCost: fixedItems[0]
      ? { product: fixedItems[0].product.name, monthlyCost: fixedItems[0].price.fixedMonthlyCost }
      : null,
    savingsOpportunities,
    potentialMonthlySavings,
    riskSignals: riskSignals.slice(0, 3),
    summary,
  };
}
