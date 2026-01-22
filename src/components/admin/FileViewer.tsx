import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Image, Download, X, ExternalLink, Eye } from 'lucide-react';

interface AttachmentFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  created_at: string;
}

interface FileViewerProps {
  attachments: AttachmentFile[];
}

export function FileViewer({ attachments }: FileViewerProps) {
  const [selectedFile, setSelectedFile] = useState<AttachmentFile | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getFileIcon = (fileType: string | null, fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (fileType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const isImageFile = (fileType: string | null, fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return fileType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '');
  };

  const isPdfFile = (fileName: string) => {
    return fileName.toLowerCase().endsWith('.pdf');
  };

  const handleViewFile = async (file: AttachmentFile) => {
    setSelectedFile(file);
    setIsLoading(true);
    
    try {
      // Generate a signed URL for the file
      const { data, error } = await supabase.storage
        .from('form-uploads')
        .createSignedUrl(file.file_path, 3600); // 1 hour expiry

      if (error) {
        throw error;
      }

      setFileUrl(data.signedUrl);
    } catch (error) {
      console.error('Failed to get file URL:', error);
      setFileUrl(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (file: AttachmentFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('form-uploads')
        .createSignedUrl(file.file_path, 60);

      if (error) throw error;

      // Create a temporary link and click it
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  if (!attachments || attachments.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No files attached
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {attachments.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
          >
            <div className="flex items-center gap-3 min-w-0">
              {getFileIcon(file.file_type, file.file_name)}
              <span className="text-sm font-medium truncate">{file.file_name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewFile(file)}
                className="h-8 px-2"
                title="Preview"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(file)}
                className="h-8 px-2"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* File Preview Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => { setSelectedFile(null); setFileUrl(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              {selectedFile && getFileIcon(selectedFile.file_type, selectedFile.file_name)}
              <span className="truncate">{selectedFile?.file_name}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Skeleton className="h-full w-full" />
              </div>
            ) : fileUrl ? (
              <div className="h-full">
                {selectedFile && isImageFile(selectedFile.file_type, selectedFile.file_name) ? (
                  <div className="flex items-center justify-center p-4">
                    <img
                      src={fileUrl}
                      alt={selectedFile.file_name}
                      className="max-w-full max-h-[60vh] object-contain rounded-lg"
                    />
                  </div>
                ) : selectedFile && isPdfFile(selectedFile.file_name) ? (
                  <iframe
                    src={fileUrl}
                    className="w-full h-[60vh] rounded-lg border"
                    title={selectedFile.file_name}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Preview not available for this file type
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => window.open(fileUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in New Tab
                      </Button>
                      <Button
                        onClick={() => selectedFile && handleDownload(selectedFile)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Failed to load file preview
              </div>
            )}
          </div>

          {fileUrl && selectedFile && (isImageFile(selectedFile.file_type, selectedFile.file_name) || isPdfFile(selectedFile.file_name)) && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => window.open(fileUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
              <Button
                onClick={() => handleDownload(selectedFile)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}