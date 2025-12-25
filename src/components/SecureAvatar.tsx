import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SecureAvatarProps {
  src: string | null | undefined;
  fallback: string;
  className?: string;
  fallbackClassName?: string;
}

/**
 * Avatar component that handles signed URLs for private storage buckets
 */
export function SecureAvatar({ src, fallback, className, fallbackClassName }: SecureAvatarProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setSignedUrl(null);
      return;
    }

    // Check if it's a Supabase storage URL that needs signing
    const isSupabaseUrl = src.includes('supabase.co/storage');
    const isPublicUrl = src.includes('/object/public/');
    
    if (!isSupabaseUrl || isPublicUrl) {
      // External URL or already public, use directly
      setSignedUrl(src);
      return;
    }

    // Parse the storage URL to get bucket and path
    const match = src.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/);
    if (!match) {
      setSignedUrl(src);
      return;
    }

    const [, bucket, path] = match;

    const getSignedUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(decodeURIComponent(path), 3600);

        if (error) {
          console.error('Failed to get signed URL for avatar:', error);
          setSignedUrl(null);
        } else {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error getting signed URL:', err);
        setSignedUrl(null);
      }
    };

    getSignedUrl();
  }, [src]);

  return (
    <Avatar className={className}>
      {signedUrl && <AvatarImage src={signedUrl} />}
      <AvatarFallback className={cn("bg-primary/10 text-primary", fallbackClassName)}>
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
}
