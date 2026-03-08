import { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Upload, X, FileImage, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type IdType = 'nin' | 'drivers_license' | 'voters_card' | 'international_passport' | 'staff_id';

export interface IdVerificationData {
  idType: IdType;
  idNumber: string;
  idImagePath: string;
  idImageName: string;
}

interface IdVerificationStepProps {
  onChange: (data: IdVerificationData | null) => void;
  value: IdVerificationData | null;
}

const ID_TYPE_LABELS: Record<IdType, string> = {
  nin: 'National Identification Number (NIN)',
  drivers_license: "Driver's License",
  voters_card: 'Permanent Voter's Card (PVC)',
  international_passport: 'International Passport',
  staff_id: 'Staff / Student ID',
};

const ID_PLACEHOLDERS: Record<IdType, string> = {
  nin: 'e.g. 12345678901 (11 digits)',
  drivers_license: 'e.g. ABC123456789',
  voters_card: 'e.g. 0B0BCA1234567890',
  international_passport: 'e.g. A12345678',
  staff_id: 'Your staff or student ID number',
};

export function IdVerificationStep({ onChange, value }: IdVerificationStepProps) {
  const [idType, setIdType] = useState<IdType | ''>('');
  const [idNumber, setIdNumber] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ path: string; name: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!idType || !idNumber.trim()) {
      toast.error('Please select ID type and enter your ID number first');
      return;
    }

    const maxMB = 5;
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${maxMB}MB`);
      return;
    }
    const accepted = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!accepted.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, WEBP or PDF file');
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    try {
      const ext = file.name.split('.').pop();
      const path = `id-docs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      setUploadProgress(40);
      const { error } = await supabase.storage.from('verification-docs').upload(path, file);
      if (error) throw error;
      setUploadProgress(100);
      setUploadedFile({ path, name: file.name });
      const data: IdVerificationData = {
        idType: idType as IdType,
        idNumber: idNumber.trim(),
        idImagePath: path,
        idImageName: file.name,
      };
      onChange(data);
      toast.success('ID document uploaded successfully!');
    } catch (err) {
      toast.error('Failed to upload document. Please try again.');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (uploadedFile) {
      await supabase.storage.from('verification-docs').remove([uploadedFile.path]);
    }
    setUploadedFile(null);
    setUploadProgress(0);
    onChange(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // Update parent when id type or number changes (but image is already set)
  const handleTypeChange = (type: IdType) => {
    setIdType(type);
    if (uploadedFile) {
      onChange({ idType: type, idNumber, idImagePath: uploadedFile.path, idImageName: uploadedFile.name });
    }
  };

  const handleNumberChange = (num: string) => {
    setIdNumber(num);
    if (uploadedFile && idType) {
      onChange({ idType: idType as IdType, idNumber: num, idImagePath: uploadedFile.path, idImageName: uploadedFile.name });
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/20">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
          <span className="text-xs text-primary-foreground font-bold">!</span>
        </div>
        <div>
          <p className="text-sm font-semibold">Identity Verification Required</p>
          <p className="text-xs text-muted-foreground">This is mandatory to activate your account and build trust on the platform.</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* ID Type */}
        <div className="space-y-1.5">
          <Label>ID Type <span className="text-destructive">*</span></Label>
          <Select value={idType} onValueChange={(v) => handleTypeChange(v as IdType)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type of ID" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(ID_TYPE_LABELS) as [IdType, string][]).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ID Number */}
        {idType && (
          <div className="space-y-1.5">
            <Label htmlFor="id-number">
              {ID_TYPE_LABELS[idType as IdType]} Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="id-number"
              value={idNumber}
              onChange={(e) => handleNumberChange(e.target.value)}
              placeholder={ID_PLACEHOLDERS[idType as IdType]}
            />
          </div>
        )}

        {/* ID Image Upload */}
        {idType && idNumber.trim() && (
          <div className="space-y-1.5">
            <Label>Upload ID Document <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground">Upload a clear photo or scan of your ID (JPG, PNG, PDF — max 5MB)</p>

            {uploadedFile ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-green-700 truncate">{uploadedFile.name}</p>
                  <p className="text-xs text-green-600">Uploaded successfully</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-border rounded-lg p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <div className="space-y-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Uploading... {uploadProgress}%</p>
                  </div>
                ) : (
                  <>
                    <FileImage className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag & drop
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">JPG, PNG, PDF up to 5MB</p>
                    <Button type="button" variant="outline" size="sm" className="mt-3 pointer-events-none">
                      <Upload className="h-3.5 w-3.5 mr-1" /> Choose File
                    </Button>
                  </>
                )}
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          </div>
        )}
      </div>

      {value ? (
        <div className="flex items-center gap-1.5 text-xs text-green-600">
          <CheckCircle className="h-3.5 w-3.5" />
          ID verification complete
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-amber-600">
          <AlertCircle className="h-3.5 w-3.5" />
          Complete all fields above to proceed
        </div>
      )}
    </div>
  );
}
