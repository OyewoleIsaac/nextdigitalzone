import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { useCategories } from '@/hooks/useCategories';
import { useSubmitClientForm } from '@/hooks/useSubmissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle, Loader2, Search, Shield } from 'lucide-react';
import { z } from 'zod';

const clientFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Please enter a valid phone number').max(15),
  address: z.string().min(10, 'Please provide your full address').max(500),
  nin: z.string().length(11, 'NIN must be exactly 11 digits').regex(/^\d+$/, 'NIN must contain only numbers'),
  service_description: z.string().min(20, 'Please describe the service you need in detail').max(1000),
  category_id: z.string().optional(),
});

const FindArtisan = () => {
  const [searchParams] = useSearchParams();
  const preselectedCategory = searchParams.get('category');
  const { data: categories } = useCategories();
  const submitForm = useSubmitClientForm();
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    nin: '',
    service_description: '',
    category_id: categories?.find(c => c.slug === preselectedCategory)?.id || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const result = clientFormSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      toast.error('Please fix the form errors');
      return;
    }

    try {
      await submitForm.mutateAsync({
        ...formData,
        category_id: formData.category_id || undefined,
      });
      setSubmitted(true);
      toast.success('Your request has been submitted successfully!');
    } catch (error: unknown) {
      const err = error as Error;
      if (err.message?.includes('duplicate key')) {
        toast.error('This email has already been used. Please use a different email or wait for your previous request to be processed.');
      } else {
        toast.error('Failed to submit your request. Please try again.');
      }
    }
  };

  if (submitted) {
    return (
      <PublicLayout>
        <div className="py-20 min-h-[70vh] flex items-center">
          <div className="section-container">
            <div className="max-w-xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 text-success mb-6 animate-fade-in-up">
                <CheckCircle className="h-10 w-10" />
              </div>
              <h1 className="text-3xl font-display font-bold mb-4 animate-fade-in-up stagger-1">
                Request Submitted!
              </h1>
              <p className="text-muted-foreground mb-8 animate-fade-in-up stagger-2">
                Thank you for your submission. Our team will review your request and 
                get in touch with you shortly via email or phone.
              </p>
              <div className="bg-muted/50 rounded-xl p-6 animate-fade-in-up stagger-3">
                <h3 className="font-semibold mb-2">What happens next?</h3>
                <ul className="text-sm text-muted-foreground space-y-2 text-left">
                  <li>• Our team will verify your information</li>
                  <li>• We'll match you with a suitable artisan</li>
                  <li>• You'll receive a confirmation via email</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      {/* Header */}
      <section className="py-12 bg-muted/50">
        <div className="section-container">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Search className="h-4 w-4" />
              Client Request Form
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Find Your Perfect Artisan
            </h1>
            <p className="text-muted-foreground">
              Complete the verification form below to request an artisan. 
              We'll verify your details and connect you with a trusted professional.
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-12">
        <div className="section-container">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Client Verification Form
                </CardTitle>
                <CardDescription>
                  All fields marked with * are required. Your information is kept secure and confidential.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => handleChange('full_name', e.target.value)}
                      placeholder="Enter your full name"
                      className={errors.full_name ? 'border-destructive' : ''}
                    />
                    {errors.full_name && (
                      <p className="text-sm text-destructive">{errors.full_name}</p>
                    )}
                  </div>

                  {/* Email & Phone */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="Enter your email"
                        className={errors.email ? 'border-destructive' : ''}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="Enter your phone number"
                        className={errors.phone ? 'border-destructive' : ''}
                      />
                      {errors.phone && (
                        <p className="text-sm text-destructive">{errors.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <Label htmlFor="address">Residential Address *</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="Enter your full address"
                      rows={2}
                      className={errors.address ? 'border-destructive' : ''}
                    />
                    {errors.address && (
                      <p className="text-sm text-destructive">{errors.address}</p>
                    )}
                  </div>

                  {/* NIN */}
                  <div className="space-y-2">
                    <Label htmlFor="nin">NIN (National Identification Number) *</Label>
                    <Input
                      id="nin"
                      value={formData.nin}
                      onChange={(e) => handleChange('nin', e.target.value)}
                      placeholder="Enter your 11-digit NIN"
                      maxLength={11}
                      className={errors.nin ? 'border-destructive' : ''}
                    />
                    {errors.nin && (
                      <p className="text-sm text-destructive">{errors.nin}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Your NIN is kept confidential and used only for verification.
                    </p>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category">Service Category</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => handleChange('category_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Service Description */}
                  <div className="space-y-2">
                    <Label htmlFor="service_description">Service Description *</Label>
                    <Textarea
                      id="service_description"
                      value={formData.service_description}
                      onChange={(e) => handleChange('service_description', e.target.value)}
                      placeholder="Describe the service you need in detail..."
                      rows={4}
                      className={errors.service_description ? 'border-destructive' : ''}
                    />
                    {errors.service_description && (
                      <p className="text-sm text-destructive">{errors.service_description}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={submitForm.isPending}
                  >
                    {submitForm.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default FindArtisan;
