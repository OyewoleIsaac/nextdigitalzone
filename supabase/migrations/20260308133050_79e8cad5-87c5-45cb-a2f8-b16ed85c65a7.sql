-- Add 'draft' status to job_status enum (for jobs where booking fee hasn't been paid yet)
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'pending';