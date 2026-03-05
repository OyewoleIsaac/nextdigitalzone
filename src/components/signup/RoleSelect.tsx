import { User, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { UserRole } from '@/lib/types';

interface RoleSelectProps {
  onSelect: (role: UserRole) => void;
}

export function RoleSelect({ onSelect }: RoleSelectProps) {
  return (
    <div className="space-y-4">
      <button
        onClick={() => onSelect('customer')}
        className="w-full p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left flex items-start gap-4"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <User className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">I need a service</h3>
          <p className="text-sm text-muted-foreground mt-1">Find skilled artisans near you for plumbing, electrical, carpentry and more.</p>
        </div>
      </button>

      <button
        onClick={() => onSelect('artisan')}
        className="w-full p-6 rounded-xl border-2 border-border hover:border-secondary hover:bg-secondary/5 transition-all text-left flex items-start gap-4"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10 text-secondary shrink-0">
          <Wrench className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">I'm an artisan</h3>
          <p className="text-sm text-muted-foreground mt-1">Join the marketplace and get connected to customers who need your skills.</p>
        </div>
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
      </p>
    </div>
  );
}
