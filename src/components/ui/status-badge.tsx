import { Badge } from '@/components/ui/badge';
import { SubmissionStatus } from '@/lib/types';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: SubmissionStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = {
    pending: {
      label: 'Pending',
      icon: Clock,
      className: 'bg-warning/15 text-warning border-warning/30 hover:bg-warning/20',
    },
    confirmed: {
      label: 'Confirmed',
      icon: CheckCircle,
      className: 'bg-success/15 text-success border-success/30 hover:bg-success/20',
    },
    rejected: {
      label: 'Rejected',
      icon: XCircle,
      className: 'bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20',
    },
  };

  const { label, icon: Icon, className: statusClassName } = config[status];

  return (
    <Badge 
      variant="outline" 
      className={cn('gap-1.5 font-medium', statusClassName, className)}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}
