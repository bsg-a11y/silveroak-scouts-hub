import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search,
  Printer,
  Trash2,
  Package,
  Users,
  Receipt,
  Loader2,
  BoxIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { useCollectionDrives, CreateReceiptData } from '@/hooks/useCollectionDrives';
import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CollectionReceipt } from '@/components/CollectionReceipt';
import { useReactToPrint } from 'react-to-print';

const ITEM_TYPES = [
  'Stationery',
  'E-Waste',
  'Clothes',
  'Books',
  'Food Items',
  'Toys',
  'Electronics',
  'Furniture',
  'Other',
];

const UNITS = ['pieces', 'kg', 'bags', 'boxes', 'bundles', 'sets'];

export default function CollectionDrives() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDriveOpen, setIsAddDriveOpen] = useState(false);
  const [isAddReceiptOpen, setIsAddReceiptOpen] = useState(false);
  const [printReceipt, setPrintReceipt] = useState<typeof receipts[0] | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [driveForm, setDriveForm] = useState({ name: '', description: '', drive_date: '' });
  const [receiptForm, setReceiptForm] = useState<CreateReceiptData>({
    donor_type: 'internal',
    item_type: '',
    quantity: 1,
    unit: 'pieces',
  });

  const { drives, receipts, isLoading, createDrive, createReceipt, deleteReceipt } = useCollectionDrives();
  const { members } = useMembers();
  const { isAdminOrCoordinator } = useAuth();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printReceipt?.receipt_number || 'Receipt',
    onAfterPrint: () => setPrintReceipt(null),
  });

  const filteredReceipts = receipts.filter(receipt => {
    const searchLower = searchQuery.toLowerCase();
    const donorName = receipt.donor_type === 'internal'
      ? `${receipt.member?.first_name || ''} ${receipt.member?.last_name || ''}`.toLowerCase()
      : (receipt.donor_name || '').toLowerCase();
    
    return (
      receipt.receipt_number.toLowerCase().includes(searchLower) ||
      donorName.includes(searchLower) ||
      receipt.item_type.toLowerCase().includes(searchLower)
    );
  });

  const handleCreateDrive = async () => {
    if (!driveForm.name) {
      toast({ title: 'Drive name is required', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    const result = await createDrive(driveForm);
    setIsCreating(false);
    if (result.success) {
      setIsAddDriveOpen(false);
      setDriveForm({ name: '', description: '', drive_date: '' });
    }
  };

  const handleCreateReceipt = async () => {
    if (!receiptForm.item_type) {
      toast({ title: 'Item type is required', variant: 'destructive' });
      return;
    }
    if (receiptForm.donor_type === 'internal' && !receiptForm.member_id) {
      toast({ title: 'Please select a member', variant: 'destructive' });
      return;
    }
    if (receiptForm.donor_type === 'external' && !receiptForm.donor_name) {
      toast({ title: 'Donor name is required', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    const result = await createReceipt(receiptForm);
    setIsCreating(false);
    
    if (result.success && result.receipt) {
      // Find the full receipt with member data
      const fullReceipt = receipts.find(r => r.id === result.receipt.id) || {
        ...result.receipt,
        member: receiptForm.donor_type === 'internal' 
          ? members.find(m => m.user_id === receiptForm.member_id)
          : null,
        drive: drives.find(d => d.id === receiptForm.drive_id),
      };
      
      setIsAddReceiptOpen(false);
      setPrintReceipt(fullReceipt as typeof receipts[0]);
      setReceiptForm({
        donor_type: 'internal',
        item_type: '',
        quantity: 1,
        unit: 'pieces',
      });
    }
  };

  const selectedMember = members.find(m => m.user_id === receiptForm.member_id);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
              Collection Drives
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage collection drives and generate receipts
            </p>
          </div>
          {isAdminOrCoordinator && (
            <div className="flex gap-2">
              <Dialog open={isAddDriveOpen} onOpenChange={setIsAddDriveOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <BoxIcon className="h-4 w-4 mr-2" />
                    New Drive
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Drive</DialogTitle>
                    <DialogDescription>Add a new collection drive campaign</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Drive Name *</Label>
                      <Input
                        value={driveForm.name}
                        onChange={(e) => setDriveForm({ ...driveForm, name: e.target.value })}
                        placeholder="e.g., Stationery Collection Drive 2024"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={driveForm.description}
                        onChange={(e) => setDriveForm({ ...driveForm, description: e.target.value })}
                        placeholder="Brief description of the drive"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Drive Date</Label>
                      <Input
                        type="date"
                        value={driveForm.drive_date}
                        onChange={(e) => setDriveForm({ ...driveForm, drive_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDriveOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateDrive} disabled={isCreating}>
                      {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Drive'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog 
                open={isAddReceiptOpen} 
                onOpenChange={(open) => {
                  setIsAddReceiptOpen(open);
                  if (!open) {
                    setReceiptForm({
                      donor_type: 'internal',
                      item_type: '',
                      quantity: 1,
                      unit: 'pieces',
                    });
                  }
                }}
                modal={true}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Receipt
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Collection Receipt</DialogTitle>
                    <DialogDescription>Record a new donation/collection</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    {/* Drive Selection */}
                    <div className="space-y-2">
                      <Label>Collection Drive</Label>
                      <Select 
                        value={receiptForm.drive_id || ''} 
                        onValueChange={(v) => setReceiptForm({ ...receiptForm, drive_id: v || undefined })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select drive (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No specific drive</SelectItem>
                          {drives.map(drive => (
                            <SelectItem key={drive.id} value={drive.id}>{drive.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Donor Type */}
                    <div className="space-y-2">
                      <Label>Donor Type *</Label>
                      <Select 
                        value={receiptForm.donor_type} 
                        onValueChange={(v: 'internal' | 'external') => setReceiptForm({ 
                          ...receiptForm, 
                          donor_type: v,
                          member_id: undefined,
                          donor_name: undefined,
                          donor_college: undefined,
                          donor_whatsapp: undefined,
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">Internal Member</SelectItem>
                          <SelectItem value="external">External Donor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Internal Member Selection */}
                    {receiptForm.donor_type === 'internal' && (
                      <div className="space-y-2">
                        <Label>Select Member *</Label>
                        <Select 
                          value={receiptForm.member_id || ''} 
                          onValueChange={(v) => setReceiptForm({ ...receiptForm, member_id: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a member" />
                          </SelectTrigger>
                          <SelectContent>
                            {members.map(m => (
                              <SelectItem key={m.user_id} value={m.user_id}>
                                {m.uid} - {m.first_name} {m.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedMember && (
                          <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                            <p><span className="text-muted-foreground">UID:</span> {selectedMember.uid}</p>
                            <p><span className="text-muted-foreground">WhatsApp:</span> {selectedMember.whatsapp_number || '-'}</p>
                            <p><span className="text-muted-foreground">Department:</span> {selectedMember.academic_department || '-'}</p>
                            <p><span className="text-muted-foreground">College:</span> {selectedMember.college_name || '-'}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* External Donor Fields */}
                    {receiptForm.donor_type === 'external' && (
                      <>
                        <div className="space-y-2">
                          <Label>Donor Name *</Label>
                          <Input
                            value={receiptForm.donor_name || ''}
                            onChange={(e) => setReceiptForm({ ...receiptForm, donor_name: e.target.value })}
                            placeholder="Full name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>College/Company</Label>
                          <Input
                            value={receiptForm.donor_college || ''}
                            onChange={(e) => setReceiptForm({ ...receiptForm, donor_college: e.target.value })}
                            placeholder="Organization name (optional)"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>WhatsApp Number</Label>
                          <Input
                            value={receiptForm.donor_whatsapp || ''}
                            onChange={(e) => setReceiptForm({ ...receiptForm, donor_whatsapp: e.target.value })}
                            placeholder="10 digits"
                          />
                        </div>
                      </>
                    )}

                    {/* Item Details */}
                    <div className="border-t pt-4 space-y-4">
                      <Label className="text-base font-medium">Item Details</Label>
                      <div className="space-y-2">
                        <Label>Item Type *</Label>
                        <Select 
                          value={receiptForm.item_type} 
                          onValueChange={(v) => setReceiptForm({ ...receiptForm, item_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select item type" />
                          </SelectTrigger>
                          <SelectContent>
                            {ITEM_TYPES.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Quantity *</Label>
                          <Input
                            type="number"
                            min="1"
                            value={receiptForm.quantity}
                            onChange={(e) => setReceiptForm({ ...receiptForm, quantity: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Unit</Label>
                          <Select 
                            value={receiptForm.unit || 'pieces'} 
                            onValueChange={(v) => setReceiptForm({ ...receiptForm, unit: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNITS.map(unit => (
                                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Collection Date</Label>
                        <Input
                          type="date"
                          value={receiptForm.collection_date || new Date().toISOString().split('T')[0]}
                          onChange={(e) => setReceiptForm({ ...receiptForm, collection_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                          value={receiptForm.notes || ''}
                          onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
                          placeholder="Additional notes about the donation"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddReceiptOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateReceipt} disabled={isCreating}>
                      {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create & Print Receipt'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="stat">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <BoxIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Drives</p>
                <p className="text-2xl font-bold font-display">{drives.filter(d => d.status === 'active').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-bsg-green/10">
                <Receipt className="h-6 w-6 text-bsg-green" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Receipts</p>
                <p className="text-2xl font-bold font-display">{receipts.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Package className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Items Collected</p>
                <p className="text-2xl font-bold font-display">{receipts.reduce((sum, r) => sum + r.quantity, 0)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Receipts Table */}
        <Card>
          <CardHeader className="border-b border-border/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Collection Receipts</CardTitle>
                <CardDescription>{receipts.length} receipts generated</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search receipts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredReceipts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Receipt className="h-12 w-12 mb-4 opacity-50" />
                <p>No receipts found</p>
                {isAdminOrCoordinator && (
                  <Button variant="link" onClick={() => setIsAddReceiptOpen(true)}>
                    Create your first receipt
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Receipt No.</TableHead>
                      <TableHead>Donor</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceipts.map((receipt) => (
                      <TableRow key={receipt.id} className="hover:bg-muted/30">
                        <TableCell>
                          <code className="px-2 py-1 rounded bg-muted text-sm font-mono">
                            {receipt.receipt_number}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {receipt.donor_type === 'internal'
                                ? `${receipt.member?.first_name || ''} ${receipt.member?.last_name || ''}`
                                : receipt.donor_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {receipt.donor_type === 'internal' ? receipt.member?.uid : receipt.donor_college || 'External'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={receipt.donor_type === 'internal' ? 'member' : 'coordinator'}>
                            {receipt.donor_type === 'internal' ? 'Member' : 'External'}
                          </Badge>
                        </TableCell>
                        <TableCell>{receipt.item_type}</TableCell>
                        <TableCell>{receipt.quantity} {receipt.unit}</TableCell>
                        <TableCell>{format(new Date(receipt.collection_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setPrintReceipt(receipt)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            {isAdminOrCoordinator && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-destructive"
                                onClick={() => deleteReceipt(receipt.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Print Dialog */}
        <Dialog open={!!printReceipt} onOpenChange={(open) => !open && setPrintReceipt(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Print Receipt</DialogTitle>
              <DialogDescription>Preview and print the collection receipt</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4 bg-muted/30 rounded-lg overflow-auto max-h-[60vh]">
              {printReceipt && (
                <CollectionReceipt ref={printRef} data={printReceipt} />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPrintReceipt(null)}>Close</Button>
              <Button onClick={() => handlePrint()}>
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
