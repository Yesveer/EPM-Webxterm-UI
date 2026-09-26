'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Building2, ChevronRight, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI, TenantInfo } from '@/lib/auth-api';
import { useToast } from '@/hooks/use-toast';

type Step = 'processing' | 'tenant-select' | 'error';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('processing');
  const [errorMsg, setErrorMsg] = useState('');
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [sessionToken, setSessionToken] = useState('');
  const [selectingTenant, setSelectingTenant] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const userB64 = searchParams.get('user');
    const sessionTok = searchParams.get('session_token');
    const tenantsB64 = searchParams.get('tenants');
    const requiresSelection = searchParams.get('requires_selection');
    const error = searchParams.get('error');

    if (error) {
      setErrorMsg(decodeURIComponent(error));
      setStep('error');
      return;
    }

    // Single tenant — token + user already provided
    if (token && userB64 && sessionTok) {
      try {
        const user = JSON.parse(atob(userB64.replace(/-/g, '+').replace(/_/g, '/')));
        const tenantList: TenantInfo[] = tenantsB64
          ? JSON.parse(atob(tenantsB64.replace(/-/g, '+').replace(/_/g, '/')))
          : [];
        login(token, user, sessionTok, tenantList);
        // Use hard redirect so the new page re-reads from localStorage (already
        // written synchronously by login()). Client-side navigation can race
        // with React state updates and land on dashboard before isAuthenticated is true.
        window.location.replace('/dashboard');
      } catch {
        setErrorMsg('Failed to process authentication response. Please try again.');
        setStep('error');
      }
      return;
    }

    // Multiple tenants — show workspace picker
    if (requiresSelection === 'true' && sessionTok && tenantsB64) {
      try {
        const tenantList: TenantInfo[] = JSON.parse(
          atob(tenantsB64.replace(/-/g, '+').replace(/_/g, '/'))
        );
        setTenants(tenantList);
        setSessionToken(sessionTok);
        setStep('tenant-select');
      } catch {
        setErrorMsg('Failed to load workspace list. Please try again.');
        setStep('error');
      }
      return;
    }

    setErrorMsg('Invalid authentication response. Please try again.');
    setStep('error');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTenantSelect = async (tenantId: string) => {
    setSelectingTenant(tenantId);
    try {
      const result = await authAPI.selectTenant({ session_token: sessionToken, tenant_id: tenantId });

      if ('requires_otp' in result && result.requires_otp) {
        router.push(`/verify-otp?username=${encodeURIComponent(result.username)}&expires_in=${result.otp_expires_in_min}`);
        return;
      }

      if ('token' in result && 'user' in result) {
        login(result.token, result.user, result.session_token, result.available_tenants);
        window.location.replace('/dashboard');
      }
    } catch (err) {
      toast({
        title: 'Workspace selection failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSelectingTenant(null);
    }
  };

  if (step === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Completing sign in...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Authentication Failed</h2>
          <p className="text-muted-foreground mb-6">{errorMsg}</p>
          <button
            onClick={() => router.push('/login')}
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            ← Back to login
          </button>
        </div>
      </div>
    );
  }

  // Tenant selection step
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">Select Workspace</h2>
          <p className="text-muted-foreground mt-2">
            Your account has access to multiple workspaces. Choose one to continue.
          </p>
        </div>

        <div className="space-y-3">
          {tenants.map((tenant) => (
            <button
              key={tenant.tenant_id}
              onClick={() => handleTenantSelect(tenant.tenant_id)}
              disabled={selectingTenant !== null}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group disabled:opacity-60"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{tenant.tenant_name}</p>
                <p className="text-sm text-muted-foreground truncate">@{tenant.username}</p>
              </div>
              {selectingTenant === tenant.tenant_id ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => router.push('/login')}
          className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to login
        </button>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
