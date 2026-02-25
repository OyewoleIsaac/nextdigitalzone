import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Review {
  id: string;
  job_id: string;
  customer_id: string;
  artisan_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface ArtisanViolation {
  id: string;
  artisan_id: string;
  violation_type: 'bypass_attempt' | 'no_show' | 'poor_quality' | 'other';
  reported_by: string;
  notes: string | null;
  created_at: string;
}

export function useReviewsForArtisan(artisanId?: string) {
  return useQuery({
    queryKey: ['reviews', artisanId],
    queryFn: async () => {
      if (!artisanId) return [];
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('artisan_id', artisanId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
    enabled: !!artisanId,
  });
}

export function useReviewForJob(jobId?: string) {
  return useQuery({
    queryKey: ['review-job', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data } = await supabase.from('reviews').select('*').eq('job_id', jobId).maybeSingle();
      return data as Review | null;
    },
    enabled: !!jobId,
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { job_id: string; artisan_id: string; rating: number; comment?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('reviews').insert({
        job_id: payload.job_id,
        artisan_id: payload.artisan_id,
        customer_id: user.id,
        rating: payload.rating,
        comment: payload.comment || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success('Review submitted!');
      qc.invalidateQueries({ queryKey: ['reviews', vars.artisan_id] });
      qc.invalidateQueries({ queryKey: ['review-job', vars.job_id] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to submit review'),
  });
}

export function useViolationsForArtisan(artisanId?: string) {
  return useQuery({
    queryKey: ['violations', artisanId],
    queryFn: async () => {
      if (!artisanId) return [];
      const { data, error } = await supabase
        .from('artisan_violations')
        .select('*')
        .eq('artisan_id', artisanId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ArtisanViolation[];
    },
    enabled: !!artisanId,
  });
}

export function useReportViolation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { artisan_id: string; violation_type: ArtisanViolation['violation_type']; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('artisan_violations').insert({
        artisan_id: payload.artisan_id,
        violation_type: payload.violation_type,
        reported_by: user.id,
        notes: payload.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success('Violation reported.');
      qc.invalidateQueries({ queryKey: ['violations', vars.artisan_id] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to report violation'),
  });
}
