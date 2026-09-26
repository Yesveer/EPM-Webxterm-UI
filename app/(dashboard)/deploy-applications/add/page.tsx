'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Globe,
  Loader2,
  Server,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { deploymentsAPI } from '@/lib/deployments-api';
import { machinesAPI, Machine } from '@/lib/machines-api';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/page-breadcrumb';

export default function AddDeploymentPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [machines, setMachines]             = useState<Machine[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [saving, setSaving]                 = useState(false);

  const [form, setForm] = useState({
    machine_id: '',
    name:       '',
    port:       '',
  });

  // Load online machines
  useEffect(() => {
    if (!token) return;
    machinesAPI.listMachines(token, { page: 1, limit: 100 })
      .then(r => setMachines(r.machines.filter(m => m.status === 'online' && m.deploy_application === true)))
      .catch(err => toast({ title: 'Failed to load machines', description: err.message, variant: 'destructive' }))
      .finally(() => setLoadingMachines(false));
  }, [token]);

  const handleDeploy = async () => {
    if (!token) return;
    if (!form.machine_id || !form.name || !form.port) {
      toast({ title: 'Fill in all fields', variant: 'destructive' });
      return;
    }
    const machine = machines.find(m => m.agent_id === form.machine_id);
    setSaving(true);
    try {
      const dep = await deploymentsAPI.create(token, {
        machine_id:   form.machine_id,
        machine_name: machine?.name || machine?.hostname || form.machine_id,
        name:         form.name,
        port:         parseInt(form.port, 10),
      });
      await deploymentsAPI.start(token, dep.id);
      toast({
        title: 'Deployment created!',
        description: `Your app will be live at ${dep.public_url} once the agent connects.`,
      });
      router.push('/deploy-applications');
    } catch (err: any) {
      toast({ title: 'Failed to create deployment', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 flex flex-col gap-6">
      <Breadcrumb items={[{ label: 'Deploy Applications', href: '/deploy-applications' }, { label: 'New Deployment' }]} />
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            New Deployment
          </CardTitle>
          <CardDescription>
            Expose a port on one of your machines to the internet. A unique public URL is generated automatically.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {/* Deployment Name */}
          <div className="flex flex-col gap-1.5">
            <Label>Deployment Name</Label>
            <Input
              placeholder="e.g. My React App"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Machine Select */}
          <div className="flex flex-col gap-1.5">
            <Label>Machine</Label>
            {loadingMachines ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading machines…
              </div>
            ) : machines.length === 0 ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <Server className="w-4 h-4 mt-0.5 shrink-0" />
                No machines found. Make sure the machine is online and has "Deploy Application" enabled.
              </div>
            ) : (
              <Select
                value={form.machine_id}
                onValueChange={v => setForm(f => ({ ...f, machine_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a machine" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map(m => (
                    <SelectItem key={m.agent_id} value={m.agent_id}>
                      {m.name || m.hostname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Port */}
          <div className="flex flex-col gap-1.5">
            <Label>Port</Label>
            <Input
              type="number"
              placeholder="e.g. 3000"
              min={1}
              max={65535}
              value={form.port}
              onChange={e => setForm(f => ({ ...f, port: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              The port your application is listening on inside the machine.
            </p>
          </div>
        </CardContent>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 pb-6">
          <Button variant="outline" asChild>
            <Link href="/deploy-applications">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Link>
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={saving || machines.length === 0 || loadingMachines}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deploying…
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 mr-2" />
                Deploy
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
