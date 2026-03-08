import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ServerProfile } from '@/shared/types';

interface ServerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: ServerProfile | null;
  onSave: (data: ServerProfile) => void;
}

function toNumberOrUndefined(v: unknown) {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export function ServerEditDialog({ open, onOpenChange, initialData, onSave }: ServerEditDialogProps) {
  const [formData, setFormData] = useState<ServerProfile>({
    id: '',
    name: '',
    serverAddr: '',
    serverPort: 7000,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({ ...initialData });
      } else {
        // Create new default
        setFormData({
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
          name: 'New Server',
          serverAddr: '',
          serverPort: 7000,
        });
      }
      setError('');
    }
  }, [open, initialData]);

  const handleSave = () => {
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setError('Profile Name cannot be empty');
      return;
    }
    const trimmedAddr = formData.serverAddr.trim();
    if (!trimmedAddr) {
        setError('Server Address cannot be empty');
        return;
    }

    onSave({ ...formData, name: trimmedName, serverAddr: trimmedAddr });
    onOpenChange(false);
  };

  const updateField = (patch: Partial<ServerProfile>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Server Profile' : 'Add Server Profile'}</DialogTitle>
          <DialogDescription>
            Configure server connection details. Click save when done.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Profile Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField({ name: e.target.value })}
              className="col-span-3"
              placeholder="e.g. Production Server"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="serverAddr" className="text-right">
              Server Addr
            </Label>
            <Input
              id="serverAddr"
              value={formData.serverAddr}
              onChange={(e) => updateField({ serverAddr: e.target.value })}
              className="col-span-3"
              placeholder="e.g. 1.2.3.4 or example.com"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="serverPort" className="text-right">
              Server Port
            </Label>
            <Input
              id="serverPort"
              type="number"
              value={formData.serverPort}
              onChange={(e) => updateField({ serverPort: toNumberOrUndefined(e.target.value) || 7000 })}
              className="col-span-3"
              placeholder="7000"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="token" className="text-right">
              Token
            </Label>
            <Input
              id="token"
              type="password"
              value={formData.token || ''}
              onChange={(e) => updateField({ token: e.target.value })}
              className="col-span-3"
              placeholder="Auth Token (Optional)"
            />
          </div>
        </div>

        {error && <div className="text-sm text-red-500 mb-2 text-right">{error}</div>}

        <DialogFooter>
          <Button type="submit" onClick={handleSave}>Save Profile</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
