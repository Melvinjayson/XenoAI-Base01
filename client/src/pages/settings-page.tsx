import React, { useState } from 'react';
import { Settings, Info, Zap, Volume2, Palette } from 'lucide-react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
//import ModelStatusWidget from '@/components/model-status-widget'; // Removed since ModelStatusWidget is no longer used.
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('models');

  return (
    <div className="container py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <Settings className="mr-2 h-7 w-7" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Customize your Xeno AI experience
        </p>
      </header>

      <Tabs
        defaultValue="models"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-4 h-auto p-1 md:w-[600px] w-full">
          <TabsTrigger value="models" className="flex items-center">
            <Zap className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Models</span>
            <span className="sm:hidden">AI</span>
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center">
            <Volume2 className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Voice</span>
            <span className="sm:hidden">Voice</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center">
            <Palette className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
            <span className="sm:hidden">UI</span>
          </TabsTrigger>
          <TabsTrigger value="about" className="flex items-center">
            <Info className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">About</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/*ModelStatusWidget removed */}

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>API Settings</CardTitle>
                  <CardDescription>Configure external API connections</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-medium">OpenAI</h4>
                        <p className="text-xs text-muted-foreground">Advanced processing and vision</p>
                      </div>
                      <Button 
                        onClick={() => {
                          toast({
                            title: "API Configuration",
                            description: "OpenAI API configuration would be shown here in a complete implementation.",
                          });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Configure
                      </Button>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-medium">ElevenLabs</h4>
                        <p className="text-xs text-muted-foreground">High-quality voice synthesis</p>
                      </div>
                      <Button 
                        onClick={() => {
                          toast({
                            title: "API Configuration",
                            description: "ElevenLabs API configuration would be shown here in a complete implementation.",
                          });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Configure
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/*Local Model Settings Card removed */}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="voice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voice Settings</CardTitle>
              <CardDescription>Configure voice input and output</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Voice settings would be shown here in a complete implementation.
                </p>
                <Button 
                  onClick={() => {
                    toast({
                      title: "Voice Settings",
                      description: "Voice functionality would be configured here in a complete implementation.",
                    });
                  }}
                >
                  Voice test
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme Settings</CardTitle>
              <CardDescription>Customize the appearance of Xeno AI</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Theme settings would be shown here in a complete implementation.
                </p>
                <Button 
                  onClick={() => {
                    toast({
                      title: "Theme Settings",
                      description: "Theme customization would be available here in a complete implementation.",
                    });
                  }}
                >
                  Select theme
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>About Xeno AI</CardTitle>
              <CardDescription>Information about this application</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Xeno AI Assistant</h3>
                  <p className="text-sm text-muted-foreground">
                    Version 0.1.0 (Alpha)
                  </p>
                  <p className="text-sm">
                    Xeno AI is an intelligent assistant that combines conversational search with 
                    voice control. It uses a tiered approach with local models for basic conversations
                    and cloud models for complex processing.
                  </p>
                </div>

                <Separator />

                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Technologies</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• React with TypeScript frontend</li>
                    <li>• Node.js Express backend</li>
                    <li>• Local LLM integration</li>
                    <li>• OpenAI API for advanced processing</li>
                    <li>• ElevenLabs for voice synthesis</li>
                    <li>• Websocket for real-time communication</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}