import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 flex justify-center items-center h-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !settings) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p>Error loading model status</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="pt-6"></CardContent>
    </Card>
  );
}