import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/context/websocket-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
import { Sparkles, Server, AlertCircle, BarChart, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ModelStatus {
  localModel: {
    loaded: boolean;
    model: string;
    version: string;
    contextLength: number;
    maxTokens: number;
  };
  availableModels: Array<{
    name: string;
    provider: string;
    category: string;
    isAvailable: boolean;
  }>;
  quotaStatus: Record<string, {
    usage: {
      requests: number;
      tokens: number;
      cost: number;
    };
    limit: {
      requests: number;
      tokens: number;
      cost: number;
    };
    isLimited: boolean;
  }>;
  timestamp: number;
}

export const ModelStatusWidget: React.FC = () => {
  const { isConnected, addMessageHandler, requestModelStatus } = useWebSocket();
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to refresh model status
  const refreshStatus = () => {
    if (!isConnected) {
      setError('WebSocket not connected');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    // Request model status via WebSocket
    const success = requestModelStatus();
    
    if (!success) {
      setIsLoading(false);
      setError('Failed to send status request');
    }
  };

  // Set up message handler for model status responses
  useEffect(() => {
    // Handler for model_status messages
    const removeHandler = addMessageHandler('model_status', (data) => {
      setModelStatus(data.data);
      setIsLoading(false);
    });
    
    // Handler for error messages
    const removeErrorHandler = addMessageHandler('error', (data) => {
      setError(data.error);
      setIsLoading(false);
    });
    
    return () => {
      removeHandler();
      removeErrorHandler();
    };
  }, [addMessageHandler]);

  // Load initial status when sheet is opened
  const handleOpenChange = (open: boolean) => {
    if (open && !modelStatus) {
      refreshStatus();
    }
  };

  return (
    <Sheet onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1 px-2"
        >
          <Server className="h-4 w-4" />
          <span className="sr-only md:not-sr-only md:whitespace-nowrap">Model Status</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Model Status
          </SheetTitle>
          <SheetDescription>
            Current status of all AI models and quota usage
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">Loading model information...</p>
            </div>
          )}
          
          {error && (
            <div className="rounded-md bg-destructive/10 p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-destructive">Error fetching model status</h3>
                  <p className="mt-1 text-sm text-destructive/80">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {modelStatus && !isLoading && (
            <>
              {/* Local model status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Local Model
                  </CardTitle>
                  <CardDescription>
                    Status of the local language model
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={modelStatus?.localModel?.loaded ? "success" : "destructive"}>
                        {modelStatus?.localModel?.loaded ? "Loaded" : "Not Loaded"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Model</span>
                      <span className="font-medium">{modelStatus?.localModel?.model || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Context Length</span>
                      <span className="font-medium">{modelStatus?.localModel?.contextLength?.toLocaleString() || 'Unknown'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Available models */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Available Models
                  </CardTitle>
                  <CardDescription>
                    External AI models and their availability
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(modelStatus?.availableModels || []).map((model, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{model?.name || 'Unknown'}</span>
                          <p className="text-xs text-muted-foreground">{model?.provider || 'Unknown'}</p>
                        </div>
                        <Badge variant={model?.isAvailable ? "success" : "outline"}>
                          {model?.isAvailable ? "Available" : "Unavailable"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Quota status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="h-5 w-5" />
                    API Quota Usage
                  </CardTitle>
                  <CardDescription>
                    Current usage for external AI services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {Object.entries(modelStatus.quotaStatus || {}).map(([service, status], index) => {
                      // Calculate percentage used
                      const tokensPercentage = status?.limit?.tokens 
                        ? Math.min(100, (status.usage?.tokens || 0) / status.limit.tokens * 100)
                        : 0;
                        
                      const requestsPercentage = status?.limit?.requests
                        ? Math.min(100, (status.usage?.requests || 0) / status.limit.requests * 100)
                        : 0;
                        
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">{service}</span>
                            <Badge variant={status?.isLimited ? "destructive" : "outline"}>
                              {status?.isLimited ? "Limited" : "Available"}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Tokens</span>
                              <span>{(status?.usage?.tokens || 0).toLocaleString()} / {(status?.limit?.tokens || 0).toLocaleString()}</span>
                            </div>
                            <Progress value={tokensPercentage} className="h-2" />
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Requests</span>
                              <span>{(status?.usage?.requests || 0).toLocaleString()} / {(status?.limit?.requests || 0).toLocaleString()}</span>
                            </div>
                            <Progress value={requestsPercentage} className="h-2" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
        
        <SheetFooter className="mt-4">
          <Button
            onClick={refreshStatus}
            disabled={isLoading}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <SheetClose asChild>
            <Button type="button">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default ModelStatusWidget;