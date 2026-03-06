import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCreateProfile, useCreateArtisanProfile } from '@/hooks/useProfile';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Hammer, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import type { UserRole } from '@/lib/types';
import { RoleSelect } from '@/components/signup/RoleSelect';
import { AddressField } from '@/components/signup/AddressField';

const baseSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const Signup = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const createProfile = useCreateProfile();
  const createArtisanProfile = useCreateArtisanProfile();
  const { data: categories } = useCategories();

  const [step, setStep] = useState<'role' | 'form'>('role');
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

  // Artisan-specific
  const [categoryId, setCategoryId] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setStep('form');
    setError('');
  };

  const handleAddressChange = (addr: string, coords?: { lat: number; lng: number }) => {
    setAddress(addr);
    if (coords) setAddressCoords(coords);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = baseSchema.safeParse({ full_name: fullName, email, phone, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (signUpError) { setError(signUpError.message); return; }
      if (!authData.user) { setError('Signup failed. Please try again.'); return; }

      const userId = authData.user.id;

      // 2. Create profile
      await createProfile.mutateAsync({
        user_id: userId,
        role: role!,
        full_name: fullName,
        phone,
        address: address || undefined,
        latitude: addressCoords?.lat,
        longitude: addressCoords?.lng,
      });

      // 3. Create submission record so admin can see & review this user
      if (role === 'artisan') {
        await supabase.from('artisan_submissions').insert({
          full_name: fullName,
          email,
          phone,
          location: address || null,
          category_id: categoryId && categoryId !== 'other' ? categoryId : null,
          custom_category: customCategory || null,
          years_experience: yearsExperience ? parseInt(yearsExperience) : null,
          status: 'pending',
          metadata: { user_id: userId, bio: bio || null },
        });

        // 4. Create artisan profile
        await createArtisanProfile.mutateAsync({
          user_id: userId,
          category_id: categoryId && categoryId !== 'other' ? categoryId : undefined,
          custom_category: customCategory || undefined,
          years_experience: yearsExperience ? parseInt(yearsExperience) : undefined,
          bio: bio || undefined,
          latitude: addressCoords?.lat ?? 9.0579,
          longitude: addressCoords?.lng ?? 7.4951,
        });
      } else {
        // Customer submission record
        await supabase.from('client_submissions').insert({
          full_name: fullName,
          email,
          phone,
          address: address || null,
          nin: 'PENDING', // Placeholder — admin will see status pending
          status: 'pending',
          metadata: { user_id: userId },
        });
      }

      toast.success('Account created! Please verify your email, then submit your documents.');
      navigate('/verify-account');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-lg shadow-xl animate-fade-in-up">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
              <Hammer className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-display">Create Account</CardTitle>
          <CardDescription>
            {step === 'role'
              ? 'Choose how you want to use NDZ Marketplace'
              : `Sign up as ${role === 'customer' ? 'a Customer' : 'an Artisan'}`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'role' ? (
            <RoleSelect onSelect={handleRoleSelect} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234..."
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {/* Address with geolocation + OSM verification */}
              <AddressField
                value={address}
                onChange={handleAddressChange}
                label="Your Address"
                required={role === 'artisan'}
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
                      <Input
                        id="experience"
                        type="number"
                        min="0"
                        value={yearsExperience}
                        onChange={(e) => setYearsExperience(e.target.value)}
                        placeholder="e.g. 5"
                      />
                    </div>
                  </div>

                  {categoryId === 'other' && (
                    <div className="space-y-2">
                      <Label htmlFor="customCategory">Specify your service</Label>
                      <Input
                        id="customCategory"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="e.g. Tiling"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="bio">Short Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell customers about your skills and experience..."
                      rows={3}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep('role')} className="flex-1">
                  Back
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                    : 'Create Account'}
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
