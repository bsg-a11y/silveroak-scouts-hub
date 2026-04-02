import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText, ExternalLink } from 'lucide-react';

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fileUrl: string | null;
  fileType?: string | null;
  onDownload?: () => void;
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  title,
  fileUrl,
  fileType,
  onDownload,
}: DocumentPreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const isPdf = fileType === 'pdf' || fileUrl?.toLowerCase().endsWith('.pdf') || fileUrl?.includes('.pdf');
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType?.toLowerCase() || '') ||
    /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(fileUrl || '');
  const isDoc = ['doc', 'docx'].includes(fileType?.toLowerCase() || '') ||
    /\.(doc|docx)(\?|$)/i.test(fileUrl || '');

  useEffect(() => {
    if (open) setIsLoading(true);
  }, [open, fileUrl]);

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  const renderPreview = () => {
    if (!fileUrl) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Unable to load preview</p>
        </div>
      );
    }

    if (isPdf) {
      return (
        <div className="relative w-full h-[70vh]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <iframe
            src={`${fileUrl}#toolbar=1&navpanes=0`}
            className="w-full h-full border-0 rounded-lg"
            onLoad={() => setIsLoading(false)}
            title={title}
          />
        </div>
      );
    }

    if (isImage) {
      return (
        <div className="relative flex items-center justify-center max-h-[70vh] overflow-auto">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <img
            src={fileUrl}
            alt={title}
            className="max-w-full max-h-[70vh] object-contain rounded-lg"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          />
        </div>
      );
    }

    // For DOC/DOCX or other formats, use Google Docs Viewer
    if (isDoc) {
      const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
      return (
        <div className="relative w-full h-[70vh]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <iframe
            src={viewerUrl}
            className="w-full h-full border-0 rounded-lg"
            onLoad={() => setIsLoading(false)}
            title={title}
          />
        </div>
      );
    }

    // Fallback for unsupported types
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground text-center">
          Preview not available for this file type.
          <br />
          Please download the file to view it.
        </p>
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download File
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="truncate">{title}</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              {fileUrl && (
                <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="overflow-auto">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
