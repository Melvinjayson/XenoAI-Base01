import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import type { File } from '@shared/schema';

interface FileUploadOptions {
  sessionId?: string;
  userId?: number | null;
  onSuccess?: (file: File) => void;
}

export function useFiles(sessionId: string = 'default') {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch files for the current session
  const { data: files, isLoading, error } = useQuery<File[]>({
    queryKey: [`/api/files/session/${sessionId}`],
    queryFn: async () => {
      const response = await fetch(`/api/files/session/${sessionId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.statusText}`);
      }
      const data = await response.json();
      return data.files;
    },
  });

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: Blob) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate files query to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/files/session/${sessionId}`] });
    },
  });

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate files query to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/files/session/${sessionId}`] });
    },
  });

  // Upload file function
  const uploadFile = async (file: Blob & { name: string }, options: FileUploadOptions = {}) => {
    setIsUploading(true);
    
    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', options.sessionId || sessionId);
      
      // Upload the file
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been uploaded.`,
      });
      
      // Refresh the file list
      queryClient.invalidateQueries({ queryKey: [`/api/files/session/${sessionId}`] });
      
      // Call onSuccess callback if provided
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
      
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Delete file function
  const deleteFile = async (fileId: number) => {
    try {
      await deleteMutation.mutateAsync(fileId);
      
      toast({
        title: "File deleted",
        description: "The file has been deleted successfully.",
      });
      
    } catch (error) {
      console.error('File deletion error:', error);
      toast({
        title: "Deletion failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    files,
    isLoading,
    error,
    isUploading,
    uploadFile,
    deleteFile,
    uploadMutation,
    deleteMutation,
  };
}