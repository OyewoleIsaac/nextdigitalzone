import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface WalletTransaction {
  id: string;
  user_id: string;
  amount: number; // kobo — positive = credit, negative = debit
  type: 'credit' | 'debit';
  description: string;
  reference: string | null;
  created_at: string;
}

export function useWallet() {
  const { user } = useAuth();

  const balanceQuery = useQuery({
    queryKey: ['wallet-balance', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return (data?.wallet_balance ?? 0) as number;
    },
    enabled: !!user,
  });

  const transactionsQuery = useQuery({
    queryKey: ['wallet-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WalletTransaction[];
    },
    enabled: !!user,
  });

  return {
    balance: balanceQuery.data ?? 0,
    isLoadingBalance: balanceQuery.isLoading,
    transactions: transactionsQuery.data ?? [],
    isLoadingTransactions: transactionsQuery.isLoading,
  };
}

export function usePayWithWalletCredit() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ job_id, amount }: { job_id: string; amount: number }) => {
      if (!user) throw new Error('Not authenticated');

      // Check balance first
      const { data: profileData } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', user.id)
        .single();

      const balance = profileData?.wallet_balance ?? 0;
      if (balance < amount) throw new Error(`Insufficient wallet balance. You have ₦${(balance / 100).toLocaleString()} but need ₦${(amount / 100).toLocaleString()}.`);

      // Deduct from wallet balance
      await supabase
        .from('profiles')
        .update({ wallet_balance: balance - amount })
        .eq('user_id', user.id);

      // Log the debit transaction
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        amount: -amount,
        type: 'debit',
        description: `Booking fee paid using wallet credit for job`,
        reference: job_id,
      });

      // Update job to pending (as if paid via Paystack webhook)
      await supabase
        .from('jobs')
        .update({ status: 'pending' })
        .eq('id', job_id)
        .eq('customer_id', user.id);

      // Insert a payment record
      const { data: job } = await supabase
        .from('jobs')
        .select('artisan_id')
        .eq('id', job_id)
        .single();

      await supabase.from('payments').insert({
        job_id,
        customer_id: user.id,
        artisan_id: job?.artisan_id ?? user.id, // fallback
        amount,
        commission_amount: 0,
        artisan_amount: 0,
        payment_type: 'inspection_fee',
        status: 'paid',
        paid_at: new Date().toISOString(),
        paystack_reference: `wallet-credit-${Date.now()}`,
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['customer-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Booking fee paid using wallet credit! Your request is now active.');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to pay with wallet credit');
    },
  });
}
