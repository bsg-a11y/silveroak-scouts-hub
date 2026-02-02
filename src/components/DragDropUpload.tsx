import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileIcon, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DragDropUploadProps {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  files: File[];
  onFilesChange: (files: File[]) => void;
  previews?: string[];
  onPreviewsChange?: (previews: string[]) => void;
  disabled?: boolean;
  className?: string;
  showPreviews?: boolean;
}

export function DragDropUpload({
  accept = '*/*',
  multiple = false,
  maxFiles = 10,
  files,
  onFilesChange,
  previews = [],
  onPreviewsChange,
  disabled = false,
  className,
  showPreviews = true,
}: DragDropUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const allowedFiles = multiple ? fileArray.slice(0, maxFiles - files.length) : [fileArray[0]];
    
    if (multiple) {
      const combined = [...files, ...allowedFiles].slice(0, maxFiles);
      onFilesChange(combined);
      
      if (onPreviewsChange && showPreviews) {
        const newPreviews = allowedFiles.map(file => {
          if (file.type.startsWith('image/')) {
            return URL.createObjectURL(file);
          }
          return '';
        });
        onPreviewsChange([...previews, ...newPreviews].slice(0, maxFiles));
      }
    } else {
      onFilesChange([allowedFiles[0]]);
      
      if (onPreviewsChange && showPreviews && allowedFiles[0]) {
        if (allowedFiles[0].type.startsWith('image/')) {
          onPreviewsChange([URL.createObjectURL(allowedFiles[0])]);
        } else {
          onPreviewsChange(['']);
        }
      }
    }
  }, [files, multiple, maxFiles, onFilesChange, onPreviewsChange, previews, showPreviews]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }, [disabled, processFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  const removeFile = useCallback((index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
    
    if (onPreviewsChange) {
      const newPreviews = previews.filter((_, i) => i !== index);
      onPreviewsChange(newPreviews);
    }
  }, [files, onFilesChange, onPreviewsChange, previews]);

  const isImage = (file: File) => file.type.startsWith('image/');

  return (
    <div className={cn('space-y-4', className)}>
      <div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />
        
        <Upload className={cn(
          'mx-auto h-12 w-12 mb-4 transition-colors',
          isDragging ? 'text-primary' : 'text-muted-foreground'
        )} />
        
        <p className="text-sm font-medium mb-1">
          {isDragging ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-xs text-muted-foreground">
          or click to browse {multiple && `(max ${maxFiles} files)`}
        </p>
      </div>

      {/* File previews */}
      {showPreviews && files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {files.map((file, index) => (
            <div key={index} className="relative group">
              {isImage(file) && previews[index] ? (
                <img
                  src={previews[index]}
                  alt={file.name}
                  className="w-full aspect-square object-cover rounded-lg border"
                />
              ) : (
                <div className="w-full aspect-square rounded-lg border bg-muted flex flex-col items-center justify-center p-2">
                  <FileIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground text-center truncate w-full">
                    {file.name}
                  </p>
                </div>
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ))}
        </div>
      )}

      {!showPreviews && files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                {isImage(file) ? (
                  <ImageIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className="text-sm truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => removeFile(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
