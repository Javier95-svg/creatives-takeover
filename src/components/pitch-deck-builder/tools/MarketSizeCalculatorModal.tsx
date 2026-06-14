import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Copy, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface MarketSizeCalculatorModalProps {
  onClose: () => void;
}

export const MarketSizeCalculatorModal: React.FC<MarketSizeCalculatorModalProps> = ({ onClose }) => {
  const [industry, setIndustry] = useState('');
  const [totalMarket, setTotalMarket] = useState('');
  const [reachableMarket, setReachableMarket] = useState('');
  const [targetShare, setTargetShare] = useState('');
  const [timeframe, setTimeframe] = useState('5');

  const calculateTAM = () => {
    return parseFloat(totalMarket) || 0;
  };

  const calculateSAM = () => {
    const tam = calculateTAM();
    const reachablePercent = parseFloat(reachableMarket) || 0;
    return (tam * reachablePercent) / 100;
  };

  const calculateSOM = () => {
    const sam = calculateSAM();
    const sharePercent = parseFloat(targetShare) || 0;
    return (sam * sharePercent) / 100;
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}B`;
    }
    return `$${value.toFixed(0)}M`;
  };

  const handleCopyResults = () => {
    const tam = calculateTAM();
    const sam = calculateSAM();
    const som = calculateSOM();

    const text = `Market Size Analysis${industry ? ` - ${industry}` : ''}

TAM (Total Addressable Market): ${formatCurrency(tam)}
The total revenue opportunity if we achieved 100% market share across all geographies and segments.

SAM (Serviceable Available Market): ${formatCurrency(sam)} (${reachableMarket}% of TAM)
The portion of TAM we can realistically serve with our product and go-to-market strategy.

SOM (Serviceable Obtainable Market): ${formatCurrency(som)} (${targetShare}% of SAM)
Our realistic revenue target within ${timeframe} years given competition and market conditions.

Key Insight: We're targeting ${formatCurrency(som)} in revenue over ${timeframe} years, which represents ${((som / tam) * 100).toFixed(2)}% of the total ${formatCurrency(tam)} market opportunity.`;

    void navigator.clipboard.writeText(text);
    toast.success('Market analysis copied to clipboard!');
  };

  const tam = calculateTAM();
  const sam = calculateSAM();
  const som = calculateSOM();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Market Size Calculator
          </DialogTitle>
          <DialogDescription>
            Calculate your TAM, SAM, and SOM to demonstrate market opportunity to investors
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="industry">Industry / Category (optional)</Label>
              <Input
                id="industry"
                placeholder="e.g., Cloud Accounting Software for SMBs"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="totalMarket">Total Market Size (in millions)</Label>
                <Input
                  id="totalMarket"
                  type="number"
                  placeholder="e.g., 50000"
                  value={totalMarket}
                  onChange={(e) => setTotalMarket(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  TAM: Total revenue if you had 100% market share globally
                </p>
              </div>

              <div>
                <Label htmlFor="reachableMarket">Reachable Market (%)</Label>
                <Input
                  id="reachableMarket"
                  type="number"
                  placeholder="e.g., 10"
                  value={reachableMarket}
                  onChange={(e) => setReachableMarket(e.target.value)}
                  className="mt-1"
                  min="0"
                  max="100"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  SAM: % of TAM you can actually serve (geography, segment, etc.)
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="targetShare">Target Market Share (%)</Label>
                <Input
                  id="targetShare"
                  type="number"
                  placeholder="e.g., 2"
                  value={targetShare}
                  onChange={(e) => setTargetShare(e.target.value)}
                  className="mt-1"
                  min="0"
                  max="100"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  SOM: Realistic % of SAM you'll capture given competition
                </p>
              </div>

              <div>
                <Label htmlFor="timeframe">Timeframe (years)</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger id="timeframe" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 year</SelectItem>
                    <SelectItem value="3">3 years</SelectItem>
                    <SelectItem value="5">5 years</SelectItem>
                    <SelectItem value="10">10 years</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  When do you expect to reach this market share?
                </p>
              </div>
            </div>
          </div>

          {/* Results Section */}
          {tam > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Your Market Opportunity</h3>

              <div className="space-y-3">
                <Card className="p-4 bg-info-subtle border-info">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-info">TAM - Total Addressable Market</p>
                      <p className="text-2xl font-bold text-info mt-1">{formatCurrency(tam)}</p>
                      <p className="text-xs text-info mt-1">
                        The total revenue opportunity if you achieved 100% market share
                      </p>
                    </div>
                  </div>
                </Card>

                {sam > 0 && (
                  <Card className="p-4 bg-info-subtle border-info">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-info">SAM - Serviceable Available Market</p>
                        <p className="text-2xl font-bold text-info mt-1">{formatCurrency(sam)}</p>
                        <p className="text-xs text-info mt-1">
                          {reachableMarket}% of TAM that you can realistically serve
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {som > 0 && (
                  <Card className="p-4 bg-success-subtle border-success">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-success">SOM - Serviceable Obtainable Market</p>
                        <p className="text-2xl font-bold text-success mt-1">{formatCurrency(som)}</p>
                        <p className="text-xs text-success mt-1">
                          {targetShare}% of SAM - your realistic revenue target in {timeframe} years
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {som > 0 && (
                <Card className="p-4 bg-muted/30">
                  <h4 className="font-semibold mb-2">Key Insight for Investors</h4>
                  <p className="text-sm text-muted-foreground">
                    We're targeting <strong>{formatCurrency(som)}</strong> in revenue over{' '}
                    <strong>{timeframe} years</strong>, which represents{' '}
                    <strong>{((som / tam) * 100).toFixed(2)}%</strong> of the total{' '}
                    <strong>{formatCurrency(tam)}</strong> market opportunity.
                    {((som / tam) * 100) < 5 && ' This conservative target demonstrates realistic growth expectations.'}
                  </p>
                </Card>
              )}

              <Button onClick={handleCopyResults} variant="outline" className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Copy Market Analysis
              </Button>
            </div>
          )}

          {/* Tips Section */}
          <Card className="p-4 bg-primary/5">
            <h4 className="font-semibold mb-2">Tips for Calculating Market Size</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use credible sources (Gartner, IDC, industry reports) for TAM</li>
              <li>SAM should reflect realistic constraints (geography, segment, channels)</li>
              <li>SOM should be conservative - investors prefer realistic targets</li>
              <li>For early-stage startups, 2-5% SOM is typical; 10%+ raises red flags</li>
              <li>Show your math and cite sources in your pitch deck</li>
            </ul>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
