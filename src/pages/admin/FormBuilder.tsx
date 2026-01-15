import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileEdit, Users, UserCheck, Construction } from 'lucide-react';

const FormBuilder = () => {
  return (
    <AdminLayout title="Form Builder">
      <p className="text-muted-foreground mb-6">
        Customize the registration forms for clients and artisans
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileEdit className="h-5 w-5" />
                Client Verification Form
              </CardTitle>
              <CardDescription>
                Configure the fields that clients must fill out when requesting an artisan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <Construction className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Form Builder Coming Soon</h3>
                <p className="text-muted-foreground max-w-md">
                  The drag-and-drop form builder is under development. For now, forms use the default fields. 
                  You'll soon be able to add, edit, reorder, and configure custom fields.
                </p>
                <div className="mt-6 p-4 bg-muted/50 rounded-lg max-w-md text-left">
                  <p className="text-sm font-medium mb-2">Current Default Fields:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Full Name (required)</li>
                    <li>• Email Address (required, unique)</li>
                    <li>• Phone Number (required)</li>
                    <li>• Residential Address (required)</li>
                    <li>• NIN - National ID (required)</li>
                    <li>• Service Description (required)</li>
                    <li>• Category (optional)</li>
                    <li>• Document Upload (optional)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="artisan">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileEdit className="h-5 w-5" />
                Artisan Registration Form
              </CardTitle>
              <CardDescription>
                Configure the fields that artisans must fill out when registering
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <Construction className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Form Builder Coming Soon</h3>
                <p className="text-muted-foreground max-w-md">
                  The drag-and-drop form builder is under development. For now, forms use the default fields. 
                  You'll soon be able to add, edit, reorder, and configure custom fields.
                </p>
                <div className="mt-6 p-4 bg-muted/50 rounded-lg max-w-md text-left">
                  <p className="text-sm font-medium mb-2">Current Default Fields:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Full Name (required)</li>
                    <li>• Email Address (required, unique)</li>
                    <li>• Phone Number (required)</li>
                    <li>• Location (required)</li>
                    <li>• Skill Category (required)</li>
                    <li>• Custom Category Option</li>
                    <li>• Years of Experience (required)</li>
                    <li>• Portfolio Upload (optional)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default FormBuilder;
