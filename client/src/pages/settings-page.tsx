import React, { useState, useEffect } from 'react';
import { Settings, Info, Zap, Volume2, Palette, Server, User } from 'lucide-react';
import { useLocation } from 'wouter';
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
import { AccountSettings } from '@/components/auth';
import { ApiKeySetup } from '@/components/auth';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('models');
  const [location, setLocation] = useLocation();

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Set account tab as default if authenticated
    if (isAuthenticated && activeTab === 'models') {
      setActiveTab('account');
    }
  }, [isAuthenticated]);

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
        defaultValue={isAuthenticated ? 'account' : 'models'}
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-6 h-auto p-1 md:w-[800px] w-full">
          <TabsTrigger value="account" className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Account</span>
            <span className="sm:hidden">User</span>
          </TabsTrigger>
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
          <TabsTrigger value="system" className="flex items-center">
            <Server className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">System</span>
            <span className="sm:hidden">Sys</span>
          </TabsTrigger>
          <TabsTrigger value="about" className="flex items-center">
            <Info className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">About</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 md:col-span-1">
              <AccountSettings />
            </div>
            
            <div className="space-y-4 md:col-span-1">
              <ApiKeySetup />
            </div>
          </div>
        </TabsContent>

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

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Monitor and manage system components</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-medium">System Status Dashboard</h4>
                    <p className="text-xs text-muted-foreground">Monitor the health of all system components</p>
                  </div>
                  <Button 
                    onClick={() => setLocation('/system-status')}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Server className="h-4 w-4" />
                    View Status
                  </Button>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-medium">Data Acquisition Settings</h4>
                    <p className="text-xs text-muted-foreground">Configure autonomous data sources</p>
                  </div>
                  <Button 
                    onClick={() => {
                      toast({
                        title: "Data Acquisition",
                        description: "Data source configuration would be shown here in a complete implementation.",
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
                    <h4 className="text-sm font-medium">Multi-Agent Settings</h4>
                    <p className="text-xs text-muted-foreground">Configure agent ecosystem behavior</p>
                  </div>
                  <Button 
                    onClick={() => {
                      toast({
                        title: "Multi-Agent Settings",
                        description: "Agent collaboration settings would be shown here in a complete implementation.",
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