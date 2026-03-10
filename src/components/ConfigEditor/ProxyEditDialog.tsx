import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ProxyConfig } from '@/shared/types';

interface ProxyEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: ProxyConfig | null;
  onSave: (data: ProxyConfig) => void;
  existingNames: Set<string>;
}

type ProxyType = ProxyConfig['type'];

function toNumberOrUndefined(v: unknown) {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export function ProxyEditDialog({ open, onOpenChange, initialData, onSave, existingNames }: ProxyEditDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<ProxyConfig>({
    name: '',
    type: 'tcp',
    localIP: '127.0.0.1',
    localPort: 80,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({ ...initialData });
      } else {
        // Create new default
        const base = 'proxy';
        let i = 1;
        let name = `${base}_${i}`;
        while (existingNames.has(name)) {
          i += 1;
          name = `${base}_${i}`;
        }
        setFormData({
          name,
          type: 'tcp',
          localIP: '127.0.0.1',
          localPort: 80,
          remotePort: 6000 + i,
        });
      }
      setError('');
    }
  }, [open, initialData, existingNames]);

  const handleSave = () => {
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setError(t('proxy.errorNameEmpty'));
      return;
    }
    // If renaming (or creating new), check for duplicates
    // Note: initialData.name is the original name.
    if (trimmedName !== initialData?.name && existingNames.has(trimmedName)) {
      setError(t('proxy.errorNameExists'));
      return;
    }

    onSave({ ...formData, name: trimmedName });
    onOpenChange(false);
  };

  const updateField = (patch: Partial<ProxyConfig>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const type = (formData.type || 'tcp') as ProxyType;
  const showRemotePort = type === 'tcp' || type === 'udp';
  const showDomains = type === 'http' || type === 'https';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? t('proxy.editTitle') : t('proxy.addTitle')}</DialogTitle>
          <DialogDescription>
            {t('proxy.editDesc')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              {t('proxy.name')}
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField({ name: e.target.value })}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              {t('proxy.type')}
            </Label>
            <Select value={type} onValueChange={(v) => updateField({ type: v as ProxyType })}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tcp">TCP</SelectItem>
                <SelectItem value="udp">UDP</SelectItem>
                <SelectItem value="http">HTTP</SelectItem>
                <SelectItem value="https">HTTPS</SelectItem>
                <SelectItem value="xtcp">XTCP</SelectItem>
                <SelectItem value="stcp">STCP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="localIP" className="text-right">
              {t('proxy.localIP')}
            </Label>
            <Input
              id="localIP"
              value={formData.localIP || ''}
              onChange={(e) => updateField({ localIP: e.target.value })}
              className="col-span-3"
              placeholder="127.0.0.1"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="localPort" className="text-right">
              {t('proxy.localPort')}
            </Label>
            <Input
              id="localPort"
              type="number"
              value={formData.localPort ?? ''}
              onChange={(e) => updateField({ localPort: toNumberOrUndefined(e.target.value) })}
              className="col-span-3"
              placeholder="80"
            />
          </div>

          {showRemotePort && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="remotePort" className="text-right">
                {t('proxy.remotePort')}
              </Label>
              <Input
                id="remotePort"
                type="number"
                value={formData.remotePort ?? ''}
                onChange={(e) => updateField({ remotePort: toNumberOrUndefined(e.target.value) })}
                className="col-span-3"
                placeholder="6000"
              />
            </div>
          )}

          {showDomains && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customDomains" className="text-right">
                  {t('proxy.customDomains')}
                </Label>
                <Input
                  id="customDomains"
                  value={(formData.customDomains || []).join(', ')}
                  onChange={(e) =>
                    updateField({
                      customDomains: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="col-span-3"
                  placeholder="a.com, b.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="subdomain" className="text-right">
                  {t('proxy.subdomain')}
                </Label>
                <Input
                  id="subdomain"
                  value={formData.subdomain || ''}
                  onChange={(e) => updateField({ subdomain: e.target.value || undefined })}
                  className="col-span-3"
                  placeholder="blog"
                />
              </div>
            </>
          )}
        </div>

        {error && <div className="text-sm text-red-500 mb-2 text-right">{error}</div>}

        <DialogFooter>
          <Button type="submit" onClick={handleSave}>{t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
