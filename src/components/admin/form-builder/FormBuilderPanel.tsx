import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SortableField } from './SortableField';
import { FieldEditor } from './FieldEditor';
import { FormField, useSaveFormConfig, defaultClientFields, defaultArtisanFields } from '@/hooks/useFormConfigs';
import { Plus, Save, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FormBuilderPanelProps {
  targetType: 'client' | 'artisan';
  initialFields: FormField[];
  title: string;
  description: string;
}

export function FormBuilderPanel({ 
  targetType, 
  initialFields, 
  title, 
  description 
}: FormBuilderPanelProps) {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const saveConfig = useSaveFormConfig();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        setHasChanges(true);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleAddField = () => {
    setEditingField(null);
    setIsEditorOpen(true);
  };

  const handleEditField = (field: FormField) => {
    setEditingField(field);
    setIsEditorOpen(true);
  };

  const handleDeleteField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    setHasChanges(true);
  };

  const handleSaveField = (field: FormField) => {
    if (editingField) {
      // Update existing field
      setFields((prev) => prev.map((f) => (f.id === field.id ? field : f)));
    } else {
      // Add new field
      setFields((prev) => [...prev, field]);
    }
    setHasChanges(true);
  };

  const handleSave = async () => {
    await saveConfig.mutateAsync({ targetType, fields });
    setHasChanges(false);
  };

  const handleReset = () => {
    const defaults = targetType === 'client' ? defaultClientFields : defaultArtisanFields;
    setFields(defaults);
    setHasChanges(true);
    setShowResetDialog(false);
  };

  const existingFieldNames = fields.map((f) => f.name);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1.5">{description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetDialog(true)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveConfig.isPending || !hasChanges}
            >
              {saveConfig.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Form
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasChanges && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have unsaved changes. Click "Save Form" to apply them.
              </AlertDescription>
            </Alert>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={fields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {fields.map((field) => (
                  <SortableField
                    key={field.id}
                    field={field}
                    onEdit={handleEditField}
                    onDelete={handleDeleteField}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {fields.length === 0 && (
            <div className="text-center py-12 bg-muted/50 rounded-lg border-2 border-dashed">
              <p className="text-muted-foreground mb-4">No fields configured</p>
              <Button onClick={handleAddField}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Field
              </Button>
            </div>
          )}

          {fields.length > 0 && (
            <Button variant="outline" onClick={handleAddField} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          )}
        </CardContent>
      </Card>

      <FieldEditor
        field={editingField}
        open={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveField}
        existingFieldNames={existingFieldNames}
      />

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Default Fields?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all current fields with the default configuration. 
              Any custom fields will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>
              Reset to Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
