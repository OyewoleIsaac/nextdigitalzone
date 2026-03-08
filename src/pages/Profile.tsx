import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
import { Hammer, Loader2, ArrowLeft, Save, Camera, MapPin, Lock, User, Phone, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CityAddressField } from '@/components/signup/CityAddressField';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const { data: artisanProfile, refetch: refetchArtisan } = useArtisanProfile();
  const { data: categories } = useCategories();

  // Profile info state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [address, setAddress] = useState('');
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Avatar
  const [avatarUploading, setAvatarUploading] = useState(false);

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
    }
  }, [artisanProfile]);

  const handleAddressChange = (addr: string, coords: { lat: number; lng: number }) => {
    setAddress(addr);
    setAddressCoords(coords);
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
          updated_at: new Date().toISOString(),
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
            updated_at: new Date().toISOString(),
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
      // Verify current password
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

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const dashboardLink = profile?.role === 'artisan' ? '/artisan/dashboard' : '/dashboard';
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full glass border-b">
        <div className="section-container">
          <div className="flex h-16 items-center justify-between">
            <Link to={dashboardLink} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md">
                <Hammer className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold hidden sm:block">NDZ<span className="text-primary">Marketplace</span></span>
            </Link>
          </div>
        </div>
      </header>

      <main className="section-container py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          {/* Avatar */}
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

        <Tabs defaultValue="profile">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="profile" className="flex-1"><User className="h-3.5 w-3.5 mr-1.5" />Profile Info</TabsTrigger>
            <TabsTrigger value="location" className="flex-1"><MapPin className="h-3.5 w-3.5 mr-1.5" />Location</TabsTrigger>
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

                {profile?.role === 'artisan' && (
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
                  {profile?.role === 'artisan'
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
