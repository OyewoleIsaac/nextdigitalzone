import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JobStatusBadge } from './JobStatusBadge';
import { MapPin, Calendar, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import type { Job } from '@/hooks/useJobs';

interface JobCardProps {
  job: Job;
  onClick?: () => void;
  children?: React.ReactNode;
}

export function JobCard({ job, onClick, children }: JobCardProps) {
  return (
    <Card
      className={onClick ? 'hover:shadow-lg transition-shadow cursor-pointer' : ''}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{job.title}</CardTitle>
          <JobStatusBadge status={job.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {job.category && (
            <span className="flex items-center gap-1">
              <Wrench className="h-3 w-3" /> {job.category.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {job.address}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {format(new Date(job.created_at), 'MMM d, yyyy')}
          </span>
        </div>
        {job.quoted_amount && (
          <p className="text-sm font-semibold">
            Quote: ₦{(job.quoted_amount / 100).toLocaleString()}
          </p>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
