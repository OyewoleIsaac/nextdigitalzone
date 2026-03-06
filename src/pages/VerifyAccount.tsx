import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Hammer, Upload, CheckCircle, FileText, AlertCircle, Loader2, X, Image } from 'lucide-react';
import { toast } from 'sonner';

interface UploadedFile {
  name: string;
  path: string;
  type: string;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE_MB = 10;

const VerifyAccount = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredDocs = profile?.role === 'artisan'
    ? ['Government-issued ID (NIN, Passport, Driver's License)', 'Proof of skill / certification (if available)']
    : ['Government-issued ID (NIN, Passport, Driver's License)'];

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    const fileArr = Array.from(files);

    for (const file of fileArr) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Only JPG, PNG, WebP, and PDF files are accepted`);
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name}: File must be under ${MAX_SIZE_MB}MB`);
        continue;
      }

      setUploading(true);
      setUploadProgress(0);

      const ext = file.name.split('.').pop();
      const path = `verification/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from('verification-docs')
        .upload(path, file, { upsert: false });

      if (error) {
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
      } else {
        setUploadedFiles(prev => [...prev, { name: file.name, path, type: file.type }]);
        setUploadProgress(100);
        toast.success(`${file.name} uploaded`);
      }

      setUploading(false);
    }
  };

  const removeFile = (path: string) => {
    setUploadedFiles(prev => prev.filter(f => f.path !== path));
    supabase.storage.from('verification-docs').remove([path]).catch(() => {});
  };

  const handleSubmit = async () => {
    if (!user || !profile) return;
    if (uploadedFiles.length === 0) {
      toast.error('Please upload at least one verification document');
      return;
    }

    setSubmitting(true);
    try {
      // Save attachment records tied to the submission
      const submissionTable = profile.role === 'artisan' ? 'artisan_submissions' : 'client_submissions';

      // Find the submission for this user (created during signup via email match)
      const { data: submission } = await supabase
        .from(submissionTable)
        .select('id')
        .eq('email', profile.full_name ? undefined : user.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (submission) {
        const attachments = uploadedFiles.map(f => ({
          submission_id: submission.id,
          submission_type: profile.role === 'artisan' ? 'artisan' : 'client',
          file_path: f.path,
          file_name: f.name,
          file_type: f.type,
        }));
        await supabase.from('submission_attachments').insert(attachments);
      }

      toast.success('Documents submitted! Your account is under review. We'll notify you once approved.');
      navigate(profile.role === 'artisan' ? '/artisan/dashboard' : '/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    toast.info('You can submit documents later from your dashboard');
    if (profile?.role === 'artisan') navigate('/artisan/dashboard');
    else navigate('/dashboard');
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-lg shadow-xl animate-fade-in-up">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
              <Hammer className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-display">Verify Your Account</CardTitle>
          <CardDescription>
            Upload your verification documents. Your account will be reviewed and approved by our team before you can start.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Required docs list */}
          <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Required Documents:</p>
            {requiredDocs.map((doc, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{doc}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">Accepted formats: JPG, PNG, PDF (max {MAX_SIZE_MB}MB each)</p>
          </div>

          {/* Drop zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files); }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Click to upload or drag & drop</p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF up to {MAX_SIZE_MB}MB</p>
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1.5" />
            </div>
          )}

          {/* Uploaded files list */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Uploaded ({uploadedFiles.length})</p>
              {uploadedFiles.map((file) => (
                <div key={file.path} className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
                  {file.type.startsWith('image/') ? (
                    <Image className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-success shrink-0" />
                  )}
                  <span className="text-sm flex-1 truncate">{file.name}</span>
                  <CheckCircle className="h-4 w-4 text-success shrink-0" />
                  <button
                    type="button"
                    onClick={() => removeFile(file.path)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Info banner */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
            <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-muted-foreground">
              Your account will remain <strong>pending</strong> until our team reviews and approves your documents. This usually takes 1–2 business days.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleSkip} className="flex-1">
              Submit Later
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || uploading || uploadedFiles.length === 0}
              className="flex-1"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
              ) : (
                'Submit Documents'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyAccount;
