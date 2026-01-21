import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { useCategories } from '@/hooks/useCategories';
import { useSubmitClientForm } from '@/hooks/useSubmissions';
import { useFormConfig } from '@/hooks/useFormConfigs';
import { DynamicForm } from '@/components/forms/DynamicForm';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { CheckCircle, Search, Shield } from 'lucide-react';

const FindArtisan = () => {
  const [searchParams] = useSearchParams();
  const preselectedCategory = searchParams.get('category');
  const { data: categories } = useCategories();
  const { data: formConfig, isLoading: isConfigLoading } = useFormConfig('client');
  const submitForm = useSubmitClientForm();
  
  const [categoryId, setCategoryId] = useState<string>(() => {
    return categories?.find(c => c.slug === preselectedCategory)?.id || '';
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      // Map dynamic form data to submission fields
      const submissionData = {
        full_name: data.full_name as string || '',
        email: data.email as string || '',
        phone: data.phone as string || undefined,
        address: data.address as string || undefined,
        nin: data.nin as string || '',
        service_description: data.service_description as string || undefined,
        category_id: categoryId || undefined,
        // Store any extra dynamic fields in metadata
        metadata: Object.fromEntries(
          Object.entries(data).filter(([key]) => 
            !['full_name', 'email', 'phone', 'address', 'nin', 'service_description'].includes(key)
          )
        ),
      };

      await submitForm.mutateAsync(submissionData);
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
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Client Verification Form
                  </CardTitle>
                  <CardDescription>
                    All fields marked with * are required. Your information is kept secure and confidential.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Category Selection (always shown, not part of dynamic form) */}
                  <div className="space-y-2 mb-6">
                    <Label htmlFor="category">Service Category</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
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
                  
                  {/* Dynamic Form Fields */}
                  <DynamicForm
                    fields={formConfig?.field_schema || []}
                    onSubmit={handleSubmit}
                    submitLabel="Submit Request"
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

export default FindArtisan;
