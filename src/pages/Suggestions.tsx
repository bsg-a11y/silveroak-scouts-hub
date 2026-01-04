import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Lightbulb, Plus, Check, X, MessageSquare, Phone, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useActivitySuggestions, CreateSuggestionData } from '@/hooks/useActivitySuggestions';
import { useAuth } from '@/contexts/AuthContext';

export default function Suggestions() {
  const { suggestions, isLoading, createSuggestion, updateSuggestion } = useActivitySuggestions();
  const { isAdminOrCoordinator, user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reviewDialog, setReviewDialog] = useState<{ id: string; status: string } | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [formData, setFormData] = useState<CreateSuggestionData>({
    title: '',
    description: '',
    suggested_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    await createSuggestion.mutateAsync(formData);
    setFormData({ title: '', description: '', suggested_date: '' });
    setIsDialogOpen(false);
  };

  const handleReview = async () => {
    if (!reviewDialog) return;
    await updateSuggestion.mutateAsync({
      id: reviewDialog.id,
      status: reviewDialog.status,
      admin_response: adminResponse,
    });
    setReviewDialog(null);
    setAdminResponse('');
  };

  const mySuggestions = suggestions.filter(s => s.user_id === user?.id);
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const processedSuggestions = suggestions.filter(s => s.status !== 'pending');

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
              Activity Suggestions
            </h1>
            <p className="text-muted-foreground mt-1">
              Suggest new activities for BSG
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Suggest Activity
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Suggest New Activity</DialogTitle>
                <DialogDescription>
                  Share your idea for a new BSG activity
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Activity Name *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Tree Plantation Drive"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your activity idea..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suggested_date">Suggested Date (Optional)</Label>
                  <Input
                    id="suggested_date"
                    type="date"
                    value={formData.suggested_date}
                    onChange={(e) => setFormData({ ...formData, suggested_date: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createSuggestion.isPending}>
                    {createSuggestion.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Suggestion'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue={isAdminOrCoordinator ? "pending" : "my-suggestions"} className="space-y-4">
          <TabsList>
            {!isAdminOrCoordinator && (
              <TabsTrigger value="my-suggestions">My Suggestions ({mySuggestions.length})</TabsTrigger>
            )}
            {isAdminOrCoordinator && (
              <>
                <TabsTrigger value="pending">Pending ({pendingSuggestions.length})</TabsTrigger>
                <TabsTrigger value="processed">Processed ({processedSuggestions.length})</TabsTrigger>
              </>
            )}
          </TabsList>

          {!isAdminOrCoordinator && (
            <TabsContent value="my-suggestions" className="space-y-4">
              {mySuggestions.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>You haven't submitted any suggestions yet.</p>
                    <Button variant="link" onClick={() => setIsDialogOpen(true)}>
                      Suggest your first activity
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {mySuggestions.map((suggestion) => (
                    <Card key={suggestion.id}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Lightbulb className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold text-foreground">{suggestion.title}</h3>
                              <Badge variant={
                                suggestion.status === 'approved' ? 'success' : 
                                suggestion.status === 'rejected' ? 'danger' : 'warning'
                              }>
                                {suggestion.status}
                              </Badge>
                            </div>
                            {suggestion.description && (
                              <p className="text-muted-foreground mb-2">{suggestion.description}</p>
                            )}
                            <div className="text-sm text-muted-foreground">
                              Submitted: {format(new Date(suggestion.created_at), 'MMM d, yyyy')}
                              {suggestion.suggested_date && ` • Suggested for: ${suggestion.suggested_date}`}
                            </div>
                            {suggestion.admin_response && (
                              <div className="mt-3 p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium">Admin Response:</p>
                                <p className="text-sm text-muted-foreground">{suggestion.admin_response}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {isAdminOrCoordinator && (
            <>
              <TabsContent value="pending" className="space-y-4">
                {pendingSuggestions.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      No pending suggestions
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {pendingSuggestions.map((suggestion) => (
                      <Card key={suggestion.id}>
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold text-foreground">{suggestion.title}</h3>
                                <Badge variant="warning">Pending</Badge>
                              </div>
                              {suggestion.description && (
                                <p className="text-muted-foreground mb-2">{suggestion.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>
                                  By: {suggestion.profile?.first_name} {suggestion.profile?.last_name} ({suggestion.profile?.uid})
                                </span>
                                <span>• {format(new Date(suggestion.created_at), 'MMM d, yyyy')}</span>
                                {suggestion.suggested_date && (
                                  <span>• Suggested: {suggestion.suggested_date}</span>
                                )}
                              </div>
                              {suggestion.profile?.whatsapp_number && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <a
                                    href={`https://wa.me/91${suggestion.profile.whatsapp_number}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline"
                                  >
                                    Contact on WhatsApp
                                  </a>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:bg-green-50"
                                onClick={() => setReviewDialog({ id: suggestion.id, status: 'approved' })}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => setReviewDialog({ id: suggestion.id, status: 'rejected' })}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="processed" className="space-y-4">
                {processedSuggestions.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      No processed suggestions
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {processedSuggestions.map((suggestion) => (
                      <Card key={suggestion.id} className="bg-muted/20">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{suggestion.title}</span>
                                <Badge variant={suggestion.status === 'approved' ? 'success' : 'danger'}>
                                  {suggestion.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                By: {suggestion.profile?.first_name} {suggestion.profile?.last_name}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Review Dialog */}
        <Dialog open={!!reviewDialog} onOpenChange={(open) => !open && setReviewDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reviewDialog?.status === 'approved' ? 'Approve' : 'Reject'} Suggestion
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Response (Optional)</Label>
                <Textarea
                  placeholder="Add a response for the member..."
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialog(null)}>
                Cancel
              </Button>
              <Button
                variant={reviewDialog?.status === 'approved' ? 'default' : 'destructive'}
                onClick={handleReview}
                disabled={updateSuggestion.isPending}
              >
                {updateSuggestion.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  reviewDialog?.status === 'approved' ? 'Approve' : 'Reject'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
