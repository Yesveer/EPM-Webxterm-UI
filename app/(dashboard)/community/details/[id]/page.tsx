'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  MessageCircle,
  ThumbsUp,
  Send,
  Pencil,
  Image,
  Upload
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/page-breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { communityAPI, Issue as APIIssue, Fix as APIFix } from '@/lib/community-api';

export default function CommunityDetails() {
  const { id } = useParams();
  const [issue, setIssue] = useState<APIIssue | null>(null);
  const [fixes, setFixes] = useState<APIFix[]>([]);
  const [newFix, setNewFix] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      loadIssueData();
    }
  }, [id]);

  const loadIssueData = async () => {
    try {
      const token = localStorage.getItem('vsay-token');
      if (!token) return;

      const [issueData, fixesData] = await Promise.all([
        communityAPI.getIssueById(token, id as string),
        communityAPI.getFixesByIssue(token, id as string),
      ]);

      setIssue(issueData.issue);
      setFixes(fixesData.fixes || []);
    } catch (error) {
      console.error('Failed to load issue:', error);
      toast({
        title: 'Error',
        description: 'Failed to load issue details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setImageFiles([...imageFiles, ...Array.from(files)]);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = diff / 1000;

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
  };

  const getStatusBadge = (status: string) => {
    const config = {
      open: { icon: AlertCircle, className: 'bg-warning/10 text-warning border-warning/20', label: 'Open' },
      closed: { icon: CheckCircle, className: 'bg-success/10 text-success border-success/20', label: 'Closed' },
      in_progress: { icon: Clock, className: 'bg-primary/10 text-primary border-primary/20', label: 'In Progress' },
    } as const;
    const config_item = config[status as keyof typeof config];
    if (!config_item) return null;
    const { icon: Icon, className, label } = config_item;
    return (
      <Badge variant="outline" className={cn("gap-1", className)}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const handleSubmitFix = async () => {
    if (!newFix.trim()) {
      toast({
        title: "Empty response",
        description: "Please write your fix or comment before submitting",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('vsay-token');
      if (!token) return;

      // Upload images if any
      let uploadedImageUrls: string[] = [];
      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          const result = await communityAPI.uploadImage(token, file);
          uploadedImageUrls.push(result.url);
        }
      }

      // Create fix
      await communityAPI.createFix(token, id as string, {
        content: newFix,
        images: uploadedImageUrls,
      });

      toast({
        title: "Fix submitted!",
        description: "Your solution has been posted.",
      });

      setNewFix('');
      setImageFiles([]);
      loadIssueData(); // Reload to show new fix
    } catch (error) {
      console.error('Failed to submit fix:', error);
      toast({
        title: "Error",
        description: "Failed to submit fix. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeFix = async (fixId: string) => {
    try {
      const token = localStorage.getItem('vsay-token');
      if (!token) return;

      await communityAPI.likeFix(token, id as string, fixId);
      loadIssueData(); // Reload to show updated likes
    } catch (error) {
      console.error('Failed to like fix:', error);
    }
  };

  const handleMarkAsAccepted = async (fixId: string) => {
    try {
      const token = localStorage.getItem('vsay-token');
      if (!token) return;

      await communityAPI.markFixAsAccepted(token, id as string, fixId);
      toast({
        title: "Success",
        description: "Fix marked as accepted solution",
      });
      loadIssueData(); // Reload to show updated status
    } catch (error) {
      console.error('Failed to mark fix as accepted:', error);
      toast({
        title: "Error",
        description: "Failed to mark fix as accepted",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <div className="text-center py-12 text-muted-foreground">Loading issue details...</div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <div className="text-center py-12 text-muted-foreground">Issue not found</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <Breadcrumb
        items={[
          { label: 'Community', href: '/community' },
          { label: issue.title }
        ]}
        className="mb-6"
      />

      {/* Issue Header */}
      <Card className="glass-card mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {getStatusBadge(issue.status)}
                <span className="text-sm text-muted-foreground">{formatTimeAgo(issue.created_at)}</span>
              </div>
              <CardTitle className="text-xl">{issue.title}</CardTitle>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/community/${id}/edit`}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Author */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{issue.author_name}</p>
            </div>
          </div>

          {/* Description */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap bg-muted/50 p-4 rounded-lg text-sm">
              {issue.description}
            </pre>
          </div>

          {/* Images */}
          {issue.images && issue.images.length > 0 && (
            <div className="mt-4 flex gap-2 flex-wrap">
              {issue.images.map((img: string, index: number) => (
                <img
                  key={index}
                  src={img}
                  alt={`Issue screenshot ${index + 1}`}
                  className="w-32 h-24 object-cover rounded-lg"
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fixes Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Fixes & Solutions ({fixes.length})
        </h2>

        {fixes.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="pt-6 text-center text-muted-foreground">
              No fixes yet. Be the first to submit a solution!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {fixes.map((fix) => (
              <Card
                key={fix.id}
                className={cn(
                  "glass-card",
                  fix.is_accepted && "border-success/30 bg-success/5"
                )}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{fix.author_name}</span>
                        {fix.is_accepted && (
                          <Badge className="bg-success text-success-foreground">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Accepted Fix
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground ml-auto">{formatTimeAgo(fix.created_at)}</span>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap bg-muted/50 p-4 rounded-lg text-sm">
                          {fix.content}
                        </pre>
                      </div>
                      {fix.images && fix.images.length > 0 && (
                        <div className="mt-3 flex gap-2 flex-wrap">
                          {fix.images.map((img: string, index: number) => (
                            <img
                              key={index}
                              src={img}
                              alt={`Fix screenshot ${index + 1}`}
                              className="w-32 h-24 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => handleLikeFix(fix.id)}
                        >
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          {fix.likes}
                        </Button>
                        {!fix.is_accepted && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-success"
                            onClick={() => handleMarkAsAccepted(fix.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark as Solution
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Fix Form */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Submit a Fix</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Share your solution or suggestions to help fix this issue..."
            value={newFix}
            onChange={(e) => setNewFix(e.target.value)}
            rows={6}
            className="mb-4"
          />
          {imageFiles.length > 0 && (
            <div className="mb-4 flex gap-2 flex-wrap">
              {imageFiles.map((file, index) => (
                <div key={index} className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  {file.name}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="fix-image-upload"
              />
              <Button variant="outline" size="sm" asChild>
                <label htmlFor="fix-image-upload" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Add Image
                </label>
              </Button>
            </div>
            <Button onClick={handleSubmitFix} disabled={submitting}>
              <Send className="w-4 h-4 mr-2" />
              {submitting ? 'Submitting...' : 'Submit Fix'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
