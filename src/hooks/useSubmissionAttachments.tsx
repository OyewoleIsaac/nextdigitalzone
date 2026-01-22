import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SubmissionAttachment {
  id: string;
  submission_id: string;
  submission_type: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  created_at: string;
}

export function useSubmissionAttachments(submissionId: string | undefined, submissionType: 'client' | 'artisan') {
  return useQuery({
    queryKey: ['submission-attachments', submissionId, submissionType],
    queryFn: async () => {
      if (!submissionId) return [];
      
      const { data, error } = await supabase
        .from('submission_attachments')
        .select('*')
        .eq('submission_id', submissionId)
        .eq('submission_type', submissionType)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as SubmissionAttachment[];
    },
    enabled: !!submissionId,
  });
}