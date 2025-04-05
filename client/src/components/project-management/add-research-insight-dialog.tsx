import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Form validation schema
const formSchema = z.object({
  projectId: z.number(),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  source: z.string().optional().nullable(),
  confidence: z.number().min(0).max(100).default(50),
  tags: z.string().optional(),
});

// Form values type
type FormValues = z.infer<typeof formSchema>;

interface AddResearchInsightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
}

export function AddResearchInsightDialog({ 
  open, 
  onOpenChange, 
  projectId 
}: AddResearchInsightDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: projectId,
      title: '',
      content: '',
      source: '',
      confidence: 50,
      tags: '',
    },
  });

  const createInsightMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Process tags into array if provided
      const tags = data.tags ? data.tags.split(',').map(tag => tag.trim()) : undefined;
      
      // Create insight data object with current date
      const insightData = {
        ...data,
        tags,
        discoveryDate: new Date().toISOString(), // Current date for discovery
      };
      
      const response = await apiRequest('/api/research-insights', 'POST', insightData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Research insight created successfully',
        description: 'Your new research insight has been added to the project.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/insights`] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create research insight',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    createInsightMutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add Research Insight</DialogTitle>
          <DialogDescription>
            Document a new research finding or insight for this project.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insight Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a concise title for this insight" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the research insight in detail" 
                      className="resize-none min-h-[150px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source (optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Where did this insight come from?" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confidence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confidence Level: {field.value}%</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      defaultValue={[field.value]}
                      onValueChange={(values) => field.onChange(values[0])}
                      className="py-4"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (optional, comma separated)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="UX Research, Performance, User Testing" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Insight
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}