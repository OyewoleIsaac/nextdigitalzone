import { useState, useEffect } from 'react';
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
import { LocationPicker } from '@/components/maps/LocationPicker';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

const RequestService = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile } = useProfile();
  const { data: categories } = useCategories();
  const createJob = useCreateJob();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [address, setAddress] = useState(profile?.address || '');
  const [lat, setLat] = useState(profile?.latitude || 9.06);
  const [lng, setLng] = useState(profile?.longitude || 7.49);

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
  };

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
                <Select value={categoryId} onValueChange={setCategoryId}>
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
                  placeholder="Your address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Pin Your Location on Map</Label>
                <LocationPicker
                  value={{ lat, lng }}
                  onChange={(loc) => {
                    setLat(loc.lat);
                    setLng(loc.lng);
                  }}
                />
              </div>

              <Button type="submit" className="w-full" disabled={createJob.isPending}>
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
