import { z } from 'zod';
import { FormField } from '@/hooks/useFormConfigs';

export function buildValidationSchema(fields: FormField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case 'email':
        fieldSchema = z.string().email('Please enter a valid email address');
        break;

      case 'number':
        fieldSchema = z.coerce.number();
        if (field.validation?.min !== undefined) {
          fieldSchema = (fieldSchema as z.ZodNumber).min(
            field.validation.min,
            `Must be at least ${field.validation.min}`
          );
        }
        if (field.validation?.max !== undefined) {
          fieldSchema = (fieldSchema as z.ZodNumber).max(
            field.validation.max,
            `Must be at most ${field.validation.max}`
          );
        }
        break;

      case 'checkbox':
        fieldSchema = z.boolean();
        if (field.required) {
          fieldSchema = fieldSchema.refine((val) => val === true, {
            message: 'This field is required',
          });
        }
        break;

      case 'file':
        // File inputs are handled separately
        fieldSchema = z.any();
        break;

      default:
        fieldSchema = z.string();
        
        if (field.validation?.minLength) {
          fieldSchema = (fieldSchema as z.ZodString).min(
            field.validation.minLength,
            `Must be at least ${field.validation.minLength} characters`
          );
        }
        if (field.validation?.maxLength) {
          fieldSchema = (fieldSchema as z.ZodString).max(
            field.validation.maxLength,
            `Must be at most ${field.validation.maxLength} characters`
          );
        }
        if (field.validation?.pattern) {
          fieldSchema = (fieldSchema as z.ZodString).regex(
            new RegExp(field.validation.pattern),
            'Invalid format'
          );
        }
        break;
    }

    // Make optional if not required
    if (!field.required && field.type !== 'checkbox') {
      fieldSchema = fieldSchema.optional().or(z.literal(''));
    } else if (field.required && field.type !== 'checkbox' && field.type !== 'number') {
      // Add non-empty check for required string fields
      fieldSchema = (fieldSchema as z.ZodString).min(1, 'This field is required');
    }

    shape[field.name] = fieldSchema;
  }

  return z.object(shape);
}

export function getDefaultValues(fields: FormField[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const field of fields) {
    switch (field.type) {
      case 'checkbox':
        defaults[field.name] = false;
        break;
      case 'number':
        defaults[field.name] = '';
        break;
      default:
        defaults[field.name] = '';
        break;
    }
  }

  return defaults;
}
