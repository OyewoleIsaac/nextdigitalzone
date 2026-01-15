export type SubmissionStatus = 'pending' | 'confirmed' | 'rejected';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'dropdown' | 'checkbox' | 'file';
  required: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
}

export interface FormConfig {
  id: string;
  target_type: 'client' | 'artisan';
  field_schema: FormField[];
  created_at: string;
  updated_at: string;
}

export interface ClientSubmission {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  nin: string;
  service_description: string | null;
  category_id: string | null;
  status: SubmissionStatus;
  rejection_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface ArtisanSubmission {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  category_id: string | null;
  custom_category: string | null;
  years_experience: number | null;
  status: SubmissionStatus;
  rejection_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface SubmissionAttachment {
  id: string;
  submission_type: 'client' | 'artisan';
  submission_id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  created_at: string;
}

export interface AdminLog {
  id: string;
  admin_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}
