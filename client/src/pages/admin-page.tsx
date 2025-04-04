import { ApiQuotaMonitor } from '@/components/admin/api-quota-monitor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  BarChart3, 
  Settings, 
  Users, 
  Database 
} from 'lucide-react';
import { Link } from 'wouter';

export default function AdminPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="outline" size="icon" className="rounded-full">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
      </div>

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="api" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">API Quotas</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <ApiQuotaMonitor />
            </div>
            
            <Card className="p-6">
              <h2 className="text-lg font-medium mb-4">API Usage Trends</h2>
              <div className="h-64 flex items-center justify-center border rounded-md bg-muted/20">
                <p className="text-muted-foreground">Usage analytics coming soon</p>
              </div>
            </Card>
            
            <Card className="p-6">
              <h2 className="text-lg font-medium mb-4">API Service Status</h2>
              <div className="space-y-4">
                {['OpenAI', 'ElevenLabs', 'Perplexity'].map((service) => (
                  <div key={service} className="flex items-center justify-between">
                    <span>{service}</span>
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Operational
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4">User Management</h2>
            <p className="text-muted-foreground">User management features coming soon.</p>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4">Data Management</h2>
            <p className="text-muted-foreground">Data management features coming soon.</p>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4">System Settings</h2>
            <p className="text-muted-foreground">Settings configuration coming soon.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}