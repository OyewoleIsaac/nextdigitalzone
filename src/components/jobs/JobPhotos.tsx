import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Image, Loader2 } from 'lucide-react';

interface JobPhotoProps {
  path: string | null;
  label: string;
}

function JobPhoto({ path, label }: JobPhotoProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [enlarged, setEnlarged] = useState(false);

  useEffect(() => {
    if (!path) return;
    setLoading(true);
    supabase.storage
      .from('job-photos')
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (!error && data) setUrl(data.signedUrl);
      })
      .finally(() => setLoading(false));
  }, [path]);

  if (!path) return null;

  return (
    <>
      <div
        className="cursor-pointer group relative rounded-lg overflow-hidden border bg-muted/40"
        onClick={() => url && setEnlarged(true)}
      >
        {loading ? (
          <div className="w-full h-32 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : url ? (
          <img
            src={url}
            alt={label}
            className="w-full h-32 object-cover group-hover:opacity-90 transition-opacity"
          />
        ) : (
          <div className="w-full h-32 flex items-center justify-center text-muted-foreground text-xs">
            Failed to load
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 px-2 flex items-center gap-1">
          <Image className="h-3 w-3" /> {label}
        </div>
      </div>
      {enlarged && url && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setEnlarged(false)}
        >
          <img
            src={url}
            alt={label}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
          <p className="absolute bottom-6 text-white text-sm opacity-70">Click anywhere to close</p>
        </div>
      )}
    </>
  );
}

interface JobPhotosProps {
  photoBefore: string | null;
  photoAfter: string | null;
}

export function JobPhotos({ photoBefore, photoAfter }: JobPhotosProps) {
  if (!photoBefore && !photoAfter) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      {photoBefore && <JobPhoto path={photoBefore} label="Before" />}
      {photoAfter && <JobPhoto path={photoAfter} label="After" />}
    </div>
  );
}
