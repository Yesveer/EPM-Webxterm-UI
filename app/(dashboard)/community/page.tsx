'use client';
import Link from 'next/link';
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/page-breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { communityAPI, Issue as APIIssue } from '@/lib/community-api';
import { useToast } from '@/hooks/use-toast';

export default function Community() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [issues, setIssues] = useState<APIIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const itemsPerPage = 5;

  useEffect(() => {
    loadIssues();
  }, [currentPage]);

  const loadIssues = async () => {
    try {
      const token = localStorage.getItem('vsay-token');
      if (!token) {
        toast({
          title: 'Error',
          description: 'Please login to view community issues',
          variant: 'destructive',
        });
        return;
      }

      const data = await communityAPI.getAllIssues(token, currentPage, itemsPerPage);
      setIssues(data.issues || []);
    } catch (error) {
      console.error('Failed to load issues:', error);
      toast({
        title: 'Error',
        description: 'Failed to load community issues',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (issueId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('vsay-token');
      if (!token) return;

      await communityAPI.updateIssue(token, issueId, { status: newStatus });
      toast({
        title: 'Success',
        description: 'Issue status updated successfully',
      });
      loadIssues();
    } catch (error) {
      console.error('Failed to update issue:', error);
      toast({
        title: 'Error',
        description: 'Failed to update issue status',
        variant: 'destructive',
      });
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

  const filteredIssues = issues.filter((issue: APIIssue) =>
    issue.title.toLowerCase().includes(search.toLowerCase()) ||
    issue.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);
  const paginatedIssues = filteredIssues.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: APIIssue['status']) => {
    const config = {
      open: { icon: AlertCircle, className: 'bg-warning/10 text-warning border-warning/20', label: 'Open' },
      closed: { icon: CheckCircle, className: 'bg-success/10 text-success border-success/20', label: 'Closed' },
      in_progress: { icon: Clock, className: 'bg-primary/10 text-primary border-primary/20', label: 'In Progress' },
    } as const;
    const { icon: Icon, className, label } = config[status];
    return (
      <Badge variant="outline" className={cn("gap-1", className)}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumb items={[{ label: 'Community' }]} className="mb-6" />
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Community</h1>
          <p className="page-description">Report issues and help others in the community</p>
        </div>
        <Button asChild>
          <Link href="/community/add">
            <Plus className="w-4 h-4 mr-2" />
            Report Issue
          </Link>
        </Button>
      </div>

      <Card className="glass-card">
        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search issues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue</TableHead>
                <TableHead className="hidden md:table-cell">Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Activity</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading issues...
                  </TableCell>
                </TableRow>
              ) : paginatedIssues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No issues found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedIssues.map((issue: APIIssue) => (
                  <TableRow key={issue.id} className="group">
                    <TableCell>
                      <Link href={`/community/details/${issue.id}`} className="block hover:text-primary transition-colors">
                        <p className="font-medium">{issue.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{issue.description}</p>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm">{issue.author_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(issue.status)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          {issue.fix_count}
                        </span>
                        <span className="hidden lg:block">{formatTimeAgo(issue.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/community/details/${issue.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              View details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/community/${issue.id}/edit`}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          {issue.status !== 'closed' && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(issue.id, 'closed')}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Close issue
                            </DropdownMenuItem>
                          )}
                          {issue.status === 'closed' && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(issue.id, 'open')}>
                              <AlertCircle className="w-4 h-4 mr-2" />
                              Reopen issue
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredIssues.length)} of {filteredIssues.length} issues
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="icon"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
