import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Image,
  Upload,
  Trash2,
  Loader2,
  Search,
  Calendar,
  X,
  ZoomIn,
  Download,
  CheckSquare,
  Square,
  Edit,
  GripVertical,
} from 'lucide-react';
import { DragDropUpload } from '@/components/DragDropUpload';
import { useActivityMedia } from '@/hooks/useActivityMedia';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function ActivityPhotos() {
  const { isAdminOrCoordinator } = useAuth();
  const { photos, isLoading, uploadMultiplePhotos, deletePhoto, getPhotoDownloadUrl } = useActivityMedia();
  const { activities } = useActivities();
  const { toast } = useToast();

  const [selectedActivity, setSelectedActivity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadForm, setUploadForm] = useState({
    activity_id: '',
    caption: '',
  });
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  
  // Multi-select for download
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Filter photos
  const filteredPhotos = useMemo(() => {
    return photos.filter(photo => {
      if (selectedActivity !== 'all' && photo.activity_id !== selectedActivity) return false;
      return true;
    });
  }, [photos, selectedActivity]);

  // Group photos by activity
  const photosByActivity = useMemo(() => {
    const grouped: Record<string, typeof photos> = {};
    filteredPhotos.forEach(photo => {
      if (!grouped[photo.activity_id]) {
        grouped[photo.activity_id] = [];
      }
      grouped[photo.activity_id].push(photo);
    });
    return grouped;
  }, [filteredPhotos]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setSelectedFiles(fileArray);
      
      // Create previews for all selected files
      const newPreviews: string[] = [];
      fileArray.forEach(file => {
        newPreviews.push(URL.createObjectURL(file));
      });
      setPreviews(newPreviews);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !uploadForm.activity_id) return;

    setIsUploading(true);
    const result = await uploadMultiplePhotos(uploadForm.activity_id, selectedFiles, uploadForm.caption);
    setIsUploading(false);

    if (result.success) {
      setIsUploadDialogOpen(false);
      setSelectedFiles([]);
      setPreviews([]);
      setUploadForm({ activity_id: '', caption: '' });
    }
  };

  const getActivityName = (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    return activity?.name || 'Unknown Activity';
  };

  const getActivityDate = (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    return activity?.activity_date ? format(new Date(activity.activity_date), 'MMM d, yyyy') : '';
  };

  // Toggle photo selection
  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotoIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  // Select all photos in an activity
  const selectAllInActivity = (activityPhotos: typeof photos) => {
    setSelectedPhotoIds(prev => {
      const newSet = new Set(prev);
      activityPhotos.forEach(photo => newSet.add(photo.id));
      return newSet;
    });
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedPhotoIds(new Set());
  };

  // Download single photo
  const downloadPhoto = async (photoUrl: string, filename: string) => {
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Download failed',
        description: 'Could not download the photo',
        variant: 'destructive',
      });
    }
  };

  // Download multiple selected photos
  const downloadSelectedPhotos = async () => {
    if (selectedPhotoIds.size === 0) return;

    setIsDownloading(true);
    const selectedPhotos = photos.filter(p => selectedPhotoIds.has(p.id));

    for (let i = 0; i < selectedPhotos.length; i++) {
      const photo = selectedPhotos[i];
      const ext = photo.photo_url.split('.').pop() || 'jpg';
      const filename = `photo_${i + 1}.${ext}`;
      await downloadPhoto(photo.photo_url, filename);
      // Small delay between downloads
      if (i < selectedPhotos.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    setIsDownloading(false);
    toast({ title: `Downloaded ${selectedPhotos.length} photo${selectedPhotos.length > 1 ? 's' : ''}` });
    setSelectedPhotoIds(new Set());
    setIsSelectionMode(false);
  };

  // Get completed activities for upload
  const completedActivities = activities.filter(a => a.status === 'completed');

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
              Activity Photos
            </h1>
            <p className="text-muted-foreground mt-1">
              View and download photos from BSG activities
            </p>
          </div>
          <div className="flex gap-2">
            {filteredPhotos.length > 0 && (
              <Button
                variant={isSelectionMode ? 'secondary' : 'outline'}
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) deselectAll();
                }}
              >
                {isSelectionMode ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Select
                  </>
                )}
              </Button>
            )}
            {isSelectionMode && selectedPhotoIds.size > 0 && (
              <Button onClick={downloadSelectedPhotos} disabled={isDownloading}>
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download ({selectedPhotoIds.size})
              </Button>
            )}
            {isAdminOrCoordinator && (
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Photos
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedActivity} onValueChange={setSelectedActivity}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Filter by activity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              {activities.map(activity => (
                <SelectItem key={activity.id} value={activity.id}>
                  {activity.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Photos Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : Object.keys(photosByActivity).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Image className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No photos uploaded yet</p>
              {isAdminOrCoordinator && (
                <Button variant="outline" className="mt-4" onClick={() => setIsUploadDialogOpen(true)}>
                  Upload First Photo
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(photosByActivity).map(([activityId, activityPhotos]) => (
              <Card key={activityId}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{getActivityName(activityId)}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {getActivityDate(activityId)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSelectionMode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => selectAllInActivity(activityPhotos)}
                        >
                          Select All
                        </Button>
                      )}
                      <Badge variant="secondary">{activityPhotos.length} photos</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {activityPhotos.map(photo => (
                      <div key={photo.id} className="relative group aspect-square">
                        {isSelectionMode && (
                          <div
                            className="absolute top-2 left-2 z-10 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePhotoSelection(photo.id);
                            }}
                          >
                            <Checkbox
                              checked={selectedPhotoIds.has(photo.id)}
                              className="h-5 w-5 bg-white/80"
                            />
                          </div>
                        )}
                        <img
                          src={photo.photo_url}
                          alt={photo.caption || 'Activity photo'}
                          className={`w-full h-full object-cover rounded-lg cursor-pointer transition-all ${
                            isSelectionMode && selectedPhotoIds.has(photo.id)
                              ? 'ring-2 ring-primary ring-offset-2'
                              : 'group-hover:scale-105'
                          }`}
                          onClick={() => {
                            if (isSelectionMode) {
                              togglePhotoSelection(photo.id);
                            } else {
                              setLightboxPhoto(photo.photo_url);
                            }
                          }}
                        />
                        {!isSelectionMode && (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 hover:bg-black/60"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxPhoto(photo.photo_url);
                              }}
                            >
                              <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 hover:bg-black/60"
                              onClick={(e) => {
                                e.stopPropagation();
                                const ext = photo.photo_url.split('.').pop() || 'jpg';
                                downloadPhoto(photo.photo_url, `photo.${ext}`);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {isAdminOrCoordinator && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/80 hover:bg-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deletePhoto(photo.id, photo.photo_url);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                        {photo.caption && (
                          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent rounded-b-lg">
                            <p className="text-white text-xs truncate">{photo.caption}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Upload Dialog - Multiple Files */}
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Activity Photos</DialogTitle>
              <DialogDescription>
                Upload multiple photos from completed activities (original format & size preserved)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Activity *</Label>
                <Select
                  value={uploadForm.activity_id}
                  onValueChange={(v) => setUploadForm(prev => ({ ...prev, activity_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {completedActivities.map(activity => (
                      <SelectItem key={activity.id} value={activity.id}>
                        {activity.name} - {format(new Date(activity.activity_date), 'MMM d, yyyy')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Photos * (Drag & drop or click to select)</Label>
                <DragDropUpload
                  accept="image/*"
                  multiple
                  maxFiles={20}
                  files={selectedFiles}
                  onFilesChange={setSelectedFiles}
                  previews={previews}
                  onPreviewsChange={setPreviews}
                />
                <p className="text-xs text-muted-foreground">
                  Photos will be uploaded in their original format and size
                </p>
              </div>

              <div className="space-y-2">
                <Label>Caption (optional - applies to all)</Label>
                <Textarea
                  value={uploadForm.caption}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, caption: e.target.value }))}
                  placeholder="Add a caption..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={isUploading || selectedFiles.length === 0 || !uploadForm.activity_id}>
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lightbox */}
        <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black">
            {lightboxPhoto && (
              <div className="relative">
                <img
                  src={lightboxPhoto}
                  alt="Full size"
                  className="w-full h-auto max-h-[90vh] object-contain"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 text-white bg-black/40 hover:bg-black/60"
                  onClick={() => {
                    const ext = lightboxPhoto.split('.').pop() || 'jpg';
                    downloadPhoto(lightboxPhoto, `photo.${ext}`);
                  }}
                >
                  <Download className="h-5 w-5" />
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
