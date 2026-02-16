import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Profile, ArtisanProfile } from '@/lib/types';

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });
}

export function useArtisanProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['artisan-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('artisan_profiles')
        .select('*, category:categories(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as ArtisanProfile | null;
    },
    enabled: !!user,
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      user_id: string;
      role: 'customer' | 'artisan';
      full_name: string;
      phone: string;
      address?: string;
      latitude?: number;
      longitude?: number;
    }) => {
      const { data: result, error } = await supabase
        .from('profiles')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useCreateArtisanProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      user_id: string;
      category_id?: string;
      custom_category?: string;
      years_experience?: number;
      bio?: string;
      latitude: number;
      longitude: number;
      service_radius_km?: number;
    }) => {
      const { data: result, error } = await supabase
        .from('artisan_profiles')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artisan-profile'] });
    },
  });
}
