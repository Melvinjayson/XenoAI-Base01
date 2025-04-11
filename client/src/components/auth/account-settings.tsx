import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  LogOut, 
  Loader2, 
  Check,
  Edit
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserSettings } from "@/context/auth-context";

export function AccountSettings() {
  const { user, logout, updateUserSettings } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [editableSettings, setEditableSettings] = useState<Partial<UserSettings>>({
    theme: user?.settings?.theme || "system",
    notifications: user?.settings?.notifications || true,
    enableAIFeatures: user?.settings?.enableAIFeatures || true,
  });

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>
            You need to be logged in to access account settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <p className="text-muted-foreground">Please log in to view your account settings.</p>
        </CardContent>
      </Card>
    );
  }

  const handleUpdateSettings = async () => {
    setIsUpdating(true);
    try {
      const result = await updateUserSettings(editableSettings);
      if (result) {
        toast({
          title: "Settings updated",
          description: "Your account settings have been saved successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    logout();
    setShowConfirmLogout(false);
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const handleToggleSetting = (key: keyof UserSettings, value: any) => {
    setEditableSettings({
      ...editableSettings,
      [key]: value,
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>
          Manage your account settings and preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Settings className="h-4 w-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* User Profile */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-lg bg-primary/10">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="font-medium text-lg">{user.name}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex items-center">
                  <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                    {user.role}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    Member since {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Information */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="display-name">Display Name</Label>
                <div className="flex">
                  <Input 
                    id="display-name" 
                    value={user.name} 
                    disabled 
                    className="flex-1 mr-2"
                  />
                  <Button variant="outline" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={user.email} 
                  disabled 
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            {/* Theme Preference */}
            <div className="space-y-4">
              <h3 className="font-semibold">Display</h3>
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="theme">Theme</Label>
                    <p className="text-sm text-muted-foreground">
                      Choose your preferred theme
                    </p>
                  </div>
                  <select
                    id="theme"
                    value={editableSettings.theme}
                    onChange={(e) => handleToggleSetting("theme", e.target.value)}
                    className="px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notifications">Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about updates and activity
                    </p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={editableSettings.notifications}
                    onCheckedChange={(checked) => handleToggleSetting("notifications", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="ai-features">AI Features</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable advanced AI-powered features
                    </p>
                  </div>
                  <Switch
                    id="ai-features"
                    checked={editableSettings.enableAIFeatures}
                    onCheckedChange={(checked) => handleToggleSetting("enableAIFeatures", checked)}
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={handleUpdateSettings} 
              disabled={isUpdating}
              className="w-full"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" /> Save Preferences
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            {/* Security Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold">Account Security</h3>
              
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="flex">
                  <Input 
                    id="password" 
                    type="password" 
                    value="••••••••••" 
                    disabled 
                    className="flex-1 mr-2"
                  />
                  <Button variant="outline">Change</Button>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => setShowConfirmLogout(true)}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showConfirmLogout} onOpenChange={setShowConfirmLogout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to sign out?</DialogTitle>
            <DialogDescription>
              You will need to sign in again to access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowConfirmLogout(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}