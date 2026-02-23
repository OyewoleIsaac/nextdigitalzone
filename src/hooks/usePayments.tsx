import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Payment {
  id: string;
  job_id: string;
  customer_id: string;
  artisan_id: string;
  amount: number;
  commission_amount: number;
  artisan_amount: number;
  payment_type: 'inspection_fee' | 'job_payment';
  status: 'pending' | 'paid' | 'held' | 'released' | 'refunded';
  paystack_reference: string | null;
  paystack_transfer_code: string | null;
  paid_at: string | null;
  released_at: string | null;
  created_at: string;
}

export function usePaymentsForJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ['payments', jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!jobId,
  });
}

export function useCustomerPayments() {
  return useQuery({
    queryKey: ['customer-payments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
  });
}

export function useAllPayments() {
  return useQuery({
    queryKey: ['all-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
  });
}

export function useInitializePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      job_id,
      payment_type,
      amount,
    }: {
      job_id: string;
      payment_type: 'inspection_fee' | 'job_payment';
      amount: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('initialize-payment', {
        body: { job_id, payment_type, amount },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as { authorization_url: string; reference: string; access_code: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (error: Error) => {
      toast.error(`Payment failed: ${error.message}`);
    },
  });
}

export function useReleasePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (job_id: string) => {
      const { data, error } = await supabase.functions.invoke('release-payment', {
        body: { job_id },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['customer-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['all-jobs'] });
      toast.success('Payment released and job confirmed!');
    },
    onError: (error: Error) => {
      toast.error(`Release failed: ${error.message}`);
    },
  });
}
