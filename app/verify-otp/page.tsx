'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { authAPI } from '@/lib/auth-api';
import { useAuth } from '@/contexts/AuthContext';

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: authLogin } = useAuth();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get username from URL params
  const username = searchParams.get('username');
  const expiresIn = searchParams.get('expires_in');

  useEffect(() => {
    if (!username) {
      router.push('/login');
      return;
    }

    // Set initial timer from expires_in param
    if (expiresIn) {
      setTimeLeft(parseInt(expiresIn) * 60);
    }

    // Focus first input
    inputRefs.current[0]?.focus();
  }, [username, expiresIn, router]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('OTP has expired. Please login again.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === 5 && newOtp.every(digit => digit !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();

    if (!/^\d{6}$/.test(pastedData)) {
      setError('Please paste a valid 6-digit OTP');
      return;
    }

    const newOtp = pastedData.split('');
    setOtp(newOtp);
    inputRefs.current[5]?.focus();

    // Auto-submit
    handleVerifyOtp(pastedData);
  };

  const handleVerifyOtp = async (otpCode: string) => {
    if (!username) return;
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.verifyOTP({
        username,
        otp_code: otpCode,
      });

      // Login successful
      authLogin(response.token, response.user, response.session_token, response.available_tenants);
      window.location.replace('/dashboard');
    } catch (err) {
      console.error('OTP verification error:', err);
      setError(err instanceof Error ? err.message : 'Invalid or expired OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerifyOtp(otp.join(''));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!username) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-md border-gray-700 bg-gray-800/50 backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
            <ShieldCheck className="h-8 w-8 text-blue-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Verify OTP</CardTitle>
          <CardDescription className="text-gray-400">
            Enter the 6-digit code sent to your email
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label className="text-gray-300">Enter OTP</Label>
              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isLoading || timeLeft === 0}
                    className="w-12 h-12 text-center text-xl font-bold bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                  />
                ))}
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-400">
                Time remaining:{' '}
                <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-blue-500'}`}>
                  {formatTime(timeLeft)}
                </span>
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading || otp.some(d => d === '') || timeLeft === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify OTP'
              )}
            </Button>
          </CardContent>
        </form>
        <CardFooter className="flex flex-col space-y-2">
          <Link
            href="/login"
            className="flex items-center justify-center text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}
