import React from 'react';
import { SystemStatus } from '@/components/system-status';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useLocation } from 'wouter';

export default function SystemStatusPage() {
  const [location, setLocation] = useLocation();
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">System Status Dashboard</h1>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6">
        <div className="col-span-1">
          <SystemStatus key={refreshKey} />
        </div>
      </div>
    </div>
  );
}