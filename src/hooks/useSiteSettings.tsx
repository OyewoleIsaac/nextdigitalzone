import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSiteSetting(key: string) {
  return useQuery({
    queryKey: ['site_settings', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings' as any)
        .select('value')
        .eq('key', key)
        .single();
      if (error) throw error;
      return (data as any).value as string;
    },
  });
}

export function useUpdateSiteSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('site_settings' as any)
        .upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: (_data, { key }) => {
      queryClient.invalidateQueries({ queryKey: ['site_settings', key] });
      toast.success('Setting saved.');
    },
    onError: () => {
      toast.error('Failed to save setting.');
    },
  });
}
