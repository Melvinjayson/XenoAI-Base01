import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useColorPalette } from '@/context/color-palette-context';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SplashScreen() {
  const navigate = useNavigate();
  const { loading, error } = useColorPalette();
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (error) {
      setShowError(true);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-background flex flex-col items-center justify-center p-4 space-y-8">
      <div className="text-center space-y-4">
        <div className="bg-primary/10 p-6 rounded-2xl mb-6">
          <img src="/icons/icon-512x512.svg" alt="Xeno AI Logo" className="w-24 h-24 mx-auto" />
        </div>

        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-600">
          XENO AI
        </h1>

        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Your intelligent companion for knowledge discovery and learning
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full mt-12">
        <Feature
          icon="🧠"
          title="AI-Powered Learning"
          description="Intelligent analysis and personalized insights"
        />
        <Feature
          icon="🔍"
          title="Smart Discovery"
          description="Find and connect knowledge effortlessly"
        />
        <Feature
          icon="🗺️"
          title="Knowledge Mapping"
          description="Visualize and understand complex topics"
        />
      </div>

      {showError && (
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            Failed to load color palettes. Using default theme.
          </AlertDescription>
        </Alert>
      )}

      <Button
        size="lg"
        className="mt-8"
        onClick={() => navigate('/home')}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          'Start Exploring'
        )}
      </Button>

      <p className="text-sm text-muted-foreground mt-4">
        Ready to begin your learning journey
      </p>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-background/60 backdrop-blur-sm rounded-lg p-6 shadow-lg">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}