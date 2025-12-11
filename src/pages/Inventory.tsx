import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, Users, Undo2 } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';

const CATEGORIES = ['Uniform', 'Badge', 'Scarf', 'Equipment', 'Stationery', 'Other'];

export default function Inventory() {
  const { resources, assignments, isLoading, createResource, assignResource, returnResource } = useInventory();
  const { members } = useMembers();
  const { isAdminOrCoordinator } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [newResource, setNewResource] = useState({
    name: '',
    category: '',
    total_quantity: 0,
    available_quantity: 0,
    unit: 'pieces',
  });
  const [assignment, setAssignment] = useState({
    resource_id: '',
    user_id: '',
    quantity: 1,
  });

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    await createResource.mutateAsync({
      ...newResource,
      available_quantity: newResource.total_quantity,
    });
    setNewResource({ name: '', category: '', total_quantity: 0, available_quantity: 0, unit: 'pieces' });
    setIsAddDialogOpen(false);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    await assignResource.mutateAsync(assignment);
    setAssignment({ resource_id: '', user_id: '', quantity: 1 });
    setIsAssignDialogOpen(false);
  };

  const groupedResources = resources.reduce((acc, resource) => {
    if (!acc[resource.category]) acc[resource.category] = [];
    acc[resource.category].push(resource);
    return acc;
  }, {} as Record<string, typeof resources>);

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
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Inventory</h1>
            <p className="text-muted-foreground mt-1">Manage resources and assignments</p>
          </div>
          {isAdminOrCoordinator && (
            <div className="flex gap-2">
              <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Assign Resource
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Resource</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAssign} className="space-y-4">
                    <Select
                      value={assignment.resource_id}
                      onValueChange={(v) => setAssignment({ ...assignment, resource_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select resource" />
                      </SelectTrigger>
                      <SelectContent>
                        {resources.filter(r => r.available_quantity > 0).map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name} ({r.available_quantity} available)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={assignment.user_id}
                      onValueChange={(v) => setAssignment({ ...assignment, user_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.user_id}>
                            {m.first_name} {m.last_name} ({m.uid})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      value={assignment.quantity}
                      onChange={(e) => setAssignment({ ...assignment, quantity: parseInt(e.target.value) })}
                      placeholder="Quantity"
                    />
                    <Button type="submit" className="w-full" disabled={assignResource.isPending}>
                      {assignResource.isPending ? 'Assigning...' : 'Assign'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Resource
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Resource</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddResource} className="space-y-4">
                    <Input
                      placeholder="Resource Name"
                      value={newResource.name}
                      onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                      required
                    />
                    <Select
                      value={newResource.category}
                      onValueChange={(v) => setNewResource({ ...newResource, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Quantity"
                        value={newResource.total_quantity || ''}
                        onChange={(e) => setNewResource({ ...newResource, total_quantity: parseInt(e.target.value) || 0 })}
                        required
                      />
                      <Input
                        placeholder="Unit (e.g., pieces)"
                        value={newResource.unit}
                        onChange={(e) => setNewResource({ ...newResource, unit: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={createResource.isPending}>
                      {createResource.isPending ? 'Adding...' : 'Add Resource'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="assignments">Active Assignments</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-6">
            {Object.keys(groupedResources).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No resources in inventory. Add some to get started.
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupedResources).map(([category, items]) => (
                <div key={category} className="space-y-4">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    {category}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((resource) => (
                      <Card key={resource.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium text-foreground">{resource.name}</h3>
                              <p className="text-sm text-muted-foreground">{resource.unit}</p>
                            </div>
                            <Badge variant={resource.available_quantity > 0 ? 'success' : 'danger'}>
                              {resource.available_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                            </Badge>
                          </div>
                          <div className="mt-4 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Available</span>
                            <span className="font-medium">
                              {resource.available_quantity} / {resource.total_quantity}
                            </span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{
                                width: `${(resource.available_quantity / resource.total_quantity) * 100}%`,
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            {assignments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No active assignments
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <Card key={assignment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{assignment.resource?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Assigned to: {assignment.profile?.first_name} {assignment.profile?.last_name} ({assignment.profile?.uid})
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {assignment.quantity} • {new Date(assignment.assigned_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {isAdminOrCoordinator && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => returnResource.mutate(assignment.id)}
                            disabled={returnResource.isPending}
                          >
                            <Undo2 className="h-4 w-4 mr-2" />
                            Return
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
