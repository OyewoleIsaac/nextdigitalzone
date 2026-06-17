# NDZ Marketplace — Full Platform Plan

## Overview
Transform from a simple submission marketplace into a full-service delivery platform with customer/artisan auth (Phone OTP), job lifecycle management, escrow payments via Paystack, and artisan performance analytics.

---

## Phase 1: Authentication & User Roles

### Database Changes
1. **Create `user_role` enum** — 'customer', 'artisan'

2. **Create `profiles` table** — stores user info for both customers and artisans
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users, unique, ON DELETE CASCADE)
   - `role` (user_role enum, NOT NULL)
   - `full_name` (text, NOT NULL)
   - `phone` (text, NOT NULL)
   - `avatar_url` (text, nullable)
   - `address` (text, nullable)
   - `latitude` (double precision, nullable)
   - `longitude` (double precision, nullable)
   - `is_verified` (boolean, default false)
   - `is_active` (boolean, default true)
   - `created_at`, `updated_at`

3. **Create `artisan_profiles` table** — extended artisan-specific data
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users, unique, ON DELETE CASCADE)
   - `category_id` (uuid, references categories, nullable)
   - `custom_category` (text, nullable)
   - `years_experience` (integer, nullable)
   - `bio` (text, nullable)
   - `latitude` (double precision, NOT NULL)
   - `longitude` (double precision, NOT NULL)
   - `service_radius_km` (integer, default 10)
   - `is_available` (boolean, default true)
   - `rating_avg` (numeric(3,2), default 0)
   - `total_jobs` (integer, default 0)
   - `completed_jobs` (integer, default 0)
   - `cancelled_jobs` (integer, default 0)
   - `paystack_subaccount_code` (text, nullable)
   - `created_at`, `updated_at`

4. **Auth configuration**: Phone OTP signup

### Frontend Changes
- Create `/signup` page with role selection (Customer vs Artisan)
- Customer signup: name, phone (OTP), address
- Artisan signup: name, phone (OTP), address with GPS pin on map, category, experience
- Create `/login` page with phone OTP
- Create customer dashboard `/dashboard`
- Create artisan dashboard `/artisan/dashboard`
- Add GPS map picker component using Leaflet (free, no API key)
- Update header with auth-aware navigation (show login/signup or dashboard link)

### RLS Policies
- Users can read/update their own profile
- Admins can read all profiles
- Artisan profiles: admin can read all, artisan can read own
- Profiles insert: authenticated users can insert their own

---

## Phase 2: Job Workflow & Lifecycle

### Database Changes
1. **Create `job_status` enum** — 'pending', 'assigned', 'quoted', 'inspection_requested', 'inspection_paid', 'price_agreed', 'payment_escrowed', 'in_progress', 'completed', 'confirmed', 'disputed', 'cancelled'

2. **Create `jobs` table**
   - `id` (uuid, PK)
   - `customer_id` (uuid, references auth.users)
   - `artisan_id` (uuid, references auth.users, nullable)
   - `category_id` (uuid, references categories)
   - `title` (text)
   - `description` (text)
   - `address` (text)
   - `latitude`, `longitude` (double precision)
   - `status` (job_status enum, default 'pending')
   - `requires_inspection` (boolean, default false)
   - `inspection_fee` (integer, nullable — in kobo)
   - `quoted_amount` (integer, nullable — in kobo)
   - `final_amount` (integer, nullable — in kobo)
   - `commission_percent` (integer, default 20)
   - `assigned_by` (text: 'system' or 'admin')
   - `admin_assigner_id` (uuid, nullable)
   - `photo_before` (text, nullable — storage path)
   - `photo_after` (text, nullable — storage path)
   - `guarantee_expires_at` (timestamptz, nullable — set to 30 days after confirmation)
   - `cancellation_reason` (text, nullable)
   - `created_at`, `updated_at`

3. **Create `job_status_history` table** — audit trail
   - `id` (uuid, PK)
   - `job_id` (uuid, references jobs)
   - `old_status` (job_status, nullable)
   - `new_status` (job_status)
   - `changed_by` (uuid, references auth.users)
   - `notes` (text, nullable)
   - `created_at`

4. **Create `job-photos` storage bucket** — for before/after photos

### Frontend Changes
- Customer: "Request Service" form (category, description, address with GPS, urgency toggle)
- Customer: View own jobs list with status tracker
- Customer: Accept/reject quote, pay inspection fee prompt, "Job Complete" button
- Admin: Job management dashboard:
  - Incoming requests (pending)
  - Nearby artisan recommendations (sorted by distance from job)
  - Manual assign button + system auto-recommendation
  - Job status tracker with full history
  - Filter by status
