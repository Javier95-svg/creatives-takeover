import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, DollarSign, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useBusinessMetrics } from '@/hooks/useBusinessMetrics';
import { toast } from 'sonner';

interface MetricsEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const MetricsEntryModal = ({ open, onOpenChange, onSuccess }: MetricsEntryModalProps) => {
  const { addOrUpdateMetric, getMetricForDate } = useBusinessMetrics();
  const [date, setDate] = useState<Date>(new Date());
  const [revenue, setRevenue] = useState('');
  const [expenses, setExpenses] = useState('');
  const [customers, setCustomers] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load existing metrics for selected date
  useEffect(() => {
    if (open && date) {
      loadMetricsForDate();
    }
  }, [date, open]);

  const loadMetricsForDate = async () => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingMetric = await getMetricForDate(dateStr);
    
    if (existingMetric) {
      setRevenue(existingMetric.revenue.toString());
      setExpenses(existingMetric.expenses.toString());
      setCustomers(existingMetric.customers_count.toString());
      setHoursWorked(existingMetric.hours_worked.toString());
    } else {
      // Reset to empty if no existing data
      setRevenue('');
      setExpenses('');
      setCustomers('');
      setHoursWorked('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const result = await addOrUpdateMetric(dateStr, {
        revenue: Number(revenue) || 0,
        expenses: Number(expenses) || 0,
        customers_count: Number(customers) || 0,
        hours_worked: Number(hoursWorked) || 0,
      });

      if (result?.success) {
        toast.success('Business metrics saved successfully!');
        onSuccess?.();
        onOpenChange(false);
        resetForm();
      } else {
        toast.error('Failed to save metrics. Please try again.');
      }
    } catch (error) {
      console.error('Error saving metrics:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setRevenue('');
    setExpenses('');
    setCustomers('');
    setHoursWorked('');
    setDate(new Date());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Business Metrics</DialogTitle>
          <DialogDescription>
            Track your daily business performance. Update existing entries or add new ones.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => newDate && setDate(newDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Revenue */}
            <div className="space-y-2">
              <Label htmlFor="revenue" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                Revenue
              </Label>
              <Input
                id="revenue"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
              />
            </div>

            {/* Expenses */}
            <div className="space-y-2">
              <Label htmlFor="expenses" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-red-500" />
                Expenses
              </Label>
              <Input
                id="expenses"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={expenses}
                onChange={(e) => setExpenses(e.target.value)}
              />
            </div>

            {/* Customers */}
            <div className="space-y-2">
              <Label htmlFor="customers" className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Customers
              </Label>
              <Input
                id="customers"
                type="number"
                min="0"
                placeholder="0"
                value={customers}
                onChange={(e) => setCustomers(e.target.value)}
              />
            </div>

            {/* Hours Worked */}
            <div className="space-y-2">
              <Label htmlFor="hours" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                Hours Worked
              </Label>
              <Input
                id="hours"
                type="number"
                step="0.5"
                min="0"
                placeholder="0"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(e.target.value)}
              />
            </div>
          </div>

          {/* Calculated Profit */}
          {(revenue || expenses) && (
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Profit:</span>
                <span className={cn(
                  "font-bold",
                  (Number(revenue) - Number(expenses)) >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  ${((Number(revenue) || 0) - (Number(expenses) || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Metrics'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
