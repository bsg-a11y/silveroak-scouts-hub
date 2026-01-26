import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { useActivityMedia } from '@/hooks/useActivityMedia';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export default function ActivityPhotos() {
  const { isAdminOrCoordinator, isFacultyCoordinator } = useAuth();
  const { photos, isLoading, uploadPhoto, deletePhoto } = useActivityMedia();
  const { activities } = useActivities();

  const [selectedActivity, setSelectedActivity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadForm, setUploadForm] = useState({
    activity_id: '',
    caption: '',
  });
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

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
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.activity_id) return;

    setIsUploading(true);
    const result = await uploadPhoto(uploadForm.activity_id, selectedFile, uploadForm.caption);
    setIsUploading(false);

    if (result.success) {
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
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
              View photos from BSG activities and events
            </p>
          </div>
          {isAdminOrCoordinator && (
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Photos
            </Button>
          )}
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
                    <Badge variant="secondary">{activityPhotos.length} photos</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {activityPhotos.map(photo => (
                      <div key={photo.id} className="relative group aspect-square">
                        <img
                          src={photo.photo_url}
                          alt={photo.caption || 'Activity photo'}
                          className="w-full h-full object-cover rounded-lg cursor-pointer transition-transform group-hover:scale-105"
                          onClick={() => setLightboxPhoto(photo.photo_url)}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg flex items-center justify-center">
                          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {isAdminOrCoordinator && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePhoto(photo.id, photo.photo_url);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
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

        {/* Upload Dialog */}
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Activity Photo</DialogTitle>
              <DialogDescription>
                Upload photos from completed activities
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
                <Label>Photo *</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {previewUrl && (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Caption (optional)</Label>
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
              <Button onClick={handleUpload} disabled={isUploading || !selectedFile || !uploadForm.activity_id}>
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lightbox */}
        <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black">
            {lightboxPhoto && (
              <img
                src={lightboxPhoto}
                alt="Full size"
                className="w-full h-auto max-h-[90vh] object-contain"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
