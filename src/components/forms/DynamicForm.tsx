import { useState, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { DynamicField } from './DynamicField';
import { buildValidationSchema, getDefaultValues } from './formValidation';
import { FormField } from '@/hooks/useFormConfigs';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from 'sonner';

interface DynamicFormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, unknown>, uploadedFiles: { fieldName: string; filePath: string; fileName: string }[]) => Promise<void>;
  title?: string;
  description?: string;
  submitLabel?: string;
  isSubmitting?: boolean;
  submissionType?: 'client' | 'artisan';
}

export function DynamicForm({
  fields,
  onSubmit,
  title,
  description,
  submitLabel = 'Submit',
  isSubmitting = false,
  submissionType = 'client',
}: DynamicFormProps) {
  const schema = buildValidationSchema(fields);
  const defaultValues = getDefaultValues(fields);
  const { uploadFile, uploadProgress, isUploading } = useFileUpload();
  const [pendingFiles, setPendingFiles] = useState<Map<string, File>>(new Map());

  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { errors },
  } = methods;

  const handleFileSelect = useCallback((fieldName: string, file: File | null) => {
    setPendingFiles(prev => {
      const newMap = new Map(prev);
      if (file) {
        newMap.set(fieldName, file);
      } else {
        newMap.delete(fieldName);
      }
      return newMap;
    });
  }, []);

  const onFormSubmit = async (data: Record<string, unknown>) => {
    // Upload all pending files first
    const fileFields = fields.filter(f => f.type === 'file');
    const uploadedFiles: { fieldName: string; filePath: string; fileName: string }[] = [];

    for (const field of fileFields) {
      const file = pendingFiles.get(field.name);
      if (file) {
        const result = await uploadFile(
          file,
          field.name,
          submissionType,
          field.maxFileSize,
          field.acceptedFileTypes
        );
        
        if (result) {
          uploadedFiles.push({
            fieldName: result.fieldName,
            filePath: result.filePath,
            fileName: result.fileName,
          });
        } else if (field.required) {
          toast.error(`Failed to upload required file: ${field.label}`);
          return;
        }
      } else if (field.required) {
        toast.error(`Please upload a file for: ${field.label}`);
        return;
      }
    }

    // Remove file fields from data (they're handled separately)
    const cleanData = { ...data };
    fileFields.forEach(f => delete cleanData[f.name]);

    await onSubmit(cleanData, uploadedFiles);
  };

  const isProcessing = isSubmitting || isUploading;

  // Render without card wrapper when embedded in another card
  const formContent = (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {fields.map((field) => (
        <DynamicField
          key={field.id}
          field={field}
          error={errors[field.name]?.message as string | undefined}
          uploadProgress={field.type === 'file' ? uploadProgress[field.name] : undefined}
          onFileSelect={field.type === 'file' ? (file) => handleFileSelect(field.name, file) : undefined}
        />
      ))}

      <Button type="submit" className="w-full" disabled={isProcessing}>
        {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {isUploading ? 'Uploading files...' : submitLabel}
      </Button>
    </form>
  );

  // If no title/description, render without card wrapper (for embedding)
  if (!title && !description) {
    return <FormProvider {...methods}>{formContent}</FormProvider>;
  }

  return (
    <FormProvider {...methods}>
      <Card>
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{formContent}</CardContent>
      </Card>
    </FormProvider>
  );
}
