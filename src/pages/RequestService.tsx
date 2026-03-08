import { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCategories } from '@/hooks/useCategories';
import type { Category } from '@/lib/types';
import { useCreateJob } from '@/hooks/useJobs';
import { useInitializePayment } from '@/hooks/usePayments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Send, MapPin, CreditCard, Shield, Info, Home, Clock, Search, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { CityAddressField } from '@/components/signup/CityAddressField';

const LeafletMap = lazy(() => import('@/components/maps/LeafletMap'));

const RequestService = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile } = useProfile();
  const { data: categories } = useCategories();
  const createJob = useCreateJob();
  const initPayment = useInitializePayment();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [addressOption, setAddressOption] = useState<'registered' | 'new'>('registered');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(9.0579);
  const [lng, setLng] = useState(7.4951);
  const [addressVerified, setAddressVerified] = useState(false);
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [pendingJobTitle, setPendingJobTitle] = useState('');
  const [pendingJobAddress, setPendingJobAddress] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile && addressOption === 'registered') {
      setAddress(profile.address || '');
      if (profile.latitude) setLat(profile.latitude);
      if (profile.longitude) setLng(profile.longitude);
      setAddressVerified(!!(profile.address && profile.latitude));
    }
  }, [profile, addressOption]);

  const selectedCategory: Category | undefined = categories?.find(c => c.id === categoryId);
  const requiresPayment = selectedCategory?.requires_inspection || selectedCategory?.is_agency_job;
  const paymentAmount = selectedCategory?.requires_inspection
    ? selectedCategory.default_inspection_fee
    : selectedCategory?.is_agency_job
      ? selectedCategory.default_agency_fee
      : 0;
  const paymentLabel = selectedCategory?.requires_inspection ? 'Inspection Fee' : 'Agency Fee';
  const paymentType: 'inspection_fee' = 'inspection_fee'; // both map to inspection_fee for now

  const handleNewAddressChange = (addr: string, coords: { lat: number; lng: number }) => {
    setAddress(addr);
    setLat(coords.lat);
    setLng(coords.lng);
    setAddressVerified(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !categoryId || !title || !description || !address) return;
    if (!addressVerified) {
      toast.error('Please verify your address before submitting.');
      return;
    }

    try {
      const job = await createJob.mutateAsync({
        customer_id: user.id,
        category_id: categoryId,
        title,
        description,
        address,
        latitude: lat,
        longitude: lng,
        inspection_fee: requiresPayment ? paymentAmount : null,
        requires_inspection: selectedCategory?.requires_inspection ?? false,
      });

      const jobId = (job as any).id;
      setPendingJobId(jobId);
      setPendingJobTitle(title);
      setPendingJobAddress(address);

      if (requiresPayment && paymentAmount > 0) {
        setStep('payment');
      } else {
        // No fee required — submit directly, job stays draft until admin activates
        toast.success('Service request submitted! We will review and get back to you shortly.');
        navigate('/dashboard');
      }
    } catch {
      // error handled by hook
    }
  };

  const handlePayFee = async () => {
    if (!pendingJobId) return;
    try {
      const result = await initPayment.mutateAsync({
        job_id: pendingJobId,
        payment_type: paymentType,
        amount: paymentAmount,
      });
      window.location.href = result.authorization_url;
    } catch {
      // handled by hook
    }
  };

  const handlePayLater = () => {
    toast.info('Request saved as draft. Pay the fee from your dashboard to activate it.');
    navigate('/dashboard');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile && !profile.is_verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 mx-auto mb-4">
              <Shield className="h-7 w-7 text-warning" />
            </div>
            <h2 className="text-xl font-bold mb-2">Account Pending Verification</h2>
            <p className="text-muted-foreground mb-6">
              Your account is under review. You'll be able to request services once your identity is verified.
            </p>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="section-container py-8 max-w-2xl">
        <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Link>

        {step === 'form' && (
          <Card>
            <CardHeader>
              <CardTitle>Request a Service</CardTitle>
              <CardDescription>Describe what you need and we'll match you with a skilled artisan.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFormSubmit} className="space-y-5">
                {/* Category */}
                <div className="space-y-2">
                  <Label>Service Category <span className="text-destructive">*</span></Label>
                  <Select value={categoryId} onValueChange={setCategoryId} required>
                    <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Category type badge */}
                  {selectedCategory && (
                    <div className="flex gap-2 flex-wrap">
                      {selectedCategory.requires_inspection && (
                        <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                          <Search className="h-2.5 w-2.5 mr-1" />
                          Inspection fee: ₦{(selectedCategory.default_inspection_fee / 100).toLocaleString()} required
                        </Badge>
                      )}
                      {selectedCategory.is_agency_job && (
                        <Badge variant="outline" className="text-xs border-accent/40 text-accent">
                          <Briefcase className="h-2.5 w-2.5 mr-1" />
                          Agency fee: ₦{(selectedCategory.default_agency_fee / 100).toLocaleString()} required
                        </Badge>
                      )}
                      {!selectedCategory.requires_inspection && !selectedCategory.is_agency_job && (
                        <Badge variant="outline" className="text-xs">
                          No upfront fee required
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Short Title <span className="text-destructive">*</span></Label>
                  <Input id="title" placeholder="e.g. Leaky faucet in kitchen" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Describe the Problem <span className="text-destructive">*</span></Label>
                  <Textarea id="description" placeholder="Provide details about what you need done..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />
                </div>

                {/* Address */}
                <div className="space-y-3">
                  <Label>Service Location <span className="text-destructive">*</span></Label>
                  <RadioGroup
                    value={addressOption}
                    onValueChange={(v) => setAddressOption(v as 'registered' | 'new')}
                    className="space-y-2"
                  >
                    <div className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${addressOption === 'registered' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                      <RadioGroupItem value="registered" id="addr-registered" className="mt-0.5" />
                      <label htmlFor="addr-registered" className="cursor-pointer flex-1">
                        <div className="flex items-center gap-1.5 font-medium text-sm">
                          <Home className="h-3.5 w-3.5 text-primary" /> My Registered Address
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {profile?.address || 'No address saved — update in Profile'}
                        </p>
                      </label>
                    </div>
                    <div className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${addressOption === 'new' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                      <RadioGroupItem value="new" id="addr-new" className="mt-0.5" />
                      <label htmlFor="addr-new" className="cursor-pointer flex-1">
                        <div className="flex items-center gap-1.5 font-medium text-sm">
                          <MapPin className="h-3.5 w-3.5 text-primary" /> Use a Different Address
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Pick a different location for this service</p>
                      </label>
                    </div>
                  </RadioGroup>

                  {addressOption === 'new' && (
                    <div className="pt-1">
                      <CityAddressField value={address} coords={{ lat, lng }} onChange={handleNewAddressChange} role={null} />
                      <div className="mt-3">
                        <Label className="text-xs text-muted-foreground mb-2 block">Pin on Map (optional)</Label>
                        <Suspense fallback={<div className="h-[220px] rounded-lg border bg-muted/30 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
                          <div className="h-[220px] rounded-lg border overflow-hidden">
                            <LeafletMap position={{ lat, lng }} onLocationSelect={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} />
                          </div>
                        </Suspense>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fee notice based on category */}
                {requiresPayment && selectedCategory && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <CreditCard className="h-4 w-4 text-primary" />
                      ₦{(paymentAmount / 100).toLocaleString()} {paymentLabel} Required
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedCategory.requires_inspection
                        ? 'This service category requires a physical inspection. Pay the inspection fee to activate your request and schedule an artisan visit.'
                        : 'This is an agency/placement job. Pay the agency fee to submit your request for staff placement.'}
                    </p>
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Shield className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      Your request will only be sent to admin after payment is confirmed.
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createJob.isPending || !categoryId || !addressVerified}
                >
                  {createJob.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                  ) : requiresPayment ? (
                    <><Send className="h-4 w-4 mr-2" />Submit & Proceed to Payment</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" />Submit Request</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'payment' && selectedCategory && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Pay {paymentLabel} to Activate Request
              </CardTitle>
              <CardDescription>
                Your request has been saved. Pay the {paymentLabel.toLowerCase()} to send it to our team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">{pendingJobTitle}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium">{selectedCategory.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium text-right max-w-[200px] truncate">{pendingJobAddress}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-3 font-bold">
                  <span>{paymentLabel}</span>
                  <span className="text-primary">₦{(paymentAmount / 100).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                {selectedCategory.requires_inspection && (
                  <div className="flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>This fee covers the artisan's initial visit to assess and quote the job. No additional inspection fee will be charged.</span>
                  </div>
                )}
                {selectedCategory.is_agency_job && (
                  <div className="flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>This agency fee covers our staff placement service. A 30% commission of the agreed first salary will apply upon successful placement.</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Shield className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>If we cannot fulfil your request within 24 hours, you can open a dispute for a full refund.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                  <span>Choosing "Pay Later" saves your draft. Your request will <strong>not</strong> be sent to admin until payment is made.</span>
                </div>
              </div>

              <Button className="w-full" onClick={handlePayFee} disabled={initPayment.isPending}>
                {initPayment.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redirecting...</>
                ) : (
                  <><CreditCard className="h-4 w-4 mr-2" />Pay ₦{(paymentAmount / 100).toLocaleString()} Now</>
                )}
              </Button>
              <Button variant="outline" className="w-full text-muted-foreground" onClick={handlePayLater}>
                <Clock className="h-4 w-4 mr-2" />
                Save as Draft — Pay Later from Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RequestService;
