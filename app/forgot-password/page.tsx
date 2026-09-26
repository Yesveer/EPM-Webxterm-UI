'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { BrandMark } from '@/components/BrandMark';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: "Reset link sent!",
      description: "Check your email for password reset instructions.",
    });
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <BrandMark
            iconBoxClassName="w-10 h-10 rounded-xl bg-primary text-primary-foreground"
            iconClassName="w-6 h-6"
            logoSizeClassName="w-10 h-10"
            textClassName="text-5xl font-extrabold tracking-tight"
          />
        </div>

        <div className="glass-card rounded-2xl p-8">
          {!sent ? (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold">Forgot password?</h2>
                <p className="text-muted-foreground mt-2">
                  No worries, we'll send you reset instructions.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 text-base font-medium" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Reset password'
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Check your email</h2>
              <p className="text-muted-foreground mb-6">
                We've sent a password reset link to<br />
                <span className="text-foreground font-medium">{email}</span>
              </p>
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => setSent(false)}
              >
                Didn't receive the email? Click to resend
              </Button>
            </div>
          )}

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 mt-6 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
