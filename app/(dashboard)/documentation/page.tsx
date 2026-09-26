'use client';
import { 
  BookOpen, 
  Terminal, 
  Shield, 
  Users, 
  Settings, 
  ChevronRight,
  Search,
  ExternalLink
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/page-breadcrumb';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const sections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    articles: [
      { title: 'Introduction to vsay terminal', href: '#intro' },
      { title: 'Creating your account', href: '#account' },
      { title: 'Quick start guide', href: '#quickstart' },
      { title: 'Understanding the dashboard', href: '#dashboard' },
    ],
  },
  {
    id: 'machines',
    title: 'Machine Management',
    icon: Terminal,
    articles: [
      { title: 'Adding a new machine', href: '#add-machine' },
      { title: 'Installing the vsay agent', href: '#agent' },
      { title: 'Configuring SSH access', href: '#ssh' },
      { title: 'Using the web terminal', href: '#terminal' },
      { title: 'Machine monitoring', href: '#monitoring' },
    ],
  },
  {
    id: 'security',
    title: 'Security & Access',
    icon: Shield,
    articles: [
      { title: 'Two-factor authentication', href: '#2fa' },
      { title: 'Managing access permissions', href: '#permissions' },
      { title: 'Audit logs', href: '#audit' },
      { title: 'Best practices', href: '#best-practices' },
    ],
  },
  {
    id: 'team',
    title: 'Team Collaboration',
    icon: Users,
    articles: [
      { title: 'Inviting team members', href: '#invite' },
      { title: 'Role-based access control', href: '#rbac' },
      { title: 'Sharing machines', href: '#sharing' },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & Configuration',
    icon: Settings,
    articles: [
      { title: 'Profile settings', href: '#profile' },
      { title: 'Notification preferences', href: '#notifications' },
      { title: 'API & Integrations', href: '#api' },
    ],
  },
];

export default function Documentation() {
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState('getting-started');

  const filteredSections = sections.map(section => ({
    ...section,
    articles: section.articles.filter(article =>
      article.title.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(section => section.articles.length > 0 || !search);

  return (
    <div className="animate-fade-in">
      <Breadcrumb items={[{ label: 'Documentation' }]} className="mb-6" />
      
      <div className="page-header">
        <h1 className="page-title">Documentation</h1>
        <p className="page-description">Learn how to use vsay terminal effectively</p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search documentation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-12"
        />
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1 sticky top-24">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                  activeSection === section.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <section.icon className="w-5 h-5" />
                <span className="font-medium">{section.title}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {filteredSections.map((section) => (
            <div
              key={section.id}
              className={cn(
                "mb-8",
                activeSection !== section.id && !search && "hidden"
              )}
            >
              <div className="flex items-center gap-3 mb-4">
                <section.icon className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-semibold">{section.title}</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {section.articles.map((article) => (
                  <Card
                    key={article.href}
                    className="glass-card hover:border-primary/50 transition-colors cursor-pointer group"
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <span className="font-medium group-hover:text-primary transition-colors">
                        {article.title}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Example Article Content */}
          {activeSection === 'getting-started' && !search && (
            <Card className="glass-card mt-8">
              <CardContent className="p-6 prose prose-sm dark:prose-invert max-w-none">
                <h3>Welcome to vsay terminal</h3>
                <p>
                  vsay terminal is a powerful SSH access management portal that allows you to 
                  securely connect to your servers and machines from anywhere. This documentation 
                  will guide you through all the features and help you get the most out of the platform.
                </p>
                
                <h4>Key Features</h4>
                <ul>
                  <li><strong>Secure SSH Access:</strong> Connect to your machines through encrypted tunnels</li>
                  <li><strong>Web Terminal:</strong> Run commands directly from your browser</li>
                  <li><strong>Team Collaboration:</strong> Share access with team members safely</li>
                  <li><strong>Real-time Monitoring:</strong> Track server health and performance</li>
                  <li><strong>Audit Logs:</strong> Keep track of all activities for compliance</li>
                </ul>

                <h4>Quick Start</h4>
                <ol>
                  <li>Create your account or sign in</li>
                  <li>Add your first machine from the Machines page</li>
                  <li>Download and install the vsay agent on your server</li>
                  <li>Run the configuration command</li>
                  <li>Start accessing your machine through the web terminal</li>
                </ol>

                <div className="not-prose mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-sm font-medium text-primary mb-2">Need help?</p>
                  <p className="text-sm text-muted-foreground">
                    Visit our community page to ask questions or report issues. Our team and 
                    community members are always ready to help!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
