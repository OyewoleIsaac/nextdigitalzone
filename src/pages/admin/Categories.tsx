import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAllCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories';
import type { Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, Loader2, Briefcase, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const DEFAULT_FORM = {
  name: '',
  slug: '',
  description: '',
  requires_inspection: false,
  default_inspection_fee: 2000,
  is_agency_job: false,
  default_agency_fee: 5000,
};

const Categories = () => {
  const { data: categories, isLoading } = useAllCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const noFeeType = !formData.requires_inspection && !formData.is_agency_job;
    await createCategory.mutateAsync({
      name: formData.name,
      slug: formData.slug || generateSlug(formData.name),
      description: formData.description || undefined,
      requires_inspection: formData.requires_inspection,
      default_inspection_fee: Math.round(formData.default_inspection_fee * 100),
      is_agency_job: formData.is_agency_job,
      default_agency_fee: Math.round(formData.default_agency_fee * 100),
      // Standard categories (no fee type) start inactive until a fee is configured
      is_active: noFeeType ? false : true,
    });
    setShowCreateDialog(false);
    setFormData(DEFAULT_FORM);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    await updateCategory.mutateAsync({
      id: selectedCategory.id,
      name: formData.name,
      description: formData.description || undefined,
      requires_inspection: formData.requires_inspection,
      default_inspection_fee: Math.round(formData.default_inspection_fee * 100),
      is_agency_job: formData.is_agency_job,
      default_agency_fee: Math.round(formData.default_agency_fee * 100),
    });
    setShowEditDialog(false);
    setSelectedCategory(null);
    setFormData(DEFAULT_FORM);
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    await deleteCategory.mutateAsync(selectedCategory.id);
    setShowDeleteDialog(false);
    setSelectedCategory(null);
  };

  const isStandardCategory = (cat: Category) =>
    !cat.requires_inspection && !cat.is_agency_job;

  const handleToggleActive = async (category: Category) => {
    if (!category.is_active && isStandardCategory(category)) {
      toast.error('This category has no inspection fee or agency fee set. Please add a fee type before activating it.');
      return;
    }
    await updateCategory.mutateAsync({ id: category.id, is_active: !category.is_active });
  };

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      requires_inspection: category.requires_inspection ?? false,
      default_inspection_fee: (category.default_inspection_fee ?? 200000) / 100,
      is_agency_job: category.is_agency_job ?? false,
      default_agency_fee: (category.default_agency_fee ?? 500000) / 100,
    });
    setShowEditDialog(true);
  };

  const CategoryForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({
            ...prev, name: e.target.value,
            slug: isEdit ? prev.slug : generateSlug(e.target.value),
          }))}
          placeholder="e.g., Plumbing"
          required
        />
      </div>
      {!isEdit && (
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            placeholder="auto-generated"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Optional description"
          rows={2}
        />
      </div>

      <Separator />
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Job Type Settings</p>

      {/* Inspection */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Requires Physical Inspection</Label>
            <p className="text-xs text-muted-foreground">Customer pays inspection fee upfront before request is submitted</p>
          </div>
          <Switch
            checked={formData.requires_inspection}
            onCheckedChange={(v) => setFormData(prev => ({ ...prev, requires_inspection: v }))}
          />
        </div>
        {formData.requires_inspection && (
          <div className="space-y-1">
            <Label className="text-sm">Default Inspection Fee (₦)</Label>
            <Input
              type="number"
              min={0}
              value={formData.default_inspection_fee}
              onChange={(e) => setFormData(prev => ({ ...prev, default_inspection_fee: parseFloat(e.target.value) || 0 }))}
              placeholder="2000"
            />
            <p className="text-xs text-muted-foreground">Minimum: ₦2,000. This is the default; admin can override per job.</p>
          </div>
        )}
      </div>

      {/* Agency */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Agency / Staff Placement Job</Label>
            <p className="text-xs text-muted-foreground">Customer pays an agency fee instead (e.g., domestic staff placement)</p>
          </div>
          <Switch
            checked={formData.is_agency_job}
            onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_agency_job: v, requires_inspection: v ? false : prev.requires_inspection }))}
          />
        </div>
        {formData.is_agency_job && (
          <div className="space-y-1">
            <Label className="text-sm">Default Agency Fee (₦)</Label>
            <Input
              type="number"
              min={0}
              value={formData.default_agency_fee}
              onChange={(e) => setFormData(prev => ({ ...prev, default_agency_fee: parseFloat(e.target.value) || 0 }))}
              placeholder="5000"
            />
            <p className="text-xs text-muted-foreground">Paid by customer before request is submitted. 30% of first salary is the artisan commission.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AdminLayout title="Categories">
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground">Manage artisan skill categories and job type settings</p>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Category</DialogTitle>
              <DialogDescription>Add a new skill category and configure its job type settings</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <CategoryForm />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={createCategory.isPending}>
                  {createCategory.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Categories ({categories?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : categories?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No categories yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories?.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{cat.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{cat.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {cat.requires_inspection && (
                          <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                            <Search className="h-2.5 w-2.5 mr-1" /> Inspection
                          </Badge>
                        )}
                        {cat.is_agency_job && (
                          <Badge variant="outline" className="text-xs border-accent/40 text-accent">
                            <Briefcase className="h-2.5 w-2.5 mr-1" /> Agency
                          </Badge>
                        )}
                        {!cat.requires_inspection && !cat.is_agency_job && (
                          <span className="text-xs text-muted-foreground">Standard</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {cat.requires_inspection && <span>₦{(cat.default_inspection_fee / 100).toLocaleString()} inspection</span>}
                      {cat.is_agency_job && <span>₦{(cat.default_agency_fee / 100).toLocaleString()} agency</span>}
                      {!cat.requires_inspection && !cat.is_agency_job && <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isStandardCategory(cat) && !cat.is_active ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 text-warning">
                                <Switch checked={false} onCheckedChange={() => handleToggleActive(cat)} disabled />
                                <AlertCircle className="h-3.5 w-3.5" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-[200px]">Set an inspection fee or agency fee before activating this category.</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Switch checked={cat.is_active} onCheckedChange={() => handleToggleActive(cat)} />
                        )}
                        <Badge variant={cat.is_active ? 'default' : 'secondary'}>
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(cat.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(cat)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => { setSelectedCategory(cat); setShowDeleteDialog(true); }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <CategoryForm isEdit />
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={updateCategory.isPending}>
                {updateCategory.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCategory?.name}"? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteCategory.isPending}>
              {deleteCategory.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Categories;
