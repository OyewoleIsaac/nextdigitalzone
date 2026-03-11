import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Hammer, Loader2, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import type { UserRole } from '@/lib/types';
import { RoleSelect } from '@/components/signup/RoleSelect';
import { CityAddressField } from '@/components/signup/CityAddressField';
import { IdVerificationStep, type IdVerificationData } from '@/components/signup/IdVerificationStep';

const baseSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignupStep = 'role' | 'details' | 'id-verification';

const Signup = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: categories } = useCategories();

  const [step, setStep] = useState<SignupStep>('role');
  const [role, setRole] = useState<UserRole | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Base form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | undefined>();

  // ID Verification
  const [idData, setIdData] = useState<IdVerificationData | null>(null);

  // Artisan-specific
  const [categoryId, setCategoryId] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (!authLoading && user) navigate('/dashboard');
  }, [user, authLoading, navigate]);

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setStep('details');
    setError('');
  };

  const handleAddressChange = (addr: string, coords: { lat: number; lng: number }) => {
    setAddress(addr);
    setAddressCoords(coords);
  };

  // Step 1 → Step 2 (details → id-verification)
  const handleProceedToId = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = baseSchema.safeParse({ full_name: fullName, email, phone, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }
    if (!address || !addressCoords) {
      setError('Please verify your address by selecting your city or using GPS before proceeding.');
      return;
    }
    setStep('id-verification');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!idData) {
      setError('Please complete the ID verification section before creating your account.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Sign up
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (signUpError) { setError(signUpError.message); return; }
      if (!authData.user) { setError('Signup failed. Please try again.'); return; }
      const userId = authData.user.id;

      // 2. Create profile (insert directly, anon policy allows this pre-email-verification)
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: userId,
        role: role!,
        full_name: fullName,
        phone,
        address: address || null,
        latitude: addressCoords?.lat ?? null,
        longitude: addressCoords?.lng ?? null,
        is_verified: false,
        is_active: true,
      });
      if (profileError) throw new Error(`Profile creation failed: ${profileError.message}`);

      // 3. Create submission record with ID data
      const idMeta = {
        user_id: userId,
        id_type: idData.idType,
        id_number: idData.idNumber,
        id_image_path: idData.idImagePath,
      };

      // Pre-generate submission ID so we can link attachments without needing a SELECT
      const artisanSubmissionId = crypto.randomUUID();

      if (role === 'artisan') {
        const { error: submissionError } = await supabase.from('artisan_submissions').insert({
          id: artisanSubmissionId,
          full_name: fullName,
          email,
          phone,
          location: address || null,
          category_id: categoryId && categoryId !== 'other' ? categoryId : null,
          custom_category: customCategory || null,
          years_experience: yearsExperience ? parseInt(yearsExperience) : null,
          status: 'pending',
          metadata: { ...idMeta, bio: bio || null },
        });
        if (submissionError) throw new Error(`Submission failed: ${submissionError.message}`);

        // Save ID image as attachment so admin can view it
        if (idData.idImagePath) {
          await supabase.from('submission_attachments').insert({
            submission_id: artisanSubmissionId,
            submission_type: 'artisan',
            file_path: idData.idImagePath,
            file_name: idData.idImageName || 'ID Document',
            file_type: idData.idImagePath.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
          });
        }

        const { error: artisanProfileError } = await supabase.from('artisan_profiles').insert({
          user_id: userId,
          category_id: categoryId && categoryId !== 'other' ? categoryId : null,
          custom_category: customCategory || null,
          years_experience: yearsExperience ? parseInt(yearsExperience) : null,
          bio: bio || null,
          latitude: addressCoords?.lat ?? 9.0579,
          longitude: addressCoords?.lng ?? 7.4951,
        });
        if (artisanProfileError) console.warn('Artisan profile insert warning:', artisanProfileError.message);
      } else {
        // Pre-generate ID so we can link the attachment without needing a SELECT after insert
        const clientSubmissionId = crypto.randomUUID();
        const { error: submissionError } = await supabase.from('client_submissions').insert({
          id: clientSubmissionId,
          full_name: fullName,
          email,
          phone,
          address: address || null,
          nin: idData.idNumber,
          status: 'pending',
          metadata: idMeta,
        });
        if (submissionError) throw new Error(`Submission failed: ${submissionError.message}`);

        // Save ID image as attachment so admin can view it
        if (idData.idImagePath) {
          await supabase.from('submission_attachments').insert({
            submission_id: clientSubmissionId,
            submission_type: 'client',
            file_path: idData.idImagePath,
            file_name: idData.idImageName || 'ID Document',
            file_type: 'image/jpeg',
          });
        }
      }

      toast.success('Account created! Please verify your email to continue.');
      // Only artisans go to certificate upload page; customers go straight to dashboard
      if (role === 'artisan') {
        // Store submission ID so VerifyAccount can link the certificate attachment
        localStorage.setItem('pending_artisan_submission_id', artisanSubmissionId);
        navigate('/verify-account');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stepLabels: Record<SignupStep, string> = {
    role: 'Choose Role',
    details: 'Your Details',
    'id-verification': 'Verify Identity',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-lg shadow-xl animate-fade-in-up">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img src={ndzLogo} alt="NDZ Services 360" className="h-14 w-auto object-contain" />
          </div>
          <CardTitle className="text-2xl font-display">Create Account</CardTitle>
          <CardDescription>
            {step === 'role' && 'Choose how you want to use NDZ Marketplace'}
            {step === 'details' && `Sign up as ${role === 'customer' ? 'a Customer' : 'an Artisan'}`}
            {step === 'id-verification' && 'Identity verification (required)'}
          </CardDescription>

          {/* Step indicator */}
          {step !== 'role' && (
            <div className="flex items-center justify-center gap-2 mt-3">
              {(['details', 'id-verification'] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step === s ? 'bg-primary text-primary-foreground' :
                    (step === 'id-verification' && i === 0) ? 'bg-success text-success-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {step === 'id-verification' && i === 0 ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs ${step === s ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {stepLabels[s]}
                  </span>
                  {i < 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                </div>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {step === 'role' && <RoleSelect onSelect={handleRoleSelect} />}

          {step === 'details' && (
            <form onSubmit={handleProceedToId} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>

              {/* City/Location picker */}
              <CityAddressField
                value={address}
                coords={addressCoords}
                onChange={handleAddressChange}
                role={role}
              />

              {/* Artisan-specific fields */}
              {role === 'artisan' && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Service Category</Label>
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="experience">Years of Experience</Label>
                      <Input id="experience" type="number" min="0" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} placeholder="e.g. 5" />
                    </div>
                  </div>
                  {categoryId === 'other' && (
                    <div className="space-y-2">
                      <Label htmlFor="customCategory">Specify your service</Label>
                      <Input id="customCategory" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="e.g. Tiling" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="bio">Short Bio</Label>
                    <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell customers about your skills..." rows={3} />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep('role')} className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button type="submit" className="flex-1">
                  Next: Verify ID <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
              </p>
            </form>
          )}

          {step === 'id-verification' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <IdVerificationStep value={idData} onChange={setIdData} />

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep('details')} className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button type="submit" disabled={isSubmitting || !idData} className="flex-1">
                  {isSubmitting
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                    : 'Create Account'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
