import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, CheckCircle, AlertCircle, XCircle, HelpCircle, RefreshCw, Signal, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

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
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshProgress, setRefreshProgress] = useState<number>(100);
  const [websocketStatus, setWebsocketStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchWebSocketStatus = useCallback(async () => {
    try {
      // Check if the WebSocket is connected by querying the WebSocket status endpoint
      const wsEndpoint = '/api/system-status/websocket';
      const response = await fetch(wsEndpoint);
      
      if (response.ok) {
        const data = await response.json();
        setWebsocketStatus(data.connected ? 'connected' : 'disconnected');
      } else {
        setWebsocketStatus('unknown');
      }
    } catch (err) {
      console.error('Failed to check WebSocket status:', err);
      setWebsocketStatus('unknown');
    }
  }, []);

  const fetchSystemStatus = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/system-status');
      
      if (!response.ok) {
        throw new Error(`Error fetching system status: ${response.statusText}`);
      }
      
      const data = await response.json();
      setStatusData(data);
      setError(null);
      setLastRefresh(new Date());
      await fetchWebSocketStatus();
    } catch (err: any) {
      console.error('Failed to fetch system status:', err);
      setError(err.message || 'An unknown error occurred');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [fetchWebSocketStatus]);

  const handleManualRefresh = () => {
    fetchSystemStatus();
  };

  useEffect(() => {
    // Initial fetch
    fetchSystemStatus();
    
    // Set up interval to refresh status every 30 seconds
    const intervalId = setInterval(fetchSystemStatus, 30000);

    // Progress bar countdown
    const progressInterval = setInterval(() => {
      setRefreshProgress((prev) => {
        const newValue = prev - (100 / 30);
        return newValue < 0 ? 100 : newValue;
      });
    }, 1000);
    
    // Clean up interval on component unmount
    return () => {
      clearInterval(intervalId);
      clearInterval(progressInterval);
    };
  }, [fetchSystemStatus]);

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

  const getWebSocketStatusIcon = () => {
    switch (websocketStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return <Signal className="h-4 w-4 text-gray-500" />;
    }
  };

  const getWebSocketStatusText = () => {
    switch (websocketStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  const getWebSocketStatusColor = () => {
    switch (websocketStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const timeUntilNextRefresh = Math.floor(30 * (refreshProgress / 100));

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-secondary/20">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              System Status
              {refreshing && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            </CardTitle>
            <CardDescription>
              Last updated: {lastUpdated}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(statusData.status)}>
            {statusData.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {/* WebSocket Status Section */}
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              {getWebSocketStatusIcon()}
              WebSocket Status
            </h3>
            <Badge className={getWebSocketStatusColor()}>
              {getWebSocketStatusText()}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {websocketStatus === 'connected' 
              ? 'Real-time communication is working properly.' 
              : 'Real-time communication might be interrupted. Some features may not work correctly.'}
          </p>
        </div>
        
        <Separator className="my-4" />
        
        {/* Component Status Accordion */}
        <h3 className="text-sm font-medium mb-4">Component Status</h3>
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
                  <pre className="p-3 bg-muted rounded-md text-xs overflow-auto max-h-64">
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
      
      <CardFooter className="bg-muted/40 flex flex-col gap-2">
        <div className="w-full">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Auto-refreshing in {timeUntilNextRefresh}s</span>
            <span>{refreshProgress.toFixed(0)}%</span>
          </div>
          <Progress value={refreshProgress} className="h-1 w-full" />
        </div>
        
        <div className="flex justify-between w-full mt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="gap-1"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh Now
          </Button>
          
          <Button 
            variant="outline"
            size="sm"
            onClick={fetchWebSocketStatus}
            className="gap-1"
          >
            <Signal className="h-3 w-3 mr-1" />
            Check WebSocket
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default SystemStatus;