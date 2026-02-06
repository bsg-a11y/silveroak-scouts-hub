import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Sheet,
  Table2,
  RefreshCw,
  ExternalLink,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useGoogleSheetsSync } from '@/hooks/useGoogleSheetsSync';
import { format } from 'date-fns';

export function GoogleSheetsIntegration() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sheetName, setSheetName] = useState('BSG Members');
  const { settings, isLoading, isSyncing, createAndSync, syncNow, disableSync } = useGoogleSheetsSync();

  const handleCreate = async () => {
    const result = await createAndSync(sheetName);
    if (result.success && result.spreadsheetUrl) {
      window.open(result.spreadsheetUrl, '_blank');
    }
    setIsDialogOpen(false);
  };

  const handleSync = async () => {
    await syncNow();
  };

  const handleDisable = async () => {
    await disableSync();
  };

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  // If already connected
  if (settings?.is_enabled && settings?.sheet_id) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sync to Sheet
        </Button>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Table2 className="h-4 w-4 mr-2" />
              Sheet Settings
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sheet className="h-5 w-5 text-primary" />
                Google Sheets Connected
              </DialogTitle>
              <DialogDescription>
                Your members list is linked to Google Sheets
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge variant="secondary" className="text-primary">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sheet Name</span>
                <span className="text-sm text-muted-foreground">{settings.sheet_name}</span>
              </div>
              
              {settings.last_synced_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Synced</span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(settings.last_synced_at), 'dd MMM yyyy, hh:mm a')}
                  </span>
                </div>
              )}
              
              <div className="pt-2 space-y-2">
                {settings.sheet_url && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(settings.sheet_url!, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Google Sheet
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync Now
                </Button>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="destructive" size="sm" onClick={handleDisable} disabled={isSyncing}>
                <XCircle className="h-4 w-4 mr-2" />
                Disable Sync
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Not connected - show setup dialog
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sheet className="h-4 w-4 mr-2" />
          Link to Google Sheets
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sheet className="h-5 w-5 text-primary" />
            Link Members to Google Sheets
          </DialogTitle>
          <DialogDescription>
            Create a Google Sheet that will automatically sync with your members list.
            New members will be added to the sheet automatically.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sheet-name">Spreadsheet Name</Label>
            <Input
              id="sheet-name"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="BSG Members"
            />
          </div>
          
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <p className="font-medium mb-1">What will be synced:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>All member details (Name, UID, Contact, College, etc.)</li>
              <li>Automatically updates when you click "Sync"</li>
              <li>New sheet will be created in the service account</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isSyncing}>
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sheet className="h-4 w-4 mr-2" />
            )}
            Create & Sync
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}