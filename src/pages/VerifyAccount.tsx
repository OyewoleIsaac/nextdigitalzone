import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Award, Upload, CheckCircle, FileText, Loader2, X, Image } from 'lucide-react';
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
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect customers immediately — this page is only for artisans
  useEffect(() => {
    if (!profileLoading && profile && profile.role !== 'artisan') {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, profileLoading, navigate]);

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
      const path = `certificates/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

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
      toast.error('Please upload at least one certificate');
      return;
    }

    setSubmitting(true);
    try {
      // Get submission ID - first try localStorage (set during signup), then fall back to querying
      let submissionId = localStorage.getItem('pending_artisan_submission_id');

      if (!submissionId) {
        // Fallback: try to find by user metadata stored in submission
        const { data: submission } = await supabase
          .from('artisan_submissions')
          .select('id')
          .eq('email', user.email as string)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        submissionId = submission?.id ?? null;
      }

      if (submissionId) {
        const attachments = uploadedFiles.map(f => ({
          submission_id: submissionId as string,
          submission_type: 'artisan',
          file_path: f.path,
          file_name: f.name,
          file_type: f.type,
        }));
        const { error } = await supabase.from('submission_attachments').insert(attachments);
        if (error) console.error('Attachment insert error:', error);
        // Clear the stored submission ID after use
        localStorage.removeItem('pending_artisan_submission_id');
      }

      toast.success("Certificate submitted! Our team will review your profile shortly.");
      navigate('/artisan/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    toast.info('You can upload your certificate anytime from your Profile page');
    navigate('/artisan/dashboard');
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
              <Award className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-display">Upload Your Certificate</CardTitle>
          <CardDescription>
            Optionally upload a certificate or proof of skill to boost trust with customers. You can always do this later from your profile.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* What to upload */}
          <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">What you can upload:</p>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Award className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Trade certificate or qualification document</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Training completion certificate or letter</span>
            </div>
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

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleSkip} className="flex-1">
              Skip for Now
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
                'Submit Certificate'
              )}
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            This is completely optional. You can upload certificates anytime from your Profile.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyAccount;
