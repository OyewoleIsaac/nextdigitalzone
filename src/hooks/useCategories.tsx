import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
export type { Category } from '@/lib/types';
import type { Category } from '@/lib/types';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as unknown as Category[];
    },
  });
}

export function useAllCategories() {
  return useQuery({
    queryKey: ['all-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as unknown as Category[];
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (category: {
      name: string; slug: string; description?: string;
      requires_inspection?: boolean; default_inspection_fee?: number;
      is_agency_job?: boolean; default_agency_fee?: number;
    }) => {
      const { error } = await supabase.from('categories').insert(category as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['all-categories'] });
      toast.success('Category created successfully');
    },
    onError: (error: Error) => toast.error(`Failed to create category: ${error.message}`),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('categories').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['all-categories'] });
      toast.success('Category updated successfully');
    },
    onError: (error: Error) => toast.error(`Failed to update category: ${error.message}`),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['all-categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: Error) => toast.error(`Failed to delete category: ${error.message}`),
  });
}
