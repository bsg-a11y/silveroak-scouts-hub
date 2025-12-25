import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SecureDownloadButtonProps {
  url: string | null;
  filename?: string;
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'secondary' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm';
}

/**
 * Download button that handles signed URLs for private storage buckets
 */
export function SecureDownloadButton({ 
  url, 
  filename,
  children, 
  className,
  variant = 'outline',
  size = 'sm'
}: SecureDownloadButtonProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setSignedUrl(null);
      return;
    }

    // Check if it's a Supabase storage URL that needs signing
    const isSupabaseUrl = url.includes('supabase.co/storage');
    const isPublicUrl = url.includes('/object/public/');
    
    if (!isSupabaseUrl || isPublicUrl) {
      // External URL or already public, use directly
      setSignedUrl(url);
      return;
    }

    // Parse the storage URL to get bucket and path
    const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/);
    if (!match) {
      setSignedUrl(url);
      return;
    }

    const [, bucket, path] = match;

    const getSignedUrl = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(decodeURIComponent(path), 3600);

        if (error) {
          console.error('Failed to get signed URL:', error);
          setSignedUrl(null);
        } else {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error getting signed URL:', err);
        setSignedUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    getSignedUrl();
  }, [url]);

  if (!url) return null;

  if (isLoading) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (!signedUrl) return null;

  return (
    <Button variant={variant} size={size} className={className} asChild>
      <a href={signedUrl} target="_blank" rel="noopener noreferrer" download={filename}>
        {children || (
          <>
            <Download className="h-4 w-4 mr-2" />
            Download
          </>
        )}
      </a>
    </Button>
  );
}
