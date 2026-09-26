'use client';
import { useState } from 'react';
import {
  Download,
  Monitor,
//   Terminal,
  Package,
//   MonitorSmartphone,
  Cpu,
  Copy,
  Check,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/page-breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8082';

// Agent packages data
const agentPackages = [
  {
    id: 'debian-amd64',
    name: 'vsay-agent-amd64.deb',
    os: 'Debian/Ubuntu',
    osIcon: 'https://www.debian.org/logos/openlogo-nd.svg',
    arch: 'AMD64',
    archIcon: <Cpu />,
    downloadUrl: `${BACKEND_URL}/agent/download/vsay-agent-amd64.deb`,
  },
  {
    id: 'debian-arm64',
    name: 'vsay-agent-arm64.deb',
    os: 'Debian/Ubuntu',
    osIcon: 'https://www.debian.org/logos/openlogo-nd.svg',
    arch: 'ARM64',
    archIcon: <Cpu />,
    downloadUrl: `${BACKEND_URL}/agent/download/vsay-agent-arm64.deb`,
  },
  {
    id: 'rocky-x86_64',
    name: 'vsay-agent-x86_64.tar.gz',
    os: 'Rocky/CentOS/RHEL',
    osIcon: 'https://www.svgrepo.com/show/354273/redhat-icon.svg',
    arch: 'x86_64',
    archIcon: <Cpu />,
    downloadUrl: `${BACKEND_URL}/agent/download/vsay-agent-x86_64.tar.gz`,
  },
  {
    id: 'rocky-aarch64',
    name: 'vsay-agent-aarch64.tar.gz',
    os: 'Rocky/CentOS/RHEL',
    osIcon: 'https://www.svgrepo.com/show/354273/redhat-icon.svg',
    arch: 'aarch64',
    archIcon: <Cpu />,
    downloadUrl: `${BACKEND_URL}/agent/download/vsay-agent-aarch64.tar.gz`,
  },
  {
    id: 'macos-amd64',
    name: 'vsay-agent-amd64.dmg',
    os: 'macOS',
    osIcon: 'https://www.svgrepo.com/show/503173/apple-logo.svg',
    arch: 'Intel (AMD64)',
    archIcon: <Cpu />,
    downloadUrl: `${BACKEND_URL}/agent/download/vsay-agent-amd64.dmg`,
  },
  {
    id: 'macos-arm64',
    name: 'vsay-agent-arm64.dmg',
    os: 'macOS',
    osIcon: 'https://www.svgrepo.com/show/503173/apple-logo.svg',
    arch: 'Apple Silicon (ARM64)',
    archIcon: <Cpu />,
    downloadUrl: `${BACKEND_URL}/agent/download/vsay-agent-arm64.dmg`,
  },
  {
    id: 'windows-amd64',
    name: 'vsay-agent-amd64.exe',
    os: 'Windows',
    osIcon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Windows_logo_-_2021.svg/960px-Windows_logo_-_2021.svg.png',
    arch: 'AMD64',
    archIcon: <Cpu />,
    downloadUrl: `${BACKEND_URL}/agent/download/vsay-agent-amd64.exe`,
  },
  {
    id: 'windows-arm64',
    name: 'vsay-agent-arm64.exe',
    os: 'Windows',
    osIcon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Windows_logo_-_2021.svg/960px-Windows_logo_-_2021.svg.png',
    arch: 'ARM64',
    archIcon: <Cpu />,
    downloadUrl: `${BACKEND_URL}/agent/download/vsay-agent-arm64.exe`,
  },
];

// // CLI packages data — filenames are FIXED (no version/commit embedded), so
// // this list never needs to change across releases. `make deploy-binaries
// // VERSION=x.y.z` in vsay-shell-cli always (re)writes these same names into
// // public/downloads/, so "latest" is always at a stable URL.
// const cliPackages = [
//   {
//     id: 'cli-debian-amd64',
//     name: 'vsay-shell-cli-amd64.deb',
//     os: 'Debian/Ubuntu',
//     osIcon: 'https://www.debian.org/logos/openlogo-nd.svg',
//     arch: 'AMD64',
//     archIcon: <Cpu />,
//     downloadUrl: '/downloads/vsay-shell-cli-amd64.deb',
//   },
//   {
//     id: 'cli-debian-arm64',
//     name: 'vsay-shell-cli-arm64.deb',
//     os: 'Debian/Ubuntu',
//     osIcon: 'https://www.debian.org/logos/openlogo-nd.svg',
//     arch: 'ARM64',
//     archIcon: <Cpu />,
//     downloadUrl: '/downloads/vsay-shell-cli-arm64.deb',
//   },
//   {
//     id: 'cli-rocky-x86_64',
//     name: 'vsay-shell-cli-x86_64.rpm',
//     os: 'Rocky/CentOS/RHEL',
//     osIcon: 'https://www.svgrepo.com/show/354273/redhat-icon.svg',
//     arch: 'x86_64',
//     archIcon: <Cpu />,
//     downloadUrl: '/downloads/vsay-shell-cli-x86_64.rpm',
//   },
//   {
//     id: 'cli-rocky-aarch64',
//     name: 'vsay-shell-cli-aarch64.rpm',
//     os: 'Rocky/CentOS/RHEL',
//     osIcon: 'https://www.svgrepo.com/show/354273/redhat-icon.svg',
//     arch: 'aarch64',
//     archIcon: <Cpu />,
//     downloadUrl: '/downloads/vsay-shell-cli-aarch64.rpm',
//   },
//   {
//     id: 'cli-macos-amd64',
//     name: 'vsay-shell-cli-amd64.dmg',
//     os: 'macOS',
//     osIcon: 'https://www.svgrepo.com/show/503173/apple-logo.svg',
//     arch: 'Intel (AMD64)',
//     archIcon: <Cpu />,
//     downloadUrl: '/downloads/vsay-shell-cli-amd64.dmg',
//   },
//   {
//     id: 'cli-macos-arm64',
//     name: 'vsay-shell-cli-arm64.dmg',
//     os: 'macOS',
//     osIcon: 'https://www.svgrepo.com/show/503173/apple-logo.svg',
//     arch: 'Apple Silicon (ARM64)',
//     archIcon: <Cpu />,
//     downloadUrl: '/downloads/vsay-shell-cli-arm64.dmg',
//   },
//   {
//     id: 'cli-windows-amd64',
//     name: 'vsay-shell-cli-amd64.exe',
//     os: 'Windows',
//     osIcon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Windows_logo_-_2021.svg/960px-Windows_logo_-_2021.svg.png',
//     arch: 'AMD64',
//     archIcon: <Cpu />,
//     downloadUrl: '/downloads/vsay-shell-cli-amd64.exe',
//   },
// ];

// // VS Code Extension data
// const vscodeExtension = {
//   name: 'vsay-vscode-extension.vsix',
//   version: '1.2.1',
//   downloadUrl: '/downloads/vsay-remote-machines-1.2.1.vsix',
// };

export default function PackagesPage() {
  const [activeTab, setActiveTab] = useState('agent');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Download started",
      description: `Downloading ${filename}`
    });
  };

  // Relative /downloads/... URLs are served by this same app, so a curl run
  // from the user's terminal needs the full origin — absolute backend URLs
  // (agent packages) are already usable as-is.
  const getCurlCommand = (downloadUrl: string, filename: string) => {
    const url = downloadUrl.startsWith('http')
      ? downloadUrl
      : `${typeof window !== 'undefined' ? window.location.origin : ''}${downloadUrl}`;
    return `curl ${url} --output ${filename}`;
  };

  const handleCopyCurl = (id: string, downloadUrl: string, filename: string) => {
    navigator.clipboard.writeText(getCurlCommand(downloadUrl, filename));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Copied!', description: 'curl command copied to clipboard' });
  };

  const renderPackageTable = (packages: typeof agentPackages) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Operating System</TableHead>
          <TableHead>Architecture</TableHead>
          <TableHead>Package Name</TableHead>
          <TableHead className="text-right">Download</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {packages.map((pkg) => (
          <TableRow key={pkg.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="text-xl"><img src={pkg.osIcon} className="w-7 h-7" alt={pkg.os} /></span>
                <span className="font-medium">{pkg.os}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="text-lg">{pkg.archIcon}</span>
                <Badge variant="outline">{pkg.arch}</Badge>
              </div>
            </TableCell>
            <TableCell>
              <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                {pkg.name}
              </code>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  onClick={() => handleDownload(pkg.downloadUrl, pkg.name)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 flex-shrink-0"
                  title="Copy curl command"
                  onClick={() => handleCopyCurl(pkg.id, pkg.downloadUrl, pkg.name)}
                >
                  {copiedId === pkg.id ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="animate-fade-in">
      <Breadcrumb
        items={[{ label: 'Download Packages' }]}
        className="mb-6"
      />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Package className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Download Packages</h1>
          <p className="text-muted-foreground">
            Download VSay Agent for your platform
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="agent" className="gap-2">
            <Monitor className="w-4 h-4" />
            Agent Download
          </TabsTrigger>
          {/* EPM: CLI + VS Code Extension downloads disabled — re-enable later
          <TabsTrigger value="cli" className="gap-2">
            <Terminal className="w-4 h-4" />
            CLI Download
          </TabsTrigger>
          <TabsTrigger value="vscode" className="gap-2">
            <MonitorSmartphone className="w-4 h-4" />
            VS Code Extension
          </TabsTrigger>
          */}
        </TabsList>

        {/* Agent Download Tab */}
        <TabsContent value="agent">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-primary" />
                VSay Agent Downloads
              </CardTitle>
              <CardDescription>
                Download the VSay Agent for your operating system and architecture.
                The agent runs on target machines to enable remote terminal access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderPackageTable(agentPackages)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLI Download Tab — EPM: disabled, re-enable later */}
        {/* EPM: CLI + VS Code Extension downloads disabled — re-enable later
        <TabsContent value="cli">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-primary" />
                VSay CLI Downloads
              </CardTitle>
              <CardDescription>
                Download the VSay CLI for your operating system and architecture.
                Use the CLI to manage machines and sessions from your terminal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderPackageTable(cliPackages)}
            </CardContent>
          </Card>
        </TabsContent>
        */}

        {/* VS Code Extension Tab — EPM: disabled, re-enable later */}
        {/* EPM: CLI + VS Code Extension downloads disabled — re-enable later
        <TabsContent value="vscode">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MonitorSmartphone className="w-5 h-5 text-primary" />
                VS Code Extension
              </CardTitle>
              <CardDescription>
                Download the VSay VS Code Extension to access remote terminals directly from VS Code.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                */}
                  {/* <MonitorSmartphone className="w-10 h-10 text-primary" /> */}
                    {/* EPM: CLI + VS Code Extension downloads disabled — re-enable later
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Visual_Studio_Code_1.35_icon.svg/1280px-Visual_Studio_Code_1.35_icon.svg.png?20210804221519" alt="VSay VS Code Extension" className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-semibold mb-2">VSay for VS Code</h3>
                <p className="text-muted-foreground text-center max-w-md mb-2">
                  Integrate VSay directly into your VS Code workflow.
                  Access remote terminals, manage machines, and run commands without leaving your editor.
                </p>
                <div className="flex items-center gap-2 mb-6">
                  <Badge variant="outline">Version {vscodeExtension.version}</Badge>
                  <Badge variant="secondary">.vsix</Badge>
                </div>
                <code className="text-sm bg-muted px-4 py-2 rounded-lg font-mono mb-6">
                  {vscodeExtension.name}
                </code>
                <div className="flex items-center gap-2">
                  <Button
                    size="lg"
                    onClick={() => handleDownload(vscodeExtension.downloadUrl, vscodeExtension.name)}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Extension
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-11 w-11 flex-shrink-0"
                    title="Copy curl command"
                    onClick={() => handleCopyCurl('vscode-extension', vscodeExtension.downloadUrl, vscodeExtension.name)}
                  >
                    {copiedId === 'vscode-extension' ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border max-w-lg">
                  <h4 className="font-medium mb-3">Installation Instructions</h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                    <li>Download the .vsix file using the button above</li>
                    <li>Open VS Code</li>
                    <li>Press <code className="font-mono bg-background px-1 rounded">Ctrl+Shift+P</code> (or <code className="font-mono bg-background px-1 rounded">Cmd+Shift+P</code> on Mac)</li>
                    <li>Type <code className="font-mono bg-background px-1 rounded">Extensions: Install from VSIX</code></li>
                    <li>Select the downloaded .vsix file</li>
                    <li>Reload VS Code when prompted</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        */}
      </Tabs>
    </div>
  );
}
