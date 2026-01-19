import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/hooks/useFormConfigs';
import { cn } from '@/lib/utils';

interface DynamicFieldProps {
  field: FormField;
  error?: string;
}

export function DynamicField({ field, error }: DynamicFieldProps) {
  const { register, setValue, watch } = useFormContext();
  const value = watch(field.name);

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
          <Input
            {...register(field.name)}
            type="file"
            accept={field.acceptedFileTypes?.join(',')}
            className={cn(error && "border-destructive")}
          />
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
