import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-warning/15 text-warning border-warning/30' },
  assigned: { label: 'Assigned', className: 'bg-primary/15 text-primary border-primary/30' },
  quoted: { label: 'Quoted', className: 'bg-primary/15 text-primary border-primary/30' },
  inspection_requested: { label: 'Inspection Requested', className: 'bg-warning/15 text-warning border-warning/30' },
  inspection_paid: { label: 'Inspection Paid', className: 'bg-success/15 text-success border-success/30' },
  price_agreed: { label: 'Price Agreed', className: 'bg-primary/15 text-primary border-primary/30' },
  payment_escrowed: { label: 'Payment Held', className: 'bg-success/15 text-success border-success/30' },
  in_progress: { label: 'In Progress', className: 'bg-primary/15 text-primary border-primary/30' },
  completed: { label: 'Completed', className: 'bg-success/15 text-success border-success/30' },
  confirmed: { label: 'Confirmed', className: 'bg-success/15 text-success border-success/30' },
  disputed: { label: 'Disputed', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground border-muted' },
};

export function JobStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: '' };
  return (
    <Badge variant="outline" className={cn('border', config.className)}>
      {config.label}
    </Badge>
  );
}
