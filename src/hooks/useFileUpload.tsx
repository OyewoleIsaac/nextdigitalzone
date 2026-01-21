import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadProgress {
  [fieldName: string]: number;
}

interface UploadedFile {
  fieldName: string;
  fileName: string;
  filePath: string;
  fileType: string | null;
  fileSize: number;
}

export function useFileUpload() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (
    file: File,
    fieldName: string,
    submissionType: 'client' | 'artisan',
    maxSizeMB?: number,
    acceptedTypes?: string[]
  ): Promise<UploadedFile | null> => {
    // Validate file size
    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File ${file.name} exceeds maximum size of ${maxSizeMB}MB`);
      return null;
    }

    // Validate file type
    if (acceptedTypes && acceptedTypes.length > 0) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isAccepted = acceptedTypes.some(type => 
        type.toLowerCase() === fileExtension || 
        file.type.includes(type.replace('.', ''))
      );
      
      if (!isAccepted) {
        toast.error(`File type not accepted. Allowed types: ${acceptedTypes.join(', ')}`);
        return null;
      }
    }

    // Generate unique file path
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${submissionType}/${timestamp}_${randomId}_${sanitizedFileName}`;

    setIsUploading(true);
    setUploadProgress(prev => ({ ...prev, [fieldName]: 0 }));

    try {
      const { data, error } = await supabase.storage
        .from('form-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
        return null;
      }

      setUploadProgress(prev => ({ ...prev, [fieldName]: 100 }));

      return {
        fieldName,
        fileName: file.name,
        filePath: data.path,
        fileType: file.type || null,
        fileSize: file.size,
      };
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${file.name}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadMultipleFiles = async (
    files: { file: File; fieldName: string; maxSizeMB?: number; acceptedTypes?: string[] }[],
    submissionType: 'client' | 'artisan'
  ): Promise<UploadedFile[]> => {
    const results: UploadedFile[] = [];
    
    for (const { file, fieldName, maxSizeMB, acceptedTypes } of files) {
      const uploaded = await uploadFile(file, fieldName, submissionType, maxSizeMB, acceptedTypes);
      if (uploaded) {
        results.push(uploaded);
      }
    }
    
    return results;
  };

  const saveAttachments = async (
    submissionId: string,
    submissionType: 'client' | 'artisan',
    uploadedFiles: UploadedFile[]
  ) => {
    if (uploadedFiles.length === 0) return;

    const attachments = uploadedFiles.map(file => ({
      submission_id: submissionId,
      submission_type: submissionType,
      file_name: file.fileName,
      file_path: file.filePath,
      file_type: file.fileType,
    }));

    const { error } = await supabase
      .from('submission_attachments')
      .insert(attachments);

    if (error) {
      console.error('Error saving attachments:', error);
      toast.error('Failed to save file attachments');
    }
  };

  const resetProgress = () => {
    setUploadProgress({});
  };

  return {
    uploadFile,
    uploadMultipleFiles,
    saveAttachments,
    uploadProgress,
    isUploading,
    resetProgress,
  };
}
