import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { techStackData, TechStackCategory } from '@/data/techStack';
import { CheckCircle2, Calculator, DollarSign, Monitor, Server, Cloud, BarChart, CreditCard, Mail, Users, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Monitor,
  Server,
  Cloud,
  BarChart,
  CreditCard,
  Mail,
  Users,
};

interface SelectedProducts {
  [categoryId: string]: string | null;
}

interface BudgetBreakdown {
  category: string;
  product: string;
  price: string;
  isVariable: boolean;
}

const TechStack: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedProducts, setSelectedProducts] = useState<SelectedProducts>({});
  const [showBudget, setShowBudget] = useState(false);

  const handleProductSelect = (categoryId: string, productId: string) => {
    setSelectedProducts(prev => {
      // If clicking the same product, deselect it
      if (prev[categoryId] === productId) {
        const updated = { ...prev };
        updated[categoryId] = null;
        return updated;
      }
      // Otherwise, select the new product
      return {
        ...prev,
        [categoryId]: productId
      };
    });
  };

  const isProductSelected = (categoryId: string, productId: string): boolean => {
    return selectedProducts[categoryId] === productId;
  };

  const calculateBudget = (): { total: number; breakdown: BudgetBreakdown[]; hasVariable: boolean } => {
    const breakdown: BudgetBreakdown[] = [];
    let total = 0;
    let hasVariable = false;

    techStackData.forEach(category => {
      const selectedProductId = selectedProducts[category.id];
      if (selectedProductId) {
        const product = category.products.find(p => p.id === selectedProductId);
        if (product) {
          const priceStr = product.price.toLowerCase();
          const isVariable = priceStr.includes('usage-based') || 
                            priceStr.includes('free') || 
                            priceStr.includes('%') ||
                            priceStr.includes('per transaction');

          if (isVariable) {
            hasVariable = true;
          } else {
            // Try to extract numeric value from price string
            const priceMatch = priceStr.match(/\$?(\d+(?:\.\d+)?)/);
            if (priceMatch) {
              total += parseFloat(priceMatch[1]);
            }
          }

          breakdown.push({
            category: category.name,
            product: product.name,
            price: product.price,
            isVariable
          });
        }
      }
    });

    return { total, breakdown, hasVariable };
  };

  const budget = useMemo(() => calculateBudget(), [selectedProducts]);

  const handleSeeBudget = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setShowBudget(true);
  };

  const selectedCount = Object.values(selectedProducts).filter(id => id !== null).length;

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      {techStackData.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          selectedProductId={selectedProducts[category.id]}
          onProductSelect={handleProductSelect}
          isProductSelected={isProductSelected}
        />
      ))}

      <div className="sticky bottom-4 z-10 flex justify-center px-4">
        <Card className="w-full max-w-2xl shadow-lg border-2">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-sm text-muted-foreground">
                  {selectedCount} of {techStackData.length} categories selected
                </p>
              </div>
              <Button
                onClick={handleSeeBudget}
                size="lg"
                className="w-full sm:w-auto min-w-[140px]"
                disabled={selectedCount === 0}
              >
                {user ? (
                  <>
                    <Calculator className="w-4 h-4 mr-2" />
                    See Budget
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Sign In to View Budget
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {showBudget && user && (
        <BudgetDisplay
          budget={budget}
          selectedProducts={selectedProducts}
          onClose={() => setShowBudget(false)}
        />
      )}
    </div>
  );
};

interface CategorySectionProps {
  category: TechStackCategory;
  selectedProductId: string | null;
  onProductSelect: (categoryId: string, productId: string) => void;
  isProductSelected: (categoryId: string, productId: string) => boolean;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  selectedProductId,
  onProductSelect,
  isProductSelected
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          {category.name}
          {(() => {
            const IconComponent = iconMap[category.icon];
            return IconComponent ? <IconComponent className="w-6 h-6 text-primary" /> : null;
          })()}
        </CardTitle>
        <CardDescription>
          {category.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px] sm:w-[200px]">Product</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="min-w-[180px]">Pros</TableHead>
                <TableHead className="min-w-[180px]">Cons</TableHead>
                <TableHead className="min-w-[120px] sm:w-[150px]">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {category.products.map((product) => {
                const selected = isProductSelected(category.id, product.id);
                return (
                  <TableRow
                    key={product.id}
                    onClick={() => onProductSelect(category.id, product.id)}
                    className={`cursor-pointer transition-all ${
                      selected
                        ? 'bg-primary/10 border-l-4 border-l-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {product.name}
                        {selected && (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        )}
                        {product.logo && (
                          <img 
                            src={product.logo} 
                            alt={`${product.name} logo`}
                            className="w-5 h-5 object-contain flex-shrink-0 
                              dark:brightness-0 dark:invert 
                              brightness-0 opacity-70"
                            onError={(e) => {
                              // Hide image if it fails to load
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md text-sm">
                      {product.description}
                    </TableCell>
                    <TableCell>
                      <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                        {product.pros.map((pro, idx) => (
                          <li key={idx} className="text-muted-foreground">
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell>
                      <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                        {product.cons.map((con, idx) => (
                          <li key={idx} className="text-muted-foreground">
                            {con}
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell className="font-medium">
                      {product.price}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

interface BudgetDisplayProps {
  budget: { total: number; breakdown: BudgetBreakdown[]; hasVariable: boolean };
  selectedProducts: SelectedProducts;
  onClose: () => void;
}

const BudgetDisplay: React.FC<BudgetDisplayProps> = ({ budget, onClose }) => {
  const { total, breakdown, hasVariable } = budget;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Estimated Monthly Cost
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {breakdown.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div>
                <p className="font-medium">{item.product}</p>
                <p className="text-sm text-muted-foreground">{item.category}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{item.price}</p>
                {item.isVariable && (
                  <p className="text-xs text-muted-foreground">Variable</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total Fixed Cost:</span>
            <span>${total.toFixed(2)}/month</span>
          </div>
          {hasVariable && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> Some selected products have usage-based or variable pricing. 
                The total above only includes fixed monthly costs. Additional charges may apply based on usage.
              </p>
            </div>
          )}
          {breakdown.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Select products from each category to see your estimated budget.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TechStack;

