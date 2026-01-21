import { useFormContext } from 'react-hook-form';
import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/hooks/useFormConfigs';
import { cn } from '@/lib/utils';
import { Upload, X, FileIcon } from 'lucide-react';

interface DynamicFieldProps {
  field: FormField;
  error?: string;
  uploadProgress?: number;
  onFileSelect?: (file: File | null) => void;
}

export function DynamicField({ field, error, uploadProgress, onFileSelect }: DynamicFieldProps) {
  const { register, setValue, watch } = useFormContext();
  const value = watch(field.name);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setValue(field.name, file);
    onFileSelect?.(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setValue(field.name, null);
    onFileSelect?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <Input
            {...register(field.name)}
            type={field.type === 'phone' ? 'tel' : field.type}
            placeholder={field.placeholder}
            className={cn(error && "border-destructive")}
          />
        );

      case 'number':
        return (
          <Input
            {...register(field.name, { valueAsNumber: true })}
            type="number"
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className={cn(error && "border-destructive")}
          />
        );

      case 'textarea':
        return (
          <Textarea
            {...register(field.name)}
            placeholder={field.placeholder}
            rows={4}
            className={cn(error && "border-destructive")}
          />
        );

      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(val) => setValue(field.name, val)}
          >
            <SelectTrigger className={cn(error && "border-destructive")}>
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={value || false}
              onCheckedChange={(checked) => setValue(field.name, checked)}
            />
            <label
              htmlFor={field.name}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.placeholder || field.label}
            </label>
          </div>
        );

      case 'file':
        return (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={field.acceptedFileTypes?.join(',')}
              onChange={handleFileChange}
              className="hidden"
              id={`file-${field.name}`}
            />
            
            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  "hover:border-primary hover:bg-primary/5",
                  error ? "border-destructive" : "border-muted-foreground/25"
                )}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {field.acceptedFileTypes?.length 
                    ? `Accepted: ${field.acceptedFileTypes.join(', ')}`
                    : 'Any file type'
                  }
                  {field.maxFileSize && ` (Max: ${field.maxFileSize}MB)`}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileIcon className="h-8 w-8 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearFile}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {uploadProgress !== undefined && uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-3">
                    <Progress value={uploadProgress} className="h-1" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      default:
        return (
          <Input
            {...register(field.name)}
            placeholder={field.placeholder}
            className={cn(error && "border-destructive")}
          />
        );
    }
  };

  if (field.type === 'checkbox') {
    return (
      <div className="space-y-2">
        {renderField()}
        {field.helperText && (
          <p className="text-xs text-muted-foreground">{field.helperText}</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderField()}
      {field.helperText && (
        <p className="text-xs text-muted-foreground">{field.helperText}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
