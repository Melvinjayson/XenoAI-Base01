import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useOnboarding } from "@/context/onboarding-context";
import { useTheme } from "@/context/theme-context";

const welcomeFormSchema = z.object({
  name: z.string().min(1, "Please enter your name").max(50),
  useVoiceInteraction: z.boolean().default(false),
  preferDarkMode: z.boolean().default(false),
  highContrast: z.boolean().default(false),
  reducedMotion: z.boolean().default(false),
  largerText: z.boolean().default(false),
});

type WelcomeFormValues = z.infer<typeof welcomeFormSchema>;

interface WelcomeScreenProps {
  open: boolean;
  onClose: () => void;
}

export function WelcomeScreen({ open, onClose }: WelcomeScreenProps) {
  const { startOnboarding, updatePreferences, updateAccessibility } = useOnboarding();
  const { setThemeMode, setHighContrast, setReducedMotion, setFontSize } = useTheme();
  const [step, setStep] = useState<"welcome" | "preferences">("welcome");

  const form = useForm<WelcomeFormValues>({
    resolver: zodResolver(welcomeFormSchema),
    defaultValues: {
      name: "",
      useVoiceInteraction: false,
      preferDarkMode: false,
      highContrast: false,
      reducedMotion: false,
      largerText: false,
    },
  });

  const onSubmit = (data: WelcomeFormValues) => {
    // Save name in local storage
    localStorage.setItem("user_name", data.name);
    
    // Update theme preferences
    if (data.preferDarkMode) {
      setThemeMode("dark");
    }
    
    // Update accessibility
    setHighContrast(data.highContrast);
    setReducedMotion(data.reducedMotion ? "on" : "off");
    setFontSize(data.largerText ? "large" : "medium");
    
    // Update onboarding preferences
    updatePreferences({
      useVoiceInteraction: data.useVoiceInteraction,
      preferredTheme: data.preferDarkMode ? "dark" : "light",
    });
    
    updateAccessibility("highContrast", data.highContrast);
    updateAccessibility("reducedMotion", data.reducedMotion);
    updateAccessibility("largerText", data.largerText);
    
    // Close dialog and start onboarding
    onClose();
    startOnboarding();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        {step === "welcome" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Welcome to AI Assistant</DialogTitle>
              <DialogDescription>
                Your personal AI assistant that helps you find information, learn new topics,
                and keep track of what matters to you.
              </DialogDescription>
            </DialogHeader>
            <div className="py-8 flex flex-col items-center">
              <img
                src="/logo.png" 
                alt="AI Assistant Logo"
                className="w-24 h-24 mb-4"
                onError={(e) => {
                  // If logo doesn't exist, replace with a placeholder
                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 24 24' fill='none' stroke='%236B4BFF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.25'/%3E%3Cpath d='M21 3v4h-4'/%3E%3Cpath d='M21 3 9 15'/%3E%3C/svg%3E";
                }}
              />
              <p className="text-center text-muted-foreground">
                Let's take a moment to personalize your experience.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setStep("preferences")} className="w-full">
                Get Started
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Personalize Your Experience</DialogTitle>
              <DialogDescription>
                Tell us a bit about yourself so we can make your experience better.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" {...field} />
                      </FormControl>
                      <FormDescription>
                        We'll use this to personalize your experience
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="useVoiceInteraction"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Voice Interaction</FormLabel>
                        <FormDescription>
                          Enable voice commands and responses
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="preferDarkMode"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Dark Mode</FormLabel>
                        <FormDescription>
                          Use dark theme for the interface
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Accessibility Options</h3>
                  
                  <FormField
                    control={form.control}
                    name="highContrast"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>High Contrast</FormLabel>
                          <FormDescription>
                            Increase contrast for better visibility
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="reducedMotion"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Reduced Motion</FormLabel>
                          <FormDescription>
                            Minimize animations and motion effects
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="largerText"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Larger Text</FormLabel>
                          <FormDescription>
                            Increase text size throughout the app
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setStep("welcome")}>
                    Back
                  </Button>
                  <Button type="submit">Start Using AI Assistant</Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}