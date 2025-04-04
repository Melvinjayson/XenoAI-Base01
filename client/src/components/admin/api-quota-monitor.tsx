import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useApiQuota, type ApiQuotaAdjustment } from '@/hooks/use-api-quota';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { RefreshCcw, AlertTriangle, CheckCircle } from 'lucide-react';

// Schema for quota adjustment form
const quotaAdjustmentSchema = z.object({
  service: z.string().min(1, { message: 'Service name is required' }),
  dailyQuota: z.coerce.number().int().positive({ message: 'Daily quota must be a positive number' }),
  hourlyQuota: z.coerce.number().int().positive({ message: 'Hourly quota must be a positive number' })
});

export function ApiQuotaMonitor() {
  const { quotaStatus, isLoading, error, refetch, adjustQuota, isAdjusting } = useApiQuota();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Form setup for quota adjustment
  const form = useForm<ApiQuotaAdjustment>({
    resolver: zodResolver(quotaAdjustmentSchema),
    defaultValues: {
      service: 'elevenlabs',
      dailyQuota: 10000,
      hourlyQuota: 50
    }
  });
  
  // Handle form submission
  const onSubmit = (values: ApiQuotaAdjustment) => {
    adjustQuota(values);
  };
  
  // Calculate quota percentage
  const calculatePercentage = (used: number, total: number): number => {
    return Math.min(Math.round((used / total) * 100), 100);
  };
  
  // Determine badge color based on usage percentage
  const getBadgeVariant = (percentage: number): 'default' | 'secondary' | 'destructive' => {
    if (percentage < 50) return 'default';
    if (percentage < 80) return 'secondary';
    return 'destructive';
  };
  
  // If there's an error loading quota data
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Error Loading API Quota
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Failed to load API quota information. Please try again later.</p>
          <Button 
            variant="outline" 
            onClick={() => refetch()} 
            className="mt-4"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>API Quota Monitor</span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => refetch()} 
            disabled={isLoading}
          >
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <CardDescription>
          Track and manage API usage across different services
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="adjust">Adjust Quotas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCcw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : quotaStatus ? (
              Object.entries(quotaStatus).map(([service, quota]) => {
                const dailyPercentage = calculatePercentage(quota.used, quota.total);
                const hourlyPercentage = calculatePercentage(quota.hourlyUsed, quota.hourlyTotal);
                
                return (
                  <div key={service} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium capitalize">{service}</h3>
                      <Badge variant={getBadgeVariant(dailyPercentage)}>
                        {dailyPercentage}% Used
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Daily Usage</span>
                        <span>{quota.used} / {quota.total}</span>
                      </div>
                      <Progress value={dailyPercentage} className="h-2" />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Hourly Requests</span>
                        <span>{quota.hourlyUsed} / {quota.hourlyTotal}</span>
                      </div>
                      <Progress value={hourlyPercentage} className="h-2" />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No quota information available
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="adjust" className="mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="service"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        >
                          <option value="elevenlabs">ElevenLabs</option>
                          <option value="openai">OpenAI</option>
                          <option value="perplexity">Perplexity</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dailyQuota"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Quota</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="hourlyQuota"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Quota</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isAdjusting}>
                  {isAdjusting ? (
                    <>
                      <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                      Adjusting...
                    </>
                  ) : (
                    'Adjust Quota'
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <CheckCircle className="w-4 h-4" />
          <span>Last updated: {quotaStatus && new Date(Date.now()).toLocaleTimeString()}</span>
        </div>
      </CardFooter>
    </Card>
  );
}