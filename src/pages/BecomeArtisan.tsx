import { useState } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { useCategories } from '@/hooks/useCategories';
import { useSubmitArtisanForm } from '@/hooks/useSubmissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle, Hammer, Loader2 } from 'lucide-react';
import { z } from 'zod';

const artisanFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Please enter a valid phone number').max(15),
  location: z.string().min(3, 'Please enter your location').max(200),
  category_id: z.string().optional(),
  custom_category: z.string().max(100).optional(),
  years_experience: z.number().min(0, 'Experience cannot be negative').max(50, 'Please enter a valid number'),
});

const BecomeArtisan = () => {
  const { data: categories } = useCategories();
  const submitForm = useSubmitArtisanForm();
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    category_id: '',
    custom_category: '',
    years_experience: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleCategoryChange = (value: string) => {
    if (value === 'other') {
      setShowCustomCategory(true);
      setFormData(prev => ({ ...prev, category_id: '' }));
    } else {
      setShowCustomCategory(false);
      setFormData(prev => ({ ...prev, category_id: value, custom_category: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const dataToValidate = {
      ...formData,
      years_experience: parseInt(formData.years_experience) || 0,
    };
    
    const result = artisanFormSchema.safeParse(dataToValidate);
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

    // Check that either category or custom category is provided
    if (!formData.category_id && !formData.custom_category) {
      setErrors(prev => ({ ...prev, category_id: 'Please select or enter a skill category' }));
      toast.error('Please select or enter a skill category');
      return;
    }

    try {
      await submitForm.mutateAsync({
        full_name: result.data.full_name,
        email: result.data.email,
        phone: result.data.phone,
        location: result.data.location,
        years_experience: result.data.years_experience,
        category_id: formData.category_id || undefined,
        custom_category: formData.custom_category || undefined,
      });
      setSubmitted(true);
      toast.success('Your registration has been submitted successfully!');
    } catch (error: unknown) {
      const err = error as Error;
      if (err.message?.includes('duplicate key')) {
        toast.error('This email has already been registered. Please use a different email.');
      } else {
        toast.error('Failed to submit your registration. Please try again.');
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
                Registration Submitted!
              </h1>
              <p className="text-muted-foreground mb-8 animate-fade-in-up stagger-2">
                Thank you for registering with ArtisanHub. Our team will review your 
                application and get in touch with you shortly.
              </p>
              <div className="bg-muted/50 rounded-xl p-6 animate-fade-in-up stagger-3">
                <h3 className="font-semibold mb-2">What happens next?</h3>
                <ul className="text-sm text-muted-foreground space-y-2 text-left">
                  <li>• Our team will verify your information</li>
                  <li>• We may contact you for additional details</li>
                  <li>• Once approved, you'll be added to our artisan network</li>
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
              <Hammer className="h-4 w-4" />
              Artisan Registration
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Join Our Artisan Network
            </h1>
            <p className="text-muted-foreground">
              Register as an artisan to get connected with clients looking for your skills. 
              Fill out the form below to get started.
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
                <CardTitle>Artisan Registration Form</CardTitle>
                <CardDescription>
                  All fields marked with * are required. Your information will be reviewed by our team.
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

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      placeholder="e.g., Lagos, Ikeja"
                      className={errors.location ? 'border-destructive' : ''}
                    />
                    {errors.location && (
                      <p className="text-sm text-destructive">{errors.location}</p>
                    )}
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category">Skill / Profession *</Label>
                    <Select onValueChange={handleCategoryChange}>
                      <SelectTrigger className={errors.category_id ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select your skill category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="other">Other (Specify)</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.category_id && (
                      <p className="text-sm text-destructive">{errors.category_id}</p>
                    )}
                  </div>

                  {/* Custom Category */}
                  {showCustomCategory && (
                    <div className="space-y-2 animate-fade-in">
                      <Label htmlFor="custom_category">Specify Your Skill *</Label>
                      <Input
                        id="custom_category"
                        value={formData.custom_category}
                        onChange={(e) => handleChange('custom_category', e.target.value)}
                        placeholder="Enter your skill/profession"
                        className={errors.custom_category ? 'border-destructive' : ''}
                      />
                      {errors.custom_category && (
                        <p className="text-sm text-destructive">{errors.custom_category}</p>
                      )}
                    </div>
                  )}

                  {/* Years of Experience */}
                  <div className="space-y-2">
                    <Label htmlFor="years_experience">Years of Experience *</Label>
                    <Input
                      id="years_experience"
                      type="number"
                      min="0"
                      max="50"
                      value={formData.years_experience}
                      onChange={(e) => handleChange('years_experience', e.target.value)}
                      placeholder="e.g., 5"
                      className={errors.years_experience ? 'border-destructive' : ''}
                    />
                    {errors.years_experience && (
                      <p className="text-sm text-destructive">{errors.years_experience}</p>
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
                      'Submit Registration'
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

export default BecomeArtisan;
