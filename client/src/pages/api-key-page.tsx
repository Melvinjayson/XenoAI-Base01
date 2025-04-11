import { ApiKeySetup } from "@/components/auth/api-key-setup";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Link } from "wouter";

export default function ApiKeyPage() {
  const { user } = useAuth();
  const apiKeySet = !!user?.apiKey;
  const apiKeyValid = user?.settings?.apiKeyValid || false;

  return (
    <div className="min-h-screen flex flex-col p-4 bg-gradient-to-b from-background to-secondary/20">
      <div className="container max-w-4xl mx-auto py-8">
        <div className="flex items-center mb-8">
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">API Configuration</h1>
        </div>

        <div className="space-y-8">
          {/* API Status Panel */}
          <div className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">API Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-background rounded-md p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">API Key</span>
                  <div className="flex items-center">
                    {apiKeySet ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {apiKeySet ? "Configured" : "Not configured"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-background rounded-md p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Validation</span>
                  <div className="flex items-center">
                    {apiKeyValid ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {apiKeyValid ? "Valid" : "Invalid or not tested"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* API Key Setup */}
          <ApiKeySetup />

          {/* API Usage Guidelines */}
          <div className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">API Usage Guidelines</h2>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-medium">What models are supported?</h3>
                <p className="text-muted-foreground">
                  Xeno AI currently supports OpenAI's API. Your API key will be used to access models like GPT-4 and GPT-3.5 Turbo.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">How is billing handled?</h3>
                <p className="text-muted-foreground">
                  When you use your own API key, usage costs are billed directly to your OpenAI account. Xeno AI does not charge additional fees for API usage.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">Data privacy</h3>
                <p className="text-muted-foreground">
                  Your API key is stored securely on your device and is used solely to make requests to OpenAI's services. All communication is encrypted.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">Advanced features</h3>
                <p className="text-muted-foreground">
                  With your API key configured, you can access all advanced features including vision analysis, voice interactions, code generation, and knowledge graph visualization.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}