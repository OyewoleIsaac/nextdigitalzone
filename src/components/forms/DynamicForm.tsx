import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { DynamicField } from './DynamicField';
import { buildValidationSchema, getDefaultValues } from './formValidation';
import { FormField } from '@/hooks/useFormConfigs';

interface DynamicFormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  title?: string;
  description?: string;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function DynamicForm({
  fields,
  onSubmit,
  title,
  description,
  submitLabel = 'Submit',
  isSubmitting = false,
}: DynamicFormProps) {
  const schema = buildValidationSchema(fields);
  const defaultValues = getDefaultValues(fields);

  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { errors },
  } = methods;

  const onFormSubmit = async (data: Record<string, unknown>) => {
    await onSubmit(data);
  };

  return (
    <FormProvider {...methods}>
      <Card>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            {fields.map((field) => (
              <DynamicField
                key={field.id}
                field={field}
                error={errors[field.name]?.message as string | undefined}
              />
            ))}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {submitLabel}
            </Button>
          </form>
        </CardContent>
      </Card>
    </FormProvider>
  );
}
