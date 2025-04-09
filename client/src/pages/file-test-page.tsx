import { useState } from 'react';
import FileManager from '@/components/file-manager';
import { File } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FileTestPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">File Upload Testing</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <FileManager 
            sessionId="default" 
            onFileSelect={setSelectedFile} 
          />
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Selected File Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedFile ? (
                <div className="space-y-4">
                  <p><strong>Name:</strong> {selectedFile.name}</p>
                  <p><strong>Type:</strong> {selectedFile.type}</p>
                  <p><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</p>
                  <p><strong>Upload Date:</strong> {new Date(selectedFile.timestamp).toLocaleString()}</p>
                  
                  {selectedFile.type.startsWith('image/') && (
                    <div>
                      <p className="mb-2"><strong>Preview:</strong></p>
                      <img 
                        src={selectedFile.url} 
                        alt={selectedFile.name}
                        className="max-w-full h-auto border rounded-md"
                      />
                    </div>
                  )}
                  
                  <div className="pt-4">
                    <Button 
                      onClick={() => window.open(selectedFile.url, '_blank')}
                    >
                      Open File
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Select a file to view details</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}