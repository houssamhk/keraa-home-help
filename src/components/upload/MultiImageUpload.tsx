import { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MediaFile {
  url: string;
  type: 'image' | 'video';
  file?: File;
}

interface MultiImageUploadProps {
  bucket: string;
  value: MediaFile[];
  onChange: (files: MediaFile[]) => void;
  maxFiles?: number;
  accept?: string;
  compressImages?: boolean;
}

// Compress image using canvas
async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Compression failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function MultiImageUpload({
  bucket,
  value,
  onChange,
  maxFiles = 10,
  accept = 'image/*,video/*',
  compressImages = true
}: MultiImageUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    const remainingSlots = maxFiles - value.length;
    if (remainingSlots <= 0) {
      toast.error(`الحد الأقصى ${maxFiles} ملفات`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploading(true);
    setUploadProgress(0);

    const newFiles: MediaFile[] = [];
    let processed = 0;

    for (const file of filesToUpload) {
      try {
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isImage && !isVideo) {
          toast.error(`${file.name}: نوع الملف غير مدعوم`);
          continue;
        }

        let uploadFile: File | Blob = file;

        // Compress images if enabled
        if (compressImages && isImage && file.size > 500000) {
          try {
            uploadFile = await compressImage(file);
          } catch (err) {
            console.error('Compression failed, using original:', err);
          }
        }

        const fileName = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, uploadFile);

        if (error) {
          toast.error(`فشل في رفع ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        newFiles.push({
          url: urlData.publicUrl,
          type: isVideo ? 'video' : 'image'
        });

        processed++;
        setUploadProgress(Math.round((processed / filesToUpload.length) * 100));
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`خطأ في رفع ${file.name}`);
      }
    }

    if (newFiles.length > 0) {
      onChange([...value, ...newFiles]);
      toast.success(`تم رفع ${newFiles.length} ملف بنجاح`);
    }

    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = async (index: number) => {
    const fileToRemove = value[index];
    
    // Try to delete from storage (optional - fails silently if not allowed)
    try {
      const path = fileToRemove.url.split(`${bucket}/`)[1];
      if (path) {
        await supabase.storage.from(bucket).remove([path]);
      }
    } catch (err) {
      // Ignore deletion errors
    }

    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Preview Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {value.map((media, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-xl overflow-hidden bg-muted group"
            >
              {media.type === 'image' ? (
                <img
                  src={media.url}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <video
                  src={media.url}
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-2 right-2 w-7 h-7 bg-destructive/90 hover:bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4 text-destructive-foreground" />
              </button>

              {/* Video indicator */}
              {media.type === 'video' && (
                <div className="absolute bottom-2 left-2 bg-black/60 rounded-md px-2 py-1 flex items-center gap-1">
                  <Video className="w-3 h-3 text-white" />
                  <span className="text-[10px] text-white">فيديو</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        type="button"
        variant="glass"
        className="w-full gap-3 py-6"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || value.length >= maxFiles}
      >
        {uploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>جاري الرفع... {uploadProgress}%</span>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            <span>
              {value.length === 0 
                ? 'رفع صور أو فيديوهات' 
                : `إضافة المزيد (${value.length}/${maxFiles})`
              }
            </span>
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        {compressImages ? 'يتم ضغط الصور تلقائياً • ' : ''}
        الحد الأقصى {maxFiles} ملفات
      </p>
    </div>
  );
}
