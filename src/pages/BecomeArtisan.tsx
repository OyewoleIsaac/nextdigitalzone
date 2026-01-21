import { useState } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { useCategories } from '@/hooks/useCategories';
import { useSubmitArtisanForm } from '@/hooks/useSubmissions';
import { useFormConfig } from '@/hooks/useFormConfigs';
import { DynamicForm } from '@/components/forms/DynamicForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { CheckCircle, Hammer } from 'lucide-react';

const BecomeArtisan = () => {
  const { data: categories } = useCategories();
  const { data: formConfig, isLoading: isConfigLoading } = useFormConfig('artisan');
  const submitForm = useSubmitArtisanForm();
  
  const [categoryId, setCategoryId] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleCategoryChange = (value: string) => {
    if (value === 'other') {
      setShowCustomCategory(true);
      setCategoryId('');
    } else {
      setShowCustomCategory(false);
      setCategoryId(value);
      setCustomCategory('');
    }
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    // Check that either category or custom category is provided
    if (!categoryId && !customCategory) {
      toast.error('Please select or enter a skill category');
      return;
    }

    try {
      // Map dynamic form data to submission fields
      const submissionData = {
        full_name: data.full_name as string || '',
        email: data.email as string || '',
        phone: data.phone as string || undefined,
        location: data.location as string || undefined,
        years_experience: typeof data.years_experience === 'number' 
          ? data.years_experience 
          : parseInt(data.years_experience as string) || 0,
        category_id: categoryId || undefined,
        custom_category: customCategory || undefined,
        // Store any extra dynamic fields in metadata
        metadata: Object.fromEntries(
          Object.entries(data).filter(([key]) => 
            !['full_name', 'email', 'phone', 'location', 'years_experience'].includes(key)
          )
        ),
      };

      await submitForm.mutateAsync(submissionData);
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
            {isConfigLoading ? (
              <Card className="shadow-lg">
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Artisan Registration Form</CardTitle>
                  <CardDescription>
                    All fields marked with * are required. Your information will be reviewed by our team.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Category Selection (always shown, not part of dynamic form) */}
                  <div className="space-y-4 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="category">Skill / Profession *</Label>
                      <Select onValueChange={handleCategoryChange} value={categoryId || (showCustomCategory ? 'other' : '')}>
                        <SelectTrigger>
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
                    </div>

                    {showCustomCategory && (
                      <div className="space-y-2 animate-fade-in">
                        <Label htmlFor="custom_category">Specify Your Skill *</Label>
                        <Input
                          id="custom_category"
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          placeholder="Enter your skill/profession"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Dynamic Form Fields */}
                  <DynamicForm
                    fields={formConfig?.field_schema || []}
                    onSubmit={handleSubmit}
                    submitLabel="Submit Registration"
                    isSubmitting={submitForm.isPending}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default BecomeArtisan;
