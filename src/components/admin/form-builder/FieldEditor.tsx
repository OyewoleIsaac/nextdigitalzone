import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormField, FormFieldOption } from '@/hooks/useFormConfigs';
import { Plus, X } from 'lucide-react';

interface FieldEditorProps {
  field: FormField | null;
  open: boolean;
  onClose: () => void;
  onSave: (field: FormField) => void;
  existingFieldNames: string[];
}

const fieldTypes = [
  { value: 'text', label: 'Text Input' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown Select' },
  { value: 'number', label: 'Number' },
  { value: 'file', label: 'File Upload' },
  { value: 'checkbox', label: 'Checkbox' },
];

export function FieldEditor({ field, open, onClose, onSave, existingFieldNames }: FieldEditorProps) {
  const [formData, setFormData] = useState<FormField>({
    id: '',
    type: 'text',
    label: '',
    name: '',
    placeholder: '',
    required: false,
    options: [],
    validation: {},
    helperText: '',
  });

  const [options, setOptions] = useState<FormFieldOption[]>([]);

  useEffect(() => {
    if (field) {
      setFormData(field);
      setOptions(field.options || []);
    } else {
      setFormData({
        id: `field_${Date.now()}`,
        type: 'text',
        label: '',
        name: '',
        placeholder: '',
        required: false,
        options: [],
        validation: {},
        helperText: '',
      });
      setOptions([]);
    }
  }, [field, open]);

  const handleLabelChange = (label: string) => {
    const name = label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');
    
    setFormData(prev => ({
      ...prev,
      label,
      name: field ? prev.name : name, // Only auto-generate name for new fields
    }));
  };

  const handleAddOption = () => {
    setOptions([...options, { label: '', value: '' }]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, key: 'label' | 'value', value: string) => {
    const newOptions = [...options];
    newOptions[index][key] = value;
    
    // Auto-generate value from label if value is empty
    if (key === 'label' && !newOptions[index].value) {
      newOptions[index].value = value.toLowerCase().replace(/\s+/g, '_');
    }
    
    setOptions(newOptions);
  };

  const handleSave = () => {
    // Validate
    if (!formData.label.trim()) {
      return;
    }

    if (!field && existingFieldNames.includes(formData.name)) {
      return;
    }

    const savedField: FormField = {
      ...formData,
      options: formData.type === 'select' ? options.filter(o => o.label && o.value) : undefined,
    };

    onSave(savedField);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{field ? 'Edit Field' : 'Add New Field'}</DialogTitle>
          <DialogDescription>
            Configure the field properties and validation rules
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="options" disabled={formData.type !== 'select'}>
              Options
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Field Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, type: value as FormField['type'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="Enter field label"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Field Name (ID)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="field_name"
                  disabled={!!field} // Don't allow editing name for existing fields
                />
                <p className="text-xs text-muted-foreground">
                  Used for data storage. Cannot be changed after creation.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="placeholder">Placeholder</Label>
                <Input
                  id="placeholder"
                  value={formData.placeholder || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
                  placeholder="Enter placeholder text"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="helperText">Helper Text</Label>
              <Textarea
                id="helperText"
                value={formData.helperText || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, helperText: e.target.value }))}
                placeholder="Additional instructions for users"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <Label htmlFor="required">Required Field</Label>
                <p className="text-sm text-muted-foreground">
                  Users must fill this field to submit the form
                </p>
              </div>
              <Switch
                id="required"
                checked={formData.required}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, required: checked }))
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4 mt-4">
            {(formData.type === 'text' || formData.type === 'textarea' || formData.type === 'phone') && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minLength">Minimum Length</Label>
                  <Input
                    id="minLength"
                    type="number"
                    value={formData.validation?.minLength || ''}
                    onChange={(e) => 
                      setFormData(prev => ({
                        ...prev,
                        validation: { ...prev.validation, minLength: parseInt(e.target.value) || undefined }
                      }))
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLength">Maximum Length</Label>
                  <Input
                    id="maxLength"
                    type="number"
                    value={formData.validation?.maxLength || ''}
                    onChange={(e) => 
                      setFormData(prev => ({
                        ...prev,
                        validation: { ...prev.validation, maxLength: parseInt(e.target.value) || undefined }
                      }))
                    }
                    placeholder="Unlimited"
                  />
                </div>
              </div>
            )}

            {formData.type === 'number' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min">Minimum Value</Label>
                  <Input
                    id="min"
                    type="number"
                    value={formData.validation?.min ?? ''}
                    onChange={(e) => 
                      setFormData(prev => ({
                        ...prev,
                        validation: { ...prev.validation, min: parseInt(e.target.value) }
                      }))
                    }
                    placeholder="No minimum"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max">Maximum Value</Label>
                  <Input
                    id="max"
                    type="number"
                    value={formData.validation?.max ?? ''}
                    onChange={(e) => 
                      setFormData(prev => ({
                        ...prev,
                        validation: { ...prev.validation, max: parseInt(e.target.value) }
                      }))
                    }
                    placeholder="No maximum"
                  />
                </div>
              </div>
            )}

            {formData.type === 'file' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="acceptedFileTypes">Accepted File Types</Label>
                  <Input
                    id="acceptedFileTypes"
                    value={formData.acceptedFileTypes?.join(', ') || ''}
                    onChange={(e) => 
                      setFormData(prev => ({
                        ...prev,
                        acceptedFileTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }))
                    }
                    placeholder=".pdf, .jpg, .png"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of file extensions
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxFileSize">Maximum File Size (MB)</Label>
                  <Input
                    id="maxFileSize"
                    type="number"
                    value={formData.maxFileSize || ''}
                    onChange={(e) => 
                      setFormData(prev => ({
                        ...prev,
                        maxFileSize: parseInt(e.target.value) || undefined
                      }))
                    }
                    placeholder="5"
                  />
                </div>
              </div>
            )}

            {formData.type !== 'file' && formData.type !== 'number' && (
              <div className="space-y-2">
                <Label htmlFor="pattern">Validation Pattern (Regex)</Label>
                <Input
                  id="pattern"
                  value={formData.validation?.pattern || ''}
                  onChange={(e) => 
                    setFormData(prev => ({
                      ...prev,
                      validation: { ...prev.validation, pattern: e.target.value || undefined }
                    }))
                  }
                  placeholder="^[a-zA-Z]+$"
                />
                <p className="text-xs text-muted-foreground">
                  Advanced: Regular expression pattern for validation
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="options" className="space-y-4 mt-4">
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option.label}
                    onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                    placeholder="Option label"
                    className="flex-1"
                  />
                  <Input
                    value={option.value}
                    onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                    placeholder="value"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOption(index)}
                    className="h-10 w-10 text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <Button
                variant="outline"
                onClick={handleAddOption}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.label.trim()}>
            {field ? 'Save Changes' : 'Add Field'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
