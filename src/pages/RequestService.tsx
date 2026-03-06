import { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCategories } from '@/hooks/useCategories';
import { useCreateJob } from '@/hooks/useJobs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Send, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

// Lazy-load the map to avoid Leaflet DOM crash on initial render
const LocationPicker = lazy(() =>
  import('@/components/maps/LocationPicker').then((m) => ({ default: m.LocationPicker }))
);

const RequestService = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile } = useProfile();
  const { data: categories } = useCategories();
  const createJob = useCreateJob();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(9.0579);
  const [lng, setLng] = useState(7.4951);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile?.address) setAddress(profile.address);
    if (profile?.latitude) setLat(profile.latitude);
    if (profile?.longitude) setLng(profile.longitude);
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !categoryId || !title || !description || !address) return;

    try {
      await createJob.mutateAsync({
        customer_id: user.id,
        category_id: categoryId,
        title,
        description,
        address,
        latitude: lat,
        longitude: lng,
      });
      navigate('/dashboard');
    } catch (err) {
      // error handled by hook toast
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
    <div className="min-h-screen bg-background">
      <div className="section-container py-8 max-w-2xl">
        <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Request a Service</CardTitle>
            <CardDescription>Describe the service you need and we'll match you with a skilled artisan nearby.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="category">Service Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Short Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Leaky faucet in kitchen"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Describe the Problem</Label>
                <Textarea
                  id="description"
                  placeholder="Provide details about what you need done..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Service Address</Label>
                <Input
                  id="address"
                  placeholder="Your full address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              {/* Optional map picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Pin Location on Map <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMap((v) => !v)}
                  >
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                    {showMap ? 'Hide Map' : 'Show Map'}
                  </Button>
                </div>
                {showMap && (
                  <Suspense fallback={
                    <div className="h-[250px] rounded-lg border border-border bg-muted/30 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  }>
                    <LocationPicker
                      value={{ lat, lng }}
                      onChange={(loc) => {
                        setLat(loc.lat);
                        setLng(loc.lng);
                      }}
                    />
                  </Suspense>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={createJob.isPending || !categoryId}>
                {createJob.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Submit Request</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RequestService;
