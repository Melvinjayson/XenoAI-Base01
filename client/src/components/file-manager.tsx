import React, { useRef, useState } from 'react';
import { useFiles } from '@/hooks/use-files';
import { File } from '@shared/schema';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Paperclip, Trash2, FileText, Image, FileIcon, Music, Video, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

interface FileManagerProps {
  sessionId?: string;
  onFileSelect?: (file: File) => void;
}

export default function FileManager({ sessionId = 'default', onFileSelect }: FileManagerProps) {
  const { files, isLoading, error, isUploading, uploadFile, deleteFile } = useFiles(sessionId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Helper function to convert input file to a compatible format
  const convertFileToBlobWithName = (file: globalThis.File): Blob & { name: string } => {
    // Create a new Blob from the File
    const blob = new Blob([file], { type: file.type });
    // Add the name property to the Blob
    return Object.assign(blob, { name: file.name });
  };

  // Handle file selection
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    try {
      // Convert the file to a compatible format 
      const blobWithName = convertFileToBlobWithName(files[0]);
      
      // Upload the file
      await uploadFile(blobWithName, { sessionId });
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };
  
  // Get icon for file type
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (type.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (type.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (type.startsWith('application/pdf')) return <FileText className="w-5 h-5" />;
    if (type.startsWith('text/')) return <FileText className="w-5 h-5" />;
    return <FileIcon className="w-5 h-5" />;
  };
  
  // Handle file selection
  const handleSelect = (file: File) => {
    setSelectedFile(file);
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>File Manager</CardTitle>
        <CardDescription>Upload and manage files for your session</CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Upload Button */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4,.mov"
            />
            <Button 
              variant="outline" 
              className="w-full flex items-center gap-2"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Paperclip className="w-4 h-4" />
                  <span>Upload File</span>
                </>
              )}
            </Button>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        {/* Files List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-destructive text-center py-4">
              Error loading files
            </div>
          ) : files && files.length > 0 ? (
            files.map((file) => (
              <div 
                key={file.id}
                className={`flex items-center justify-between p-3 rounded-md border ${
                  selectedFile?.id === file.id ? 'bg-muted border-primary' : 'hover:bg-muted'
                }`}
                onClick={() => handleSelect(file)}
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(file.type)}
                  <div>
                    <p className="font-medium text-sm truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(file.timestamp).toLocaleDateString()} • {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(file.url, '_blank');
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFile(file.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No files uploaded yet
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <p className="text-xs text-muted-foreground">
          {files ? `${files.length} files` : '0 files'} • PDF, DOC, TXT, images, and more
        </p>
      </CardFooter>
    </Card>
  );
}