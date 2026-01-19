import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserCheck, Loader2 } from 'lucide-react';
import { FormBuilderPanel } from '@/components/admin/form-builder/FormBuilderPanel';
import { useFormConfig, defaultClientFields, defaultArtisanFields } from '@/hooks/useFormConfigs';

const FormBuilder = () => {
  const clientConfig = useFormConfig('client');
  const artisanConfig = useFormConfig('artisan');

  const isLoading = clientConfig.isLoading || artisanConfig.isLoading;

  if (isLoading) {
    return (
      <AdminLayout title="Form Builder">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Form Builder">
      <p className="text-muted-foreground mb-6">
        Customize the registration forms for clients and artisans. Drag fields to reorder them.
      </p>

      <Tabs defaultValue="client" className="space-y-6">
        <TabsList>
          <TabsTrigger value="client" className="gap-2">
            <Users className="h-4 w-4" />
            Client Form
          </TabsTrigger>
          <TabsTrigger value="artisan" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Artisan Form
          </TabsTrigger>
        </TabsList>

        <TabsContent value="client">
          <FormBuilderPanel
            targetType="client"
            initialFields={clientConfig.data?.field_schema || defaultClientFields}
            title="Client Verification Form"
            description="Configure the fields that clients must fill out when requesting an artisan"
          />
        </TabsContent>

        <TabsContent value="artisan">
          <FormBuilderPanel
            targetType="artisan"
            initialFields={artisanConfig.data?.field_schema || defaultArtisanFields}
            title="Artisan Registration Form"
            description="Configure the fields that artisans must fill out when registering"
          />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default FormBuilder;
