import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClientSubmission, ArtisanSubmission, SubmissionStatus } from '@/lib/types';
import { toast } from 'sonner';

// Client Submissions
export function useClientSubmissions(status?: SubmissionStatus) {
  return useQuery({
    queryKey: ['client-submissions', status],
    queryFn: async () => {
      let query = supabase
        .from('client_submissions')
        .select('*, category:categories(*)');
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ClientSubmission[];
    },
  });
}

export function useUpdateClientSubmission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: SubmissionStatus; rejection_reason?: string }) => {
      const { data, error } = await supabase
        .from('client_submissions')
        .update({ status, rejection_reason })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-submissions'] });
      toast.success('Submission updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update submission: ${error.message}`);
    },
  });
}

export function useDeleteClientSubmission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('client_submissions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-submissions'] });
      toast.success('Submission deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete submission: ${error.message}`);
    },
  });
}

// Artisan Submissions
export function useArtisanSubmissions(status?: SubmissionStatus) {
  return useQuery({
    queryKey: ['artisan-submissions', status],
    queryFn: async () => {
      let query = supabase
        .from('artisan_submissions')
        .select('*, category:categories(*)');
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ArtisanSubmission[];
    },
  });
}

export function useUpdateArtisanSubmission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: SubmissionStatus; rejection_reason?: string }) => {
      const { data, error } = await supabase
        .from('artisan_submissions')
        .update({ status, rejection_reason })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artisan-submissions'] });
      toast.success('Submission updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update submission: ${error.message}`);
    },
  });
}

export function useDeleteArtisanSubmission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('artisan_submissions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artisan-submissions'] });
      toast.success('Submission deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete submission: ${error.message}`);
    },
  });
}

// Submit forms (public)
export function useSubmitClientForm() {
  return useMutation({
    mutationFn: async (data: {
      full_name: string;
      email: string;
      phone?: string;
      address?: string;
      nin: string;
      service_description?: string;
      category_id?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data: result, error } = await supabase
        .from('client_submissions')
        .insert({ ...data, status: 'pending' })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
  });
}

export function useSubmitArtisanForm() {
  return useMutation({
    mutationFn: async (data: {
      full_name: string;
      email: string;
      phone?: string;
      location?: string;
      category_id?: string;
      custom_category?: string;
      years_experience?: number;
      metadata?: Record<string, unknown>;
    }) => {
      const { data: result, error } = await supabase
        .from('artisan_submissions')
        .insert({ ...data, status: 'pending' })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
  });
}
