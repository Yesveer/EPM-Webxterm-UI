'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, ChevronDown, User, Clock, Monitor, Globe, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { auditAPI, AuditLog, TenantOption } from '@/lib/audit-api';
import { Breadcrumb } from '@/components/ui/page-breadcrumb';
import { cn } from '@/lib/utils';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function statusColor(status: number) {
  if (status >= 500) return 'text-red-500';
  if (status >= 400) return 'text-orange-500';
  if (status >= 200 && status < 300) return 'text-green-500';
  return 'text-muted-foreground';
}

function methodColor(method: string) {
  switch (method) {
    case 'GET': return 'bg-blue-500/10 text-blue-500';
    case 'POST': return 'bg-green-500/10 text-green-500';
    case 'PUT':
    case 'PATCH': return 'bg-yellow-500/10 text-yellow-500';
    case 'DELETE': return 'bg-red-500/10 text-red-500';
    default: return 'bg-muted text-muted-foreground';
  }
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AuditLogsPage() {
  const { user, token } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Super admin: tenant list + selected tenant
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);

  // Client-side search on current page
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async (p: number, ps: number, tenantId?: string) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await auditAPI.getLogs(token, {
        tenantId: tenantId || undefined,
        page: p,
        limit: ps,
      });
      setLogs(res.logs ?? []);
      setTotal(res.total ?? 0);
      setTotalPages(res.total_pages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load tenants for super admin
  useEffect(() => {
    if (!isSuperAdmin || !token) return;
    setTenantsLoading(true);
    auditAPI.getTenants(token)
      .then(res => setTenants(res.tenants ?? []))
      .catch(() => {})
      .finally(() => setTenantsLoading(false));
  }, [isSuperAdmin, token]);

  // Fetch when page, pageSize, or selectedTenant changes
  useEffect(() => {
    fetchLogs(page, pageSize, isSuperAdmin ? selectedTenant || undefined : undefined);
  }, [fetchLogs, page, pageSize, isSuperAdmin, selectedTenant]);

  const handleTenantChange = (tenantId: string) => {
    setSelectedTenant(tenantId);
    setPage(1);
    setTenantDropdownOpen(false);
    setTenantSearch('');
  };

  const handlePageSizeChange = (ps: number) => {
    setPageSize(ps);
    setPage(1);
  };

  const filteredTenants = tenants.filter(t =>
    t.tenant_name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
    t.tenant_id.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  const selectedTenantName = tenants.find(t => t.tenant_id === selectedTenant)?.tenant_name;

  // Client-side filter on current page
  const filteredLogs = logs.filter(log => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.username?.toLowerCase().includes(q) ||
      log.action?.toLowerCase().includes(q) ||
      log.endpoint?.toLowerCase().includes(q) ||
      log.ip_address?.toLowerCase().includes(q) ||
      log.tenant_id?.toLowerCase().includes(q)
    );
  });

  // Pagination helpers
  const startEntry = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endEntry = Math.min(page * pageSize, total);

  const pageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, -1, totalPages];
    if (page >= totalPages - 3) return [1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, -1, page - 1, page, page + 1, -2, totalPages];
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Audit Logs' }]} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isSuperAdmin ? 'View activity across all tenants' : `Activity in ${user?.tenant_name}`}
          </p>
        </div>
        <button
          onClick={() => fetchLogs(page, pageSize, isSuperAdmin ? selectedTenant || undefined : undefined)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-sm"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Tenant picker — super admin only */}
        {isSuperAdmin && (
          <div className="relative">
            <button
              onClick={() => setTenantDropdownOpen(o => !o)}
              className="flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-background hover:bg-accent transition-colors text-sm min-w-[200px] justify-between"
            >
              <span className="truncate">
                {tenantsLoading ? 'Loading tenants...' : (selectedTenantName ?? 'All tenants')}
              </span>
              <ChevronDown className={cn('w-4 h-4 shrink-0 transition-transform', tenantDropdownOpen && 'rotate-180')} />
            </button>

            {tenantDropdownOpen && (
              <div className="absolute z-50 mt-1 w-72 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search tenants..."
                      value={tenantSearch}
                      onChange={e => setTenantSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/50 rounded-lg outline-none"
                    />
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {tenantsLoading ? (
                    <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleTenantChange('')}
                        className={cn(
                          'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors',
                          !selectedTenant && 'bg-primary/10 text-primary font-medium'
                        )}
                      >
                        All tenants
                      </button>
                      {filteredTenants.map(t => (
                        <button
                          key={t.tenant_id}
                          onClick={() => handleTenantChange(t.tenant_id)}
                          className={cn(
                            'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors',
                            selectedTenant === t.tenant_id && 'bg-primary/10 text-primary font-medium'
                          )}
                        >
                          <p className="font-medium">{t.tenant_name}</p>
                          <p className="text-xs text-muted-foreground">{t.tenant_id}</p>
                        </button>
                      ))}
                      {filteredTenants.length === 0 && (
                        <p className="px-3 py-4 text-sm text-muted-foreground text-center">No tenants found</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by user, action, endpoint, IP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Rows per page */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
          <span>Rows:</span>
          <select
            value={pageSize}
            onChange={e => handlePageSizeChange(Number(e.target.value))}
            className="h-10 px-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Log table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {error && (
          <div className="flex items-center gap-2 p-4 text-sm text-destructive bg-destructive/10 border-b border-border">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardList className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Time</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">User</th>
                  {isSuperAdmin && (
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tenant</th>
                  )}
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Method</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Endpoint</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">IP</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        {formatTime(log.timestamp)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="font-medium">{log.username || '—'}</span>
                      </div>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {log.tenant_id}
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {log.action || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn('px-2 py-0.5 rounded text-xs font-mono font-semibold', methodColor(log.method))}>
                        {log.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[240px]">
                      <span className="font-mono text-xs truncate block" title={log.endpoint}>
                        {log.endpoint}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn('font-mono text-xs font-semibold', statusColor(log.response_status))}>
                        {log.response_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground font-mono">
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3 shrink-0" />
                        {log.ip_address}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Monitor className="w-3 h-3 shrink-0" />
                        {log.source || 'ui'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {!loading && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border text-sm text-muted-foreground">
            <span className="text-xs">
              {startEntry}–{endEntry} of {total} entries
            </span>
            <div className="flex items-center gap-1">
              {/* First */}
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="First page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              {/* Prev */}
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page pills */}
              {pageNumbers().map((n, i) =>
                n < 0 ? (
                  <span key={`ellipsis-${i}`} className="px-1">…</span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={cn(
                      'min-w-[32px] h-8 px-2 rounded text-xs font-medium transition-colors',
                      page === n
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    )}
                  >
                    {n}
                  </button>
                )
              )}

              {/* Next */}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {/* Last */}
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Last page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Close tenant dropdown on outside click */}
      {tenantDropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setTenantDropdownOpen(false)} />
      )}
    </div>
  );
}

function ClipboardList({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
    </svg>
  );
}