- Artisan dashboard: View assigned jobs, submit quote, mark inspection needed, upload before/after photos

### Edge Functions
- `find-nearby-artisans` — Haversine distance calc, returns sorted list by proximity
- `update-job-status` — state machine with validation (ensures valid transitions)

---

## Phase 3: Payments & Escrow (Paystack)

### Setup
- Add `PAYSTACK_SECRET_KEY` as a Cloud secret

### Database Changes
1. **Create `payment_type` enum** — 'inspection_fee', 'job_payment'
2. **Create `payment_status` enum** — 'pending', 'paid', 'held', 'released', 'refunded'

3. **Create `payments` table**
   - `id` (uuid, PK)
   - `job_id` (uuid, references jobs)
   - `customer_id` (uuid, references auth.users)
   - `artisan_id` (uuid, references auth.users)
   - `amount` (integer — total in kobo)
   - `commission_amount` (integer)
   - `artisan_amount` (integer)
   - `payment_type` (payment_type enum)
   - `status` (payment_status enum, default 'pending')
   - `paystack_reference` (text, unique)
   - `paystack_transfer_code` (text, nullable)
   - `paid_at` (timestamptz, nullable)
   - `released_at` (timestamptz, nullable)
   - `created_at`

### Edge Functions
- `initialize-payment` — creates Paystack transaction with split config (subaccount)
- `paystack-webhook` — verifies payment, updates payment/job status
- `release-payment` — triggered on "Job Complete" confirmation, transfers to artisan
- `create-artisan-subaccount` — creates Paystack subaccount when admin verifies artisan

### Frontend Changes
- Payment button integrates Paystack inline popup
- Escrow status indicator on job cards
- Admin: Payment overview — total revenue, commission earned, pending releases
- Customer: Payment history

---

## Phase 4: Ratings, Performance & Protection

### Database Changes
1. **Create `reviews` table**
   - `id` (uuid, PK)
   - `job_id` (uuid, references jobs, unique)
   - `customer_id` (uuid, references auth.users)
   - `artisan_id` (uuid, references auth.users)
   - `rating` (integer, CHECK 1-5)
   - `comment` (text, nullable)
   - `created_at`

2. **Create `violation_type` enum** — 'bypass_attempt', 'no_show', 'poor_quality', 'other'

3. **Create `artisan_violations` table**
   - `id` (uuid, PK)
   - `artisan_id` (uuid, references auth.users)
   - `violation_type` (violation_type enum)
   - `reported_by` (uuid, references auth.users)
   - `notes` (text, nullable)
   - `created_at`

### Frontend Changes
- Customer: Post-job rating & review (1-5 stars + optional comment)
- Admin: Artisan performance dashboard
  - Completion rate %, cancellation rate %, avg rating
  - Filter artisans by performance metrics
  - Individual artisan profile view with full history
  - Violation log with ability to report violations
  - Ban/derank controls (set `is_active = false`)
- 30-day guarantee badge displayed on jobs paid through platform
- Auto-flag artisans with >30% cancellation rate (visual indicator in admin)

### DB Functions/Triggers
- Trigger on `reviews` insert → update `artisan_profiles.rating_avg`
- Trigger on `jobs` status change → update `artisan_profiles.total_jobs`, `completed_jobs`, `cancelled_jobs`

---

## Phase 5: Polish & Edge Cases

- Dispute resolution workflow (customer can open dispute within guarantee period)
- SMS notifications for artisans without smartphones (via Termii or similar)
- Job timeout auto-cancellation (e.g., no artisan assigned within 24 hours)
- Customer cancellation policy (before escrow: free, after escrow: partial refund)
- Admin bulk operations (assign multiple, export)
- Export reports (CSV) for jobs, payments, artisan performance
- Mobile-responsive optimization for all new pages

---

## Technical Stack

| Concern | Solution |
|---------|----------|
| Auth | Phone OTP via Lovable Cloud |
| Maps | Leaflet.js (free, no API key) |
| Payments | Paystack (split payments + subaccounts) |
| File Storage | Lovable Cloud Storage (job-photos bucket) |
| Distance Calc | Haversine formula in edge function |
| State Machine | Edge function with validated transitions |

## Implementation Order
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
Each phase should be fully tested before moving to the next.
