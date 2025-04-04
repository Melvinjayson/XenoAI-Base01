import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface ApiQuotaStatus {
  used: number;
  total: number;
  hourlyUsed: number;
  hourlyTotal: number;
}

export interface ApiQuotaResponse {
  status: Record<string, ApiQuotaStatus>;
  timestamp: number;
}

export interface ApiQuotaAdjustment {
  service: string;
  dailyQuota: number;
  hourlyQuota: number;
}

export function useApiQuota() {
  const { toast } = useToast();

  const { data, isLoading, error, refetch } = useQuery<ApiQuotaResponse>({
    queryKey: ['/api/quota-status'],
    queryFn: async () => {
      const response = await fetch('/api/quota-status');
      if (!response.ok) {
        throw new Error('Failed to fetch API quota status');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const adjustQuotaMutation = useMutation({
    mutationFn: async (quotaAdjustment: ApiQuotaAdjustment) => {
      const response = await apiRequest('/api/quota-adjust', 'POST', quotaAdjustment);
      return response;
    },
    onSuccess: () => {
      // Invalidate quota status query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/quota-status'] });
      toast({
        title: 'Quota Adjusted',
        description: 'API quota has been successfully adjusted',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to adjust quota: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    quotaStatus: data?.status,
    isLoading,
    error,
    refetch,
    adjustQuota: adjustQuotaMutation.mutate,
    isAdjusting: adjustQuotaMutation.isPending,
  };
}