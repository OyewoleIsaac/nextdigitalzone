import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Dispute {
  id: string;
  job_id: string | null;
  customer_id: string;
  artisan_id: string | null;
  reason: string;
  status: 'open' | 'resolved' | 'closed';
  resolution_notes: string | null;
  preferred_refund_type: 'wallet_credit' | 'cash_refund' | null;
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
      if (!data || data.length === 0) return [];

      // Fetch profiles for all participants
      const userIds = [
        ...new Set([
          ...data.map((d) => d.customer_id),
          ...data.filter((d) => d.artisan_id).map((d) => d.artisan_id as string),
        ])
      ];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));

      return data.map((d) => ({
        ...d,
        customer_profile: profileMap[d.customer_id] || null,
        artisan_profile: d.artisan_id ? (profileMap[d.artisan_id] || null) : null,
      })) as (Dispute & { customer_profile: { full_name: string; phone: string } | null; artisan_profile: { full_name: string; phone: string } | null })[];
    },
  });
}

export function useOpenDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      job_id?: string | null;
      artisan_id?: string | null;
      reason: string;
      preferred_refund_type?: 'wallet_credit' | 'cash_refund';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('disputes').insert({
        job_id: payload.job_id ?? null,
        customer_id: user.id,
        artisan_id: payload.artisan_id ?? null,
        reason: payload.reason,
        preferred_refund_type: payload.preferred_refund_type ?? null,
      } as any);
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

export function useProcessRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      dispute_id: string;
      refund_type: 'wallet_credit' | 'partial' | 'full' | 'none';
      resolution_notes?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: payload,
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, vars) => {
      const msg =
        vars.refund_type === 'none'
          ? 'Dispute closed. No refund issued.'
          : vars.refund_type === 'wallet_credit'
            ? 'Full ₦5,000 issued as platform wallet credit!'
            : vars.refund_type === 'full'
              ? 'Full ₦5,000 cash refund issued successfully!'
              : 'Partial ₦4,700 cash refund issued successfully!';
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ['all-disputes'] });
      qc.invalidateQueries({ queryKey: ['all-jobs'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to process refund'),
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
