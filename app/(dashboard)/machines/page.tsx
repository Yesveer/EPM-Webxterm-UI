'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Monitor,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  RefreshCw,
//   KeyRound,
//   Clock,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/page-breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
// } from '@/components/ui/dialog';
// import {
//   Command,
//   CommandEmpty,
//   CommandGroup,
//   CommandInput,
//   CommandItem,
//   CommandList,
// } from '@/components/ui/command';
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { machinesAPI, Machine } from '@/lib/machines-api';
// import { accessRequestsAPI, AccessRequest, formatDuration } from '@/lib/access-requests-api';
import { useToast } from '@/hooks/use-toast';

// const DURATION_PRESETS = [
//   { label: 'No Expiry', hours: 0 },
//   { label: '1h', hours: 1 },
//   { label: '6h', hours: 6 },
//   { label: '12h', hours: 12 },
//   { label: '1d', hours: 24 },
//   { label: '3d', hours: 72 },
//   { label: '7d', hours: 168 },
//   { label: '30d', hours: 720 },
// ];

export default function Machines() {
  const router = useRouter();
  const { token, user } = useAuth();
  const canAddMachine = user?.role === 'company_admin' || user?.role === 'super_admin';
  const { toast } = useToast();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const itemsPerPage = 10;

//   // Access request state
//   const [myRequests, setMyRequests] = useState<AccessRequest[]>([]);
//   const [requestModalOpen, setRequestModalOpen] = useState(false);
//   const [allMachinesForSelect, setAllMachinesForSelect] = useState<Machine[]>([]);
//   const [machineComboOpen, setMachineComboOpen] = useState(false);
//   const [machineSearch, setMachineSearch] = useState('');
//   const [selectedMachineForRequest, setSelectedMachineForRequest] = useState<Machine | null>(null);
//   const [durationHours, setDurationHours] = useState(24);
//   const [customDuration, setCustomDuration] = useState('');
//   const [useCustomDuration, setUseCustomDuration] = useState(false);
//   const [requestNote, setRequestNote] = useState('');
//   const [submittingRequest, setSubmittingRequest] = useState(false);

  const loadMachines = async (page = currentPage, searchTerm = search) => {
    if (!token) return;

    try {
      const data = await machinesAPI.listMachines(token, { page, limit: itemsPerPage, search: searchTerm || undefined });
      setMachines(data.machines || []);
      setTotal(data.total ?? 0);
      setTotalPages(data.total_pages ?? 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load machines:', error);
      setMachines([]);
      toast({
        title: "Error",
        description: "Failed to load machines",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

//   const loadMyRequests = async () => {
//     if (!token) return;
//     try {
//       const data = await accessRequestsAPI.getMy(token);
//       setMyRequests(data.requests || []);
//     } catch {
//       // non-fatal
//     }
//   };
//
//   const loadAllMachinesForSelect = async () => {
//     if (!token) return;
//     try {
//       const data = await machinesAPI.listMachines(token, { limit: 200, forRequest: true });
//       setAllMachinesForSelect(data.machines || []);
//     } catch {
//       // non-fatal
//     }
//   };

  useEffect(() => {
    loadMachines(1, '');
//     loadMyRequests();
    const interval = setInterval(() => {
      loadMachines(currentPage, search);
//       loadMyRequests();
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMachines(1, search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const toggleSelectAll = () => {
    if (selectedMachines.length === machines.length) {
      setSelectedMachines([]);
    } else {
      setSelectedMachines(machines.map(m => m.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedMachines(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (status: Machine['status']) => {
    const variants: Record<Machine['status'], string> = {
      online:            'bg-success/10 text-success border-success/20',
      offline:           'bg-destructive/10 text-destructive border-destructive/20',
      pending:           'bg-warning/10 text-warning border-warning/20',
      executing_script:  'bg-blue-500/10 text-blue-500 border-blue-500/20',
    };
    const labels: Record<Machine['status'], string> = {
      online:           'Online',
      offline:          'Offline',
      pending:          'Pending',
      executing_script: 'Running Script…',
    };

    return (
      <Badge variant="outline" className={cn(variants[status])}>
        {status === 'executing_script' && (
          <span className="mr-1.5 inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        )}
        {labels[status]}
      </Badge>
    );
  };

  const formatLastActive = (lastActive: string) => {
    const date = new Date(lastActive);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

//   // Pending requests for machines NOT in user's own list
//   const pendingRequests = myRequests.filter(r => r.status === 'pending');
//   const ownedOrSharedMachineIds = new Set(machines.map(m => m.id));
//   const pendingMachinesNotInList = pendingRequests.filter(
//     r => !ownedOrSharedMachineIds.has(r.machine_id)
//   );
//
//   const filteredMachinesForSelect = allMachinesForSelect.filter(m => {
//     if (m.owner_id === user?.id) return false; // skip own machines
//     if (m.allowed_users?.includes(user?.username ?? '')) return false; // already have access
//     const alreadyPending = myRequests.some(r => r.machine_id === m.id && r.status === 'pending');
//     if (alreadyPending) return false;
//     if (machineSearch) {
//       return m.name.toLowerCase().includes(machineSearch.toLowerCase()) ||
//              (m.description || '').toLowerCase().includes(machineSearch.toLowerCase());
//     }
//     return true;
//   });
//
//   const effectiveDurationHours = useCustomDuration ? (parseInt(customDuration) || 0) : durationHours;
//
//   const handleOpenRequestModal = async () => {
//     setSelectedMachineForRequest(null);
//     setMachineSearch('');
//     setDurationHours(24);
//     setCustomDuration('');
//     setUseCustomDuration(false);
//     setRequestNote('');
//     setRequestModalOpen(true);
//     await loadAllMachinesForSelect();
//   };
//
//   const handleSubmitRequest = async () => {
//     if (!token || !selectedMachineForRequest) return;
//     if (effectiveDurationHours < 0 || effectiveDurationHours > 8760) {
//       toast({ title: "Invalid duration", description: "Duration must be 0 (no expiration) or between 1 and 8760 hours", variant: "destructive" });
//       return;
//     }
//     if (useCustomDuration && effectiveDurationHours === 0) {
//       toast({ title: "Invalid duration", description: "Enter a positive number of hours, or choose 'No Expiry'", variant: "destructive" });
//       return;
//     }
//
//     setSubmittingRequest(true);
//     try {
//       await accessRequestsAPI.create(token, selectedMachineForRequest.id, effectiveDurationHours, requestNote);
//       toast({ title: "Request sent", description: `Access request for "${selectedMachineForRequest.name}" has been submitted.` });
//       setRequestModalOpen(false);
//       await loadMyRequests();
//     } catch (err: unknown) {
//       const msg = err instanceof Error ? err.message : 'Failed to submit request';
//       toast({ title: "Error", description: msg, variant: "destructive" });
//     } finally {
//       setSubmittingRequest(false);
//     }
//   };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <Breadcrumb items={[{ label: 'Machines' }]} className="mb-6" />
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Breadcrumb items={[{ label: 'Machines' }]} className="mb-6" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="w-6 h-6 text-primary" />
            Machines
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and monitor your connected servers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadMachines(currentPage, search)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {/* EPM: Access Requests disabled — re-enable later
          <Button variant="outline" size="sm" onClick={handleOpenRequestModal}>
            <KeyRound className="w-4 h-4 mr-2" />
            Request Access
          </Button>
          */}
          {canAddMachine && (
            <Button size="sm" asChild>
              <Link href="/machines/add">
                <Plus className="w-4 h-4 mr-2" />
                Add Machine
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card className="glass-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search machines..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <span>{total} {total === 1 ? 'machine' : 'machines'}</span>
            </div>
          </div>
        </div>

        {machines.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Monitor className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No machines found</h3>
            <p className="text-muted-foreground mb-4">
              {search ? 'Try adjusting your search' : 'Get started by adding your first machine'}
            </p>
            {!search && canAddMachine && (
              <Link href="/machines/add">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Machine
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <button onClick={toggleSelectAll} className="p-1 hover:bg-accent rounded">
                      {selectedMachines.length === machines.length && machines.length > 0 ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Operating System</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machines.map((machine) => (
                  <TableRow
                    key={machine.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => router.push(`/machines/details/${machine.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleSelect(machine.id)}
                        className="p-1 hover:bg-accent rounded"
                      >
                        {selectedMachines.includes(machine.id) ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{machine.name}</div>
                        <div className="text-sm text-muted-foreground">{machine.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{machine.os}</span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(machine.status)}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{machine.ip_address}</code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatLastActive(machine.last_active)}
                    </TableCell>
                  </TableRow>
                ))}

                {/* EPM: Access Requests disabled — re-enable later — pending access-request rows */}
                {/* EPM: Access Requests disabled — re-enable later
                {pendingMachinesNotInList.map((req) => (
                  <TableRow key={`pending-${req.id}`} className="opacity-70">
                    <TableCell>
                      <div className="p-1">
                        <Square className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{req.machine_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Requested {formatDuration(req.duration_hours)} access
                          {req.request_note && ` · "${req.request_note}"`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                        Pending Approval
                      </Badge>
                    </TableCell>
                    <TableCell>—</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(req.requested_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
                */}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} machines
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage === 1}
                    onClick={() => loadMachines(currentPage - 1, search)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                    <Button
                      key={p}
                      variant={currentPage === p ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => loadMachines(p, search)}
                    >
                      {p}
                    </Button>
                  ))}
                  {totalPages > 5 && <span className="text-muted-foreground text-sm">...</span>}
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage === totalPages}
                    onClick={() => loadMachines(currentPage + 1, search)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* EPM: Access Requests disabled — re-enable later — Request Access modal */}
      {/* EPM: Access Requests disabled — re-enable later
      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Request Machine Access
            </DialogTitle>
            <DialogDescription>
              Select a machine and specify how long you need access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
          */}
            {/* Machine selector — combobox */}
            {/* EPM: Access Requests disabled — re-enable later
            <div className="space-y-2">
              <Label>Select Machine</Label>
              <Popover open={machineComboOpen} onOpenChange={setMachineComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={machineComboOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedMachineForRequest
                      ? <span className="flex items-center gap-2"><Monitor className="w-4 h-4 text-primary" />{selectedMachineForRequest.name}</span>
                      : <span className="text-muted-foreground">Search machines…</span>
                    }
                    <ChevronRight className={cn('w-4 h-4 ml-2 shrink-0 opacity-50 transition-transform', machineComboOpen && 'rotate-90')} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Type machine name…"
                      value={machineSearch}
                      onValueChange={setMachineSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No machines found.</CommandEmpty>
                      <CommandGroup>
                        {filteredMachinesForSelect.map(m => (
                          <CommandItem
                            key={m.id}
                            value={m.name}
                            onSelect={() => {
                              setSelectedMachineForRequest(m);
                              setMachineComboOpen(false);
                              setMachineSearch('');
                            }}
                          >
                            <Monitor className="w-4 h-4 mr-2 shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{m.name}</div>
                              {m.description && (
                                <div className="text-xs text-muted-foreground truncate">{m.description}</div>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

*/}
            {/* Duration picker */}
            {/* EPM: Access Requests disabled — re-enable later
            <div className="space-y-2">
              <Label>Access Duration</Label>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map(p => (
                  <button
                    key={p.hours}
                    onClick={() => { setDurationHours(p.hours); setUseCustomDuration(false); }}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
                      !useCustomDuration && durationHours === p.hours
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-accent'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  onClick={() => setUseCustomDuration(true)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
                    useCustomDuration
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-accent'
                  )}
                >
                  Custom
                </button>
              </div>
              {useCustomDuration && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={720}
                    placeholder="Hours (1–720)"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    className="w-40"
                  />
                  <span className="text-sm text-muted-foreground">hours</span>
                  {parseInt(customDuration) > 0 && (
                    <span className="text-sm text-muted-foreground">
                      ({formatDuration(parseInt(customDuration))})
                    </span>
                  )}
                </div>
              )}
            </div>

*/}
            {/* Optional note */}
            {/* EPM: Access Requests disabled — re-enable later
            <div className="space-y-2">
              <Label>
                Note <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                placeholder="Reason for access request..."
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRequestModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitRequest}
                disabled={!selectedMachineForRequest || (useCustomDuration && effectiveDurationHours <= 0) || submittingRequest}
              >
                {submittingRequest ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4 mr-2" />
                )}
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      */}
    </div>
  );
}
