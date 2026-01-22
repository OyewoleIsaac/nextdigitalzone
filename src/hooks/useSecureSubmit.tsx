import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClientSubmissionData {
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  nin: string;
  service_description?: string;
  category_id?: string;
  metadata?: Record<string, unknown>;
  honeypot?: string;
}

interface ArtisanSubmissionData {
  full_name: string;
  email: string;
  phone?: string;
  location?: string;
  category_id?: string;
  custom_category?: string;
  years_experience?: number;
  metadata?: Record<string, unknown>;
  honeypot?: string;
}

interface AttachmentData {
  file_name: string;
  file_path: string;
  file_type?: string;
}

interface SubmitFormResponse {
  success: boolean;
  id: string;
  error?: string;
  code?: string;
}

export function useSubmitClientForm() {
  return useMutation({
    mutationFn: async (data: {
      formData: ClientSubmissionData;
      attachments?: AttachmentData[];
    }): Promise<SubmitFormResponse> => {
      const { data: result, error } = await supabase.functions.invoke<SubmitFormResponse>(
        'submit-form',
        {
          body: {
            type: 'client',
            data: data.formData,
            attachments: data.attachments,
          },
        }
      );

      if (error) {
        throw new Error(error.message || 'Failed to submit form');
      }

      if (!result?.success && result?.error) {
        throw new Error(result.error);
      }

      return result!;
    },
  });
}

export function useSubmitArtisanForm() {
  return useMutation({
    mutationFn: async (data: {
      formData: ArtisanSubmissionData;
      attachments?: AttachmentData[];
    }): Promise<SubmitFormResponse> => {
      const { data: result, error } = await supabase.functions.invoke<SubmitFormResponse>(
        'submit-form',
        {
          body: {
            type: 'artisan',
            data: data.formData,
            attachments: data.attachments,
          },
        }
      );

      if (error) {
        throw new Error(error.message || 'Failed to submit form');
      }

      if (!result?.success && result?.error) {
        throw new Error(result.error);
      }

      return result!;
    },
  });
}