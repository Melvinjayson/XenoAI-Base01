import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  Copy, 
  Loader2,
  Key
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ApiKeySetup() {
  const { user, saveApiKey, verifyApiKey } = useAuth();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Handle API key submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setIsSubmitting(true);
    await saveApiKey(apiKey);
    setIsSubmitting(false);
    setApiKey("");
  };

  // Handle API key verification
  const handleVerify = async () => {
    setIsSubmitting(true);
    await verifyApiKey();
    setIsSubmitting(false);
  };

  // Copy API key to clipboard
  const handleCopy = () => {
    if (user?.apiKey) {
      navigator.clipboard.writeText(user.apiKey);
      toast({
        title: "Copied to clipboard",
        description: "API key has been copied to clipboard",
      });
    }
  };

  const apiKeyValid = user?.settings?.apiKeyValid || false;
  const hasApiKey = !!user?.apiKey;

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">AI API Key</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowInfo(true)}
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Set up your OpenAI API key to access advanced AI features
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasApiKey ? (
          <div className="space-y-4">
            <Alert variant={apiKeyValid ? "default" : "destructive"}>
              <div className="flex items-center gap-2">
                {apiKeyValid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {apiKeyValid
                    ? "API Key configured successfully"
                    : "API Key validation failed"}
                </AlertTitle>
              </div>
              <AlertDescription className="mt-1">
                {apiKeyValid
                  ? "Your API key is valid and ready to use with all advanced AI features."
                  : "There was a problem validating your API key. Please verify it is correct."}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="current-api-key">Current API Key</Label>
              <div className="flex items-center">
                <Input
                  id="current-api-key"
                  type="password"
                  value="••••••••••••••••••••••••••"
                  disabled
                  className="font-mono"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="ml-2"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                variant={apiKeyValid ? "outline" : "default"}
                onClick={handleVerify}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setApiKey("")}
                className="flex-1"
              >
                Change API Key
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Your API key is stored securely and never shared.
              </p>
            </div>

            <Button
              type="submit"
              disabled={!apiKey.trim() || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                </>
              ) : (
                "Save API Key"
              )}
            </Button>
          </form>
        )}
      </CardContent>

      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>About API Keys</DialogTitle>
            <DialogDescription>
              Understanding how Xeno AI uses your OpenAI API key
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <Key className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium">What is an API key?</h4>
                <p className="text-sm text-muted-foreground">
                  An API key is like a password that allows Xeno AI to use OpenAI's advanced AI models on your behalf.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium">Why do I need to provide my own?</h4>
                <p className="text-sm text-muted-foreground">
                  Using your own API key allows for more advanced features and ensures you have full control over usage and billing.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium">How to get an API key</h4>
                <p className="text-sm text-muted-foreground">
                  You can obtain an API key by creating an account on OpenAI's website and navigating to the API section.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium">Security</h4>
                <p className="text-sm text-muted-foreground">
                  Your API key is stored securely on your device and is only used to make requests to OpenAI's services.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowInfo(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}