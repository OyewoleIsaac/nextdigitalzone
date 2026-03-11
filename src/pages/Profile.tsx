import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useArtisanProfile } from '@/hooks/useProfile';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Save, Camera, MapPin, Lock, User, Phone, Eye, EyeOff, Award, Upload, FileText, CheckCircle, X, Image, Building2, AlertTriangle, CreditCard } from 'lucide-react';
import ndzLogo from '@/assets/ndz-logo.png';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CityAddressField } from '@/components/signup/CityAddressField';

interface UploadedCert {
  name: string;
  path: string;
  type: string;
}

const CERT_ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const CERT_MAX_MB = 10;

// Nigerian bank list (top banks)
const NIGERIAN_BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '023', name: 'Citibank Nigeria' },
  { code: '063', name: 'Diamond Bank' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '084', name: 'Enterprise Bank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank (FCMB)' },
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '014', name: 'MainStreet Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'Suntrust Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '305', name: 'Opay' },
  { code: '304', name: 'Palmpay' },
  { code: '090405', name: 'Moniepoint MFB' },
  { code: '50515', name: 'Kuda MFB' },
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const { data: artisanProfile, refetch: refetchArtisan } = useArtisanProfile();
  const { data: categories } = useCategories();

  // Default tab (support ?tab=bank deep link)
  const defaultTab = searchParams.get('tab') || 'profile';

  // Profile info state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [address, setAddress] = useState('');
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [savingProfile, setSavingProfile] = useState(false);

  // Bank details state (artisan only)
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Avatar
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Certifications (artisan only)
  const certInputRef = useRef<HTMLInputElement>(null);
  const [certFiles, setCertFiles] = useState<UploadedCert[]>([]);
  const [certUploading, setCertUploading] = useState(false);
  const [certProgress, setCertProgress] = useState(0);
  const [certDragOver, setCertDragOver] = useState(false);
  const [certSubmitting, setCertSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
      if (profile.latitude && profile.longitude) {
        setAddressCoords({ lat: profile.latitude, lng: profile.longitude });
      }
    }
  }, [profile]);

  useEffect(() => {
    if (artisanProfile) {
      setBio(artisanProfile.bio || '');
      setCategoryId(artisanProfile.category_id || '');
      setYearsExperience(artisanProfile.years_experience?.toString() || '');
      setBankCode((artisanProfile as any).bank_code || '');
      setAccountNumber((artisanProfile as any).account_number || '');
      setAccountName((artisanProfile as any).account_name || '');
    }
  }, [artisanProfile]);

  const handleAddressChange = (addr: string, coords: { lat: number; lng: number }) => {
    setAddress(addr);
    setAddressCoords(coords);
  };

  const handleSaveBank = async () => {
    if (!user) return;
    if (!bankCode || !accountNumber || !accountName) {
      toast.error('Please fill in all bank account fields');
      return;
    }
    if (accountNumber.length < 10) {
      toast.error('Please enter a valid 10-digit account number');
      return;
    }
    setSavingBank(true);
    try {
      const selectedBank = NIGERIAN_BANKS.find(b => b.code === bankCode);
      const { error } = await supabase
        .from('artisan_profiles')
        .update({
          bank_code: bankCode,
          bank_name: selectedBank?.name || '',
          account_number: accountNumber,
          account_name: accountName,
        } as any)
        .eq('user_id', user.id);
      if (error) throw error;
      refetchArtisan();
      toast.success('Bank account saved! You will receive payments to this account.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save bank details');
    } finally {
      setSavingBank(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone,
          address: address || null,
          latitude: addressCoords?.lat ?? null,
          longitude: addressCoords?.lng ?? null,
        })
        .eq('user_id', user.id);
      if (error) throw error;

      if (profile.role === 'artisan' && artisanProfile) {
        const { error: artisanError } = await supabase
          .from('artisan_profiles')
          .update({
            bio: bio || null,
            category_id: categoryId && categoryId !== 'other' ? categoryId : null,
            years_experience: yearsExperience ? parseInt(yearsExperience) : null,
            latitude: addressCoords?.lat ?? artisanProfile.latitude,
            longitude: addressCoords?.lng ?? artisanProfile.longitude,
          })
          .eq('user_id', user.id);
        if (artisanError) throw artisanError;
        refetchArtisan();
      }

      refetchProfile();
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSavingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      });
      if (signInError) { toast.error('Current password is incorrect'); return; }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    const maxMB = 2;
    if (file.size > maxMB * 1024 * 1024) { toast.error('Photo must be under 2MB'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a JPG, PNG or WEBP image');
      return;
    }
    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('verification-docs')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('verification-docs')
        .getPublicUrl(path);

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);
      if (error) throw error;
      refetchProfile();
      toast.success('Profile photo updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── Certificate upload handlers ──────────────────────────────
  const handleCertFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    for (const file of Array.from(files)) {
      if (!CERT_ACCEPTED.includes(file.type)) {
        toast.error(`${file.name}: Only JPG, PNG, WebP, and PDF files are accepted`);
        continue;
      }
      if (file.size > CERT_MAX_MB * 1024 * 1024) {
        toast.error(`${file.name}: File must be under ${CERT_MAX_MB}MB`);
        continue;
      }
      setCertUploading(true);
      setCertProgress(0);
      const ext = file.name.split('.').pop();
      const path = `certificates/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from('verification-docs')
        .upload(path, file, { upsert: false });
      if (error) {
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
      } else {
        setCertFiles(prev => [...prev, { name: file.name, path, type: file.type }]);
        setCertProgress(100);
        toast.success(`${file.name} uploaded`);
      }
      setCertUploading(false);
    }
  };

  const removeCert = (path: string) => {
    setCertFiles(prev => prev.filter(f => f.path !== path));
    supabase.storage.from('verification-docs').remove([path]).catch(() => {});
  };

  const handleSaveCertificates = async () => {
    if (!user) return;
    if (certFiles.length === 0) {
      toast.error('Please upload at least one certificate first');
      return;
    }
    setCertSubmitting(true);
    try {
      // Find the most recent artisan submission for this user
      const { data: submission } = await supabase
        .from('artisan_submissions')
        .select('id')
        .eq('email', user.email as string)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (submission) {
        await supabase.from('submission_attachments').insert(
          certFiles.map(f => ({
            submission_id: submission.id,
            submission_type: 'artisan',
            file_path: f.path,
            file_name: f.name,
            file_type: f.type,
          }))
        );
      }

      toast.success('Certificates saved! Our team will review your updated profile.');
      setCertFiles([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save certificates');
    } finally {
      setCertSubmitting(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const dashboardLink = profile?.role === 'artisan' ? '/artisan/dashboard' : '/dashboard';
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const isArtisan = profile?.role === 'artisan';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full glass border-b">
        <div className="section-container">
          <div className="flex h-16 items-center justify-between">
            <Link to={dashboardLink} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
            <Link to="/" className="flex items-center gap-2">
              <img src={ndzLogo} alt="NDZ Services 360" className="h-9 w-auto object-contain" />
            </Link>
          </div>
        </div>
      </header>

      <main className="section-container py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
            >
              {avatarUploading ? <Loader2 className="h-3.5 w-3.5 text-primary-foreground animate-spin" /> : <Camera className="h-3.5 w-3.5 text-primary-foreground" />}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile?.full_name}</h1>
            <p className="text-muted-foreground capitalize">{profile?.role} Account</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <Tabs defaultValue={defaultTab}>
          <TabsList className={`w-full mb-6 ${isArtisan ? 'grid-cols-5' : 'grid-cols-3'}`}>
            <TabsTrigger value="profile" className="flex-1"><User className="h-3.5 w-3.5 mr-1.5" />Profile</TabsTrigger>
            <TabsTrigger value="location" className="flex-1"><MapPin className="h-3.5 w-3.5 mr-1.5" />Location</TabsTrigger>
            {isArtisan && (
              <TabsTrigger value="bank" className="flex-1 relative">
                <Building2 className="h-3.5 w-3.5 mr-1.5" />Bank
                {!(artisanProfile as any)?.account_number && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </TabsTrigger>
            )}
            {isArtisan && (
              <TabsTrigger value="certificates" className="flex-1"><Award className="h-3.5 w-3.5 mr-1.5" />Certs</TabsTrigger>
            )}
            <TabsTrigger value="password" className="flex-1"><Lock className="h-3.5 w-3.5 mr-1.5" />Password</TabsTrigger>
          </TabsList>

          {/* Profile Info Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personal Information</CardTitle>
                <CardDescription>Update your name, phone number and other details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="p-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="p-name" className="pl-9" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="p-phone" type="tel" className="pl-9" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>

                {isArtisan && (
                  <>
                    <Separator />
                    <p className="text-sm font-medium">Artisan Details</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Service Category</Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>
                            {categories?.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="p-exp">Years of Experience</Label>
                        <Input id="p-exp" type="number" min="0" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p-bio">Bio</Label>
                      <Textarea id="p-bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell customers about yourself..." />
                    </div>
                  </>
                )}

                <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
                  {savingProfile ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Profile</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Location Tab */}
          <TabsContent value="location">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Location</CardTitle>
                <CardDescription>
                  {isArtisan
                    ? 'Your location helps match you with nearby customers. Keep it up to date.'
                    : 'Update your default address for service requests.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {address && (
                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-sm">
                    <p className="text-xs text-muted-foreground mb-0.5">Current address</p>
                    <p>{address}</p>
                  </div>
                )}
                <CityAddressField
                  value={address}
                  coords={addressCoords}
                  onChange={handleAddressChange}
                  role={profile?.role}
                />
                <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
                  {savingProfile ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Location</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank Details Tab (artisans only) */}
          {isArtisan && (
            <TabsContent value="bank">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Bank Account Details
                  </CardTitle>
                  <CardDescription>
                    Add your bank account so workmanship payments are transferred directly to you after job completion.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(artisanProfile as any)?.account_number ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
                      <CheckCircle className="h-5 w-5 text-success shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-success">Bank account linked</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(artisanProfile as any).bank_name} · ••••••{(artisanProfile as any).account_number?.slice(-4)} · {(artisanProfile as any).account_name}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Alert variant="destructive" className="bg-destructive/5 border-destructive/30">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        No bank account linked. You won't receive payment transfers until you add your bank details.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Select value={bankCode} onValueChange={setBankCode}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {NIGERIAN_BANKS.map((bank) => (
                          <SelectItem key={bank.code} value={bank.code}>{bank.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="acct-number">Account Number</Label>
                    <Input
                      id="acct-number"
                      type="text"
                      inputMode="numeric"
                      maxLength={11}
                      placeholder="0123456789"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                    />
                    <p className="text-xs text-muted-foreground">Enter your 10-digit NUBAN account number</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="acct-name">Account Name</Label>
                    <Input
                      id="acct-name"
                      type="text"
                      placeholder="e.g. John Adewale Okafor"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Enter the account name exactly as it appears on your bank account</p>
                  </div>

                  <Button onClick={handleSaveBank} disabled={savingBank} className="w-full">
                    {savingBank
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                      : <><Save className="h-4 w-4 mr-2" />{(artisanProfile as any)?.account_number ? 'Update Bank Account' : 'Save Bank Account'}</>}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Certificates Tab (artisans only) */}
          {isArtisan && (
            <TabsContent value="certificates">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    Skill Certificates
                  </CardTitle>
                  <CardDescription>
                    Upload certificates or proof of your trade skills. This is optional but helps build trust with customers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Drop zone */}
                  <div
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                      certDragOver
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    }`}
                    onClick={() => certInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setCertDragOver(true); }}
                    onDragLeave={() => setCertDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setCertDragOver(false); handleCertFiles(e.dataTransfer.files); }}
                  >
                    <input
                      ref={certInputRef}
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      className="hidden"
                      onChange={(e) => handleCertFiles(e.target.files)}
                    />
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">Click to upload or drag & drop</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF up to {CERT_MAX_MB}MB each</p>
                  </div>

                  {/* Upload progress */}
                  {certUploading && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Uploading...</span>
                        <span>{certProgress}%</span>
                      </div>
                      <Progress value={certProgress} className="h-1.5" />
                    </div>
                  )}

                  {/* Staged files */}
                  {certFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Ready to save ({certFiles.length})</p>
                      {certFiles.map((file) => (
                        <div key={file.path} className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
                          {file.type.startsWith('image/') ? (
                            <Image className="h-4 w-4 text-success shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-success shrink-0" />
                          )}
                          <span className="text-sm flex-1 truncate">{file.name}</span>
                          <CheckCircle className="h-4 w-4 text-success shrink-0" />
                          <button
                            type="button"
                            onClick={() => removeCert(file.path)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={handleSaveCertificates}
                    disabled={certSubmitting || certUploading || certFiles.length === 0}
                    className="w-full"
                  >
                    {certSubmitting
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                      : <><Save className="h-4 w-4 mr-2" />Save Certificates</>}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Password Tab */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="curr-pw">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="curr-pw"
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="new-pw">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-pw"
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conf-pw">Confirm New Password</Label>
                  <Input
                    id="conf-pw"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button onClick={handleSavePassword} disabled={savingPassword || !currentPassword || !newPassword} className="w-full">
                  {savingPassword ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</> : <><Lock className="h-4 w-4 mr-2" />Change Password</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProfilePage;
