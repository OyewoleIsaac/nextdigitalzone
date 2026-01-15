-- Admin users table for role management
CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Categories for artisan skills
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Form configurations for dynamic forms
CREATE TABLE public.form_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL CHECK (target_type IN ('client', 'artisan')),
    field_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (target_type)
);

ALTER TABLE public.form_configs ENABLE ROW LEVEL SECURITY;

-- Create status enum
CREATE TYPE public.submission_status AS ENUM ('pending', 'confirmed', 'rejected');

-- Client submissions
CREATE TABLE public.client_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    address TEXT,
    nin TEXT NOT NULL,
    service_description TEXT,
    category_id UUID REFERENCES public.categories(id),
    status public.submission_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_submissions ENABLE ROW LEVEL SECURITY;

-- Artisan submissions
CREATE TABLE public.artisan_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    location TEXT,
    category_id UUID REFERENCES public.categories(id),
    custom_category TEXT,
    years_experience INTEGER,
    status public.submission_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.artisan_submissions ENABLE ROW LEVEL SECURITY;

-- Submission attachments for file uploads
CREATE TABLE public.submission_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_type TEXT NOT NULL CHECK (submission_type IN ('client', 'artisan')),
    submission_id UUID NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.submission_attachments ENABLE ROW LEVEL SECURITY;

-- Admin action logs
CREATE TABLE public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid()
    )
$$;

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_form_configs_updated_at
    BEFORE UPDATE ON public.form_configs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_submissions_updated_at
    BEFORE UPDATE ON public.client_submissions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_artisan_submissions_updated_at
    BEFORE UPDATE ON public.artisan_submissions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Admin users: only admins can view
CREATE POLICY "Admins can view admin_users"
    ON public.admin_users FOR SELECT
    TO authenticated
    USING (public.is_admin() OR user_id = auth.uid());

-- Categories: public read, admin write
CREATE POLICY "Anyone can view active categories"
    ON public.categories FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can do all on categories"
    ON public.categories FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Form configs: public read, admin write
CREATE POLICY "Anyone can view form configs"
    ON public.form_configs FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage form configs"
    ON public.form_configs FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Client submissions: anon insert (pending only), admin full access
CREATE POLICY "Anyone can submit client forms"
    ON public.client_submissions FOR INSERT
    WITH CHECK (status = 'pending');

CREATE POLICY "Admins can view client submissions"
    ON public.client_submissions FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can update client submissions"
    ON public.client_submissions FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete client submissions"
    ON public.client_submissions FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Artisan submissions: anon insert (pending only), admin full access
CREATE POLICY "Anyone can submit artisan forms"
    ON public.artisan_submissions FOR INSERT
    WITH CHECK (status = 'pending');

CREATE POLICY "Admins can view artisan submissions"
    ON public.artisan_submissions FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can update artisan submissions"
    ON public.artisan_submissions FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete artisan submissions"
    ON public.artisan_submissions FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Submission attachments: anon insert, admin read/delete
CREATE POLICY "Anyone can upload attachments"
    ON public.submission_attachments FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can view attachments"
    ON public.submission_attachments FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can delete attachments"
    ON public.submission_attachments FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Admin logs: admin only
CREATE POLICY "Admins can view logs"
    ON public.admin_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can insert logs"
    ON public.admin_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-docs', 'verification-docs', false);

-- Storage policies
CREATE POLICY "Anyone can upload verification docs"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'verification-docs');

CREATE POLICY "Admins can view verification docs"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'verification-docs' AND public.is_admin());

CREATE POLICY "Admins can delete verification docs"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'verification-docs' AND public.is_admin());

-- Insert default form configurations
INSERT INTO public.form_configs (target_type, field_schema) VALUES
('client', '[
    {"name": "full_name", "label": "Full Name", "type": "text", "required": true, "placeholder": "Enter your full name"},
    {"name": "email", "label": "Email Address", "type": "email", "required": true, "placeholder": "Enter your email"},
    {"name": "phone", "label": "Phone Number", "type": "phone", "required": true, "placeholder": "Enter your phone number"},
    {"name": "address", "label": "Residential Address", "type": "textarea", "required": true, "placeholder": "Enter your address"},
    {"name": "nin", "label": "NIN (National Identification Number)", "type": "text", "required": true, "placeholder": "Enter your 11-digit NIN"},
    {"name": "service_description", "label": "Service Description", "type": "textarea", "required": true, "placeholder": "Describe the service you need"},
    {"name": "document", "label": "Supporting Document (Optional)", "type": "file", "required": false}
]'::jsonb),
('artisan', '[
    {"name": "full_name", "label": "Full Name", "type": "text", "required": true, "placeholder": "Enter your full name"},
    {"name": "email", "label": "Email Address", "type": "email", "required": true, "placeholder": "Enter your email"},
    {"name": "phone", "label": "Phone Number", "type": "phone", "required": true, "placeholder": "Enter your phone number"},
    {"name": "location", "label": "Location", "type": "text", "required": true, "placeholder": "Enter your location"},
    {"name": "years_experience", "label": "Years of Experience", "type": "number", "required": true, "placeholder": "Enter years of experience"},
    {"name": "portfolio", "label": "Portfolio/Work Samples (Optional)", "type": "file", "required": false}
]'::jsonb);

-- Insert some default categories
INSERT INTO public.categories (name, slug, description) VALUES
('Plumbing', 'plumbing', 'Plumbing and pipe installation services'),
('Electrical', 'electrical', 'Electrical installation and repairs'),
('Carpentry', 'carpentry', 'Woodwork and furniture making'),
('Painting', 'painting', 'Interior and exterior painting'),
('Tiling', 'tiling', 'Floor and wall tiling'),
('Masonry', 'masonry', 'Brick and block laying'),
('Welding', 'welding', 'Metal fabrication and welding'),
('AC Repair', 'ac-repair', 'Air conditioning installation and repair'),
('Cleaning', 'cleaning', 'Professional cleaning services'),
('Tailoring', 'tailoring', 'Clothing design and alterations');