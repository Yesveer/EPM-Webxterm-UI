'use client';
import { useState, useEffect } from 'react';
import { Camera, Mail, Lock, User, Loader2, Key, Copy, RotateCw, Eye, EyeOff } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/page-breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { copyToClipboard } from '@/lib/clipboard';
import { useToast } from '@/hooks/use-toast';
import { profileAPI, ProfileData } from '@/lib/profile-api';
import { communityAPI } from '@/lib/community-api';

export default function Profile() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [showAPIKey, setShowAPIKey] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (token) {
      loadProfile();
    }
  }, [token]);

  const loadProfile = async () => {
    if (!token) return;

    try {
      const data = await profileAPI.getProfile(token);
      setProfileData(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file",
        description: "Please upload a valid image file (JPEG, PNG, or WebP)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Image size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setLoading('avatar');
    try {
      // Upload image to backend
      const uploadResult = await communityAPI.uploadImage(token, file);

      // Update profile with the uploaded image URL
      await profileAPI.uploadAvatar(token, { avatar_url: uploadResult.url });

      await loadProfile();

      toast({
        title: "Avatar updated!",
        description: "Your profile picture has been changed.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleRegenerateAPIKey = async () => {
    if (!token) return;

    if (!confirm('Are you sure you want to regenerate your API key? The old key will no longer work.')) {
      return;
    }

    setLoading('api-key');
    try {
      const result = await profileAPI.regenerateAPIKey(token);

      if (profileData) {
        setProfileData({ ...profileData, api_key: result.api_key });
      }

      toast({
        title: "API Key regenerated!",
        description: "Your new API key is ready. Make sure to update it in your applications.",
      });
    } catch (error) {
      toast({
        title: "Failed",
        description: "Failed to regenerate API key",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleCopyAPIKey = async () => {
    if (profileData?.api_key) {
      if (!(await copyToClipboard(profileData.api_key))) {
        toast({
          title: "Could not copy",
          description: "Your browser blocked clipboard access — select the text and copy it manually.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Copied!",
        description: "API key copied to clipboard",
      });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast({
        title: "Validation Error",
        description: "Please enter your current password",
        variant: "destructive",
      });
      return;
    }

    if (!newPassword) {
      toast({
        title: "Validation Error",
        description: "Please enter a new password",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Weak password",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (!token) return;

    setLoading('password');
    try {
      await profileAPI.resetPassword(token, {
        current_password: currentPassword,
        new_password: newPassword,
      });

      toast({
        title: "Password changed!",
        description: "Your password has been updated successfully.",
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast({
        title: "Failed",
        description: error instanceof Error ? error.message : "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <Breadcrumb items={[{ label: 'Profile' }]} className="mb-6" />

      <div className="page-header mb-8">
        <h1 className="page-title">Profile Settings</h1>
        <p className="page-description">Manage your account settings and preferences</p>
      </div>

      {/* Avatar Section */}
      <Card className="glass-card mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Profile Picture</CardTitle>
          <CardDescription>Upload a new avatar for your profile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profileData?.avatar_url || user?.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                  {user?.username?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
              >
                {loading === 'avatar' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </label>
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={loading === 'avatar'}
              />
            </div>
            <div>
              <p className="font-medium">{profileData?.username || user?.username}</p>
              <p className="text-sm text-muted-foreground">{profileData?.email || user?.email}</p>
              <p className="text-xs text-muted-foreground mt-1">Max file size: 5MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Username (Read-only) */}
      <Card className="glass-card mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Username
          </CardTitle>
          <CardDescription>Your username cannot be changed</CardDescription>
        </CardHeader>
        <CardContent>
          <Input value={profileData?.username || user?.username || ''} disabled className="bg-muted" />
        </CardContent>
      </Card>

      <Card className="glass-card mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Email
          </CardTitle>
          <CardDescription>Your email can be changed</CardDescription>
        </CardHeader>
        <CardContent>
          <Input value={profileData?.email || user?.email || ''}  className="bg-muted" />
        </CardContent>
      </Card>

      {/* API Key Section */}
      <Card className="glass-card mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Key
          </CardTitle>
          <CardDescription>Use this key to authenticate agent connections</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">Your API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={showAPIKey ? 'text' : 'password'}
                  value={profileData?.api_key || user?.api_key || ''}
                  disabled
                  className="bg-muted pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowAPIKey(!showAPIKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAPIKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyAPIKey}
                title="Copy API Key"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button
            type="button"
            variant="destructive"
            onClick={handleRegenerateAPIKey}
            disabled={loading === 'api-key'}
          >
            {loading === 'api-key' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RotateCw className="w-4 h-4 mr-2" />
                Regenerate API Key
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Warning: Regenerating will invalidate your old API key. Update it in all your agents.
          </p>
        </CardContent>
      </Card>

      {/* Reset Password */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" disabled={loading === 'password'}>
              {loading === 'password' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
