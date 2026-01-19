import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'file' | 'checkbox';
  label: string;
  name: string;
  placeholder?: string;
  required: boolean;
  options?: FormFieldOption[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  helperText?: string;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in MB
}

export interface FormConfig {
  id: string;
  target_type: 'client' | 'artisan';
  field_schema: FormField[];
  created_at: string;
  updated_at: string;
}

// Default fields for client form
export const defaultClientFields: FormField[] = [
  {
    id: 'full_name',
    type: 'text',
    label: 'Full Name',
    name: 'full_name',
    placeholder: 'Enter your full name',
    required: true,
    validation: { minLength: 2, maxLength: 100 },
  },
  {
    id: 'email',
    type: 'email',
    label: 'Email Address',
    name: 'email',
    placeholder: 'your.email@example.com',
    required: true,
  },
  {
    id: 'phone',
    type: 'phone',
    label: 'Phone Number',
    name: 'phone',
    placeholder: '+234 XXX XXX XXXX',
    required: true,
  },
  {
    id: 'address',
    type: 'textarea',
    label: 'Residential Address',
    name: 'address',
    placeholder: 'Enter your full address',
    required: true,
    validation: { maxLength: 500 },
  },
  {
    id: 'nin',
    type: 'text',
    label: 'NIN (National Identification Number)',
    name: 'nin',
    placeholder: 'Enter your 11-digit NIN',
    required: true,
    validation: { minLength: 11, maxLength: 11 },
    helperText: 'Your 11-digit National Identification Number',
  },
  {
    id: 'service_description',
    type: 'textarea',
    label: 'Service Description',
    name: 'service_description',
    placeholder: 'Describe the service you need...',
    required: true,
    validation: { minLength: 20, maxLength: 1000 },
  },
];

// Default fields for artisan form
export const defaultArtisanFields: FormField[] = [
  {
    id: 'full_name',
    type: 'text',
    label: 'Full Name',
    name: 'full_name',
    placeholder: 'Enter your full name',
    required: true,
    validation: { minLength: 2, maxLength: 100 },
  },
  {
    id: 'email',
    type: 'email',
    label: 'Email Address',
    name: 'email',
    placeholder: 'your.email@example.com',
    required: true,
  },
  {
    id: 'phone',
    type: 'phone',
    label: 'Phone Number',
    name: 'phone',
    placeholder: '+234 XXX XXX XXXX',
    required: true,
  },
  {
    id: 'location',
    type: 'text',
    label: 'Location',
    name: 'location',
    placeholder: 'City, State',
    required: true,
  },
  {
    id: 'years_experience',
    type: 'number',
    label: 'Years of Experience',
    name: 'years_experience',
    placeholder: 'Enter years of experience',
    required: true,
    validation: { min: 0, max: 50 },
  },
];

export function useFormConfig(targetType: 'client' | 'artisan') {
  return useQuery({
    queryKey: ['form-config', targetType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_configs')
        .select('*')
        .eq('target_type', targetType)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        // Return default config if none exists
        return {
          id: '',
          target_type: targetType,
          field_schema: targetType === 'client' ? defaultClientFields : defaultArtisanFields,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as FormConfig;
      }

      return {
        ...data,
        field_schema: data.field_schema as unknown as FormField[],
      } as FormConfig;
    },
  });
}

export function useFormConfigs() {
  return useQuery({
    queryKey: ['form-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_configs')
        .select('*')
        .order('target_type');

      if (error) throw error;
      
      return data.map(config => ({
        ...config,
        field_schema: config.field_schema as unknown as FormField[],
      })) as FormConfig[];
    },
  });
}

export function useSaveFormConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      targetType, 
      fields 
    }: { 
      targetType: 'client' | 'artisan'; 
      fields: FormField[] 
    }) => {
      // Check if config exists
      const { data: existing } = await supabase
        .from('form_configs')
        .select('id')
        .eq('target_type', targetType)
        .maybeSingle();

      const fieldSchema = fields as unknown as Json;

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('form_configs')
          .update({ field_schema: fieldSchema })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('form_configs')
          .insert({ target_type: targetType, field_schema: fieldSchema })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['form-config', variables.targetType] });
      queryClient.invalidateQueries({ queryKey: ['form-configs'] });
      toast.success('Form configuration saved successfully!');
    },
    onError: (error) => {
      console.error('Error saving form config:', error);
      toast.error('Failed to save form configuration');
    },
  });
}
