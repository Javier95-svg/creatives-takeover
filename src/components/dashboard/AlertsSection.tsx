import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDashboardAlerts } from '@/hooks/useDashboardAlerts';
import { Link } from 'react-router-dom';

const AlertIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-success" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    case 'error':
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    default:
      return <Info className="h-5 w-5 text-info" />;
  }
};

export const AlertsSection = () => {
  const { alerts, isLoading, dismissAlert } = useDashboardAlerts();

  if (isLoading || alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <Card
          key={alert.id}
          className={`p-4 border-l-4 ${
            alert.alert_type === 'success' ? 'border-l-green-500' :
            alert.alert_type === 'warning' ? 'border-l-yellow-500' :
            alert.alert_type === 'error' ? 'border-l-red-500' :
            'border-l-blue-500'
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertIcon type={alert.alert_type} />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm">{alert.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
              {alert.action_link && alert.action_label && (
                <Link to={alert.action_link}>
                  <Button variant="link" className="h-auto p-0 mt-2 text-xs">
                    {alert.action_label} →
                  </Button>
                </Link>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => dismissAlert(alert.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};
