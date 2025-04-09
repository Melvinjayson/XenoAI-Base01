import React, { useState, useEffect } from 'react';
import { Loader2, Server, Cloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getModelTransitionSettings, forceModelType, ModelType } from '@/lib/model-transition-api';

interface ModelStatusWidgetProps {
  sessionId?: string;
  compact?: boolean;
  onModelChange?: (model: ModelType) => void;
}

export default function ModelStatusWidget({ 
  sessionId = 'default-session',
  compact = false,
  onModelChange
}: ModelStatusWidgetProps) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        const data = await getModelTransitionSettings(sessionId);
        setSettings(data);
      } catch (err) {
        setError('Failed to load model settings');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
    const intervalId = setInterval(fetchSettings, 30000);
    return () => clearInterval(intervalId);
  }, [sessionId]);

  const handleModelToggle = async () => {
    if (!settings) return;

    try {
      const newModelType = settings.currentModelType === ModelType.LOCAL 
        ? ModelType.CLOUD 
        : ModelType.LOCAL;

      const updatedSettings = await forceModelType(sessionId, newModelType);
      setSettings(updatedSettings);

      if (onModelChange) {
        onModelChange(newModelType);
      }
    } catch (err) {
      setError('Failed to switch model');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-sm bg-background rounded-lg shadow-sm p-4">
        <div className="flex justify-center items-center h-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="w-full max-w-sm bg-background rounded-lg shadow-sm p-4">
        <div className="text-center text-destructive">
          <p>Error loading model status</p>
        </div>
      </div>
    );
  }

  // Return minimal status widget
  return null;
}