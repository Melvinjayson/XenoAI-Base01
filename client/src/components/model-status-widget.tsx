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
import { Server } from 'lucide-react';

export const ModelStatusWidget: React.FC = () => {
  const { isConnected } = useWebSocket();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs flex items-center gap-1"
        >
          <Server className="h-3 w-3" />
          <Badge variant={isConnected ? "outline" : "destructive"} className="h-5 text-[10px]">
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Model Status</SheetTitle>
          <SheetDescription>
            Current AI model status and connection information
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
};

export default ModelStatusWidget;