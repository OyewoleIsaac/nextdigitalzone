import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Dispute {
  id: string;
  job_id: string;
  customer_id: string;
  artisan_id: string;
  reason: string;
  status: 'open' | 'resolved' | 'closed';
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useDisputeForJob(jobId?: string) {
  return useQuery({
    queryKey: ['dispute-job', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data } = await supabase
        .from('disputes')
        .select('*')
        .eq('job_id', jobId)
        .maybeSingle();
      return data as Dispute | null;
    },
    enabled: !!jobId,
  });
}

export function useAllDisputes() {
  return useQuery({
    queryKey: ['all-disputes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disputes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Dispute[];
    },
  });
}

export function useOpenDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { job_id: string; artisan_id: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('disputes').insert({
        job_id: payload.job_id,
        customer_id: user.id,
        artisan_id: payload.artisan_id,
        reason: payload.reason,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success('Dispute opened. Our team will review shortly.');
      qc.invalidateQueries({ queryKey: ['dispute-job', vars.job_id] });
      qc.invalidateQueries({ queryKey: ['all-disputes'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to open dispute'),
  });
}

export function useResolveDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; status: 'resolved' | 'closed'; resolution_notes?: string }) => {
      const { error } = await supabase
        .from('disputes')
        .update({ status: payload.status, resolution_notes: payload.resolution_notes || null })
        .eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Dispute updated.');
      qc.invalidateQueries({ queryKey: ['all-disputes'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update dispute'),
  });
}
