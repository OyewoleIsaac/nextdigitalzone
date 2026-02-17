import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Job {
  id: string;
  customer_id: string;
  artisan_id: string | null;
  category_id: string | null;
  title: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  status: string;
  requires_inspection: boolean;
  inspection_fee: number | null;
  quoted_amount: number | null;
  final_amount: number | null;
  commission_percent: number;
  assigned_by: string | null;
  admin_assigner_id: string | null;
  photo_before: string | null;
  photo_after: string | null;
  guarantee_expires_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string; slug: string };
  customer_profile?: { full_name: string; phone: string; address: string | null };
  artisan_profile?: { full_name: string; phone: string } | null;
}

export interface JobStatusHistory {
  id: string;
  job_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string;
  notes: string | null;
  created_at: string;
}

// Customer: fetch own jobs
export function useCustomerJobs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['customer-jobs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('jobs')
        .select('*, category:categories(id, name, slug)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Job[];
    },
    enabled: !!user,
  });
}

// Artisan: fetch assigned jobs
export function useArtisanJobs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['artisan-jobs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('jobs')
        .select('*, category:categories(id, name, slug)')
        .eq('artisan_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Job[];
    },
    enabled: !!user,
  });
}

// Admin: fetch all jobs
export function useAllJobs(statusFilter?: string) {
  return useQuery({
    queryKey: ['all-jobs', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select('*, category:categories(id, name, slug)')
        .order('created_at', { ascending: false });
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Job[];
    },
  });
}

// Fetch job status history
export function useJobHistory(jobId: string) {
  return useQuery({
    queryKey: ['job-history', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_status_history')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as JobStatusHistory[];
    },
    enabled: !!jobId,
  });
}

// Create a new job
export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      customer_id: string;
      category_id: string;
      title: string;
      description: string;
      address: string;
      latitude: number;
      longitude: number;
    }) => {
      const { data: result, error } = await supabase
        .from('jobs')
        .insert(data)
        .select()
        .single();
      if (error) throw error;

      // Insert initial status history
      await supabase.from('job_status_history').insert({
        job_id: result.id,
        new_status: 'pending' as unknown as string,
        changed_by: data.customer_id,
        notes: 'Job request submitted',
      } as any);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['all-jobs'] });
      toast.success('Service request submitted successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit request: ${error.message}`);
    },
  });
}

// Update job (generic)
export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['artisan-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['all-jobs'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update job: ${error.message}`);
    },
  });
}

// Add status history entry
export function useAddJobHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      job_id: string;
      old_status: string | null;
      new_status: string;
      changed_by: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('job_status_history')
        .insert(data as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['job-history', vars.job_id] });
    },
  });
}
