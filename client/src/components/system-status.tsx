import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, CheckCircle, AlertCircle, XCircle, HelpCircle } from 'lucide-react';

// Types for system status
interface StatusData {
  status: string;
  components: {
    [key: string]: {
      status: string;
      details?: any;
    };
  };
  timestamp: number;
}

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'operational':
      return 'bg-green-500';
    case 'degraded':
      return 'bg-yellow-500';
    case 'outage':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'operational':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'degraded':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'outage':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <HelpCircle className="h-4 w-4 text-gray-500" />;
  }
};

export function SystemStatus() {
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/system-status');
        
        if (!response.ok) {
          throw new Error(`Error fetching system status: ${response.statusText}`);
        }
        
        const data = await response.json();
        setStatusData(data);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch system status:', err);
        setError(err.message || 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSystemStatus();
    
    // Set up interval to refresh status every 30 seconds
    const intervalId = setInterval(fetchSystemStatus, 30000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Loading current system status...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Error loading system status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!statusData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>No status data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const lastUpdated = new Date(statusData.timestamp).toLocaleString();

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Last updated: {lastUpdated}</CardDescription>
          </div>
          <Badge className={getStatusColor(statusData.status)}>
            {statusData.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {Object.entries(statusData.components).map(([key, data]) => (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger className="flex items-center gap-2">
                <span className="flex items-center gap-2">
                  {getStatusIcon(data.status)}
                  <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                </span>
                <Badge className={`ml-auto mr-4 ${getStatusColor(data.status)}`}>
                  {data.status.toUpperCase()}
                </Badge>
              </AccordionTrigger>
              <AccordionContent>
                {data.details ? (
                  <pre className="p-2 bg-muted rounded-md text-xs overflow-auto">
                    {JSON.stringify(data.details, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">No additional details available</p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

export default SystemStatus;