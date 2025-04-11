import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

// Define user type
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "user" | "admin";
  apiKey?: string;
  settings?: UserSettings;
  createdAt: string;
}

export interface UserSettings {
  theme: "light" | "dark" | "system";
  notifications: boolean;
  apiKeyValid: boolean;
  defaultVoice: string;
  enableAIFeatures: boolean;
  usageLimit?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<boolean>;
  saveApiKey: (key: string) => Promise<boolean>;
  verifyApiKey: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
}

// Default user settings
const defaultUserSettings: UserSettings = {
  theme: "system",
  notifications: true,
  apiKeyValid: false,
  defaultVoice: "default",
  enableAIFeatures: true,
};

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem("xenoUser");
        if (storedUser) {
          // In a real app, we would verify the token with the backend here
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error("Authentication error:", err);
        localStorage.removeItem("xenoUser");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // In a real app, this would be an API call to your backend
      // For demo purposes, we'll simulate a successful login
      
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Example API call
      // const response = await fetch("/api/auth/login", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email, password }),
      // });
      
      // if (!response.ok) {
      //   const data = await response.json();
      //   throw new Error(data.message || "Login failed");
      // }
      
      // const data = await response.json();
      
      // For demo, create a dummy user
      const dummyUser: User = {
        id: "user-" + Math.floor(Math.random() * 10000),
        name: email.split("@")[0],
        email,
        role: "user",
        settings: defaultUserSettings,
        createdAt: new Date().toISOString(),
      };

      // Save to localStorage (in a real app, we'd store a token instead)
      localStorage.setItem("xenoUser", JSON.stringify(dummyUser));
      setUser(dummyUser);
      
      toast({
        title: "Logged in successfully",
        description: `Welcome back, ${dummyUser.name}!`,
      });
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      toast({
        title: "Login failed",
        description: message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!name || !email || !password) {
        throw new Error("Name, email and password are required");
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Example API call
      // const response = await fetch("/api/auth/register", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ name, email, password }),
      // });
      
      // if (!response.ok) {
      //   const data = await response.json();
      //   throw new Error(data.message || "Registration failed");
      // }
      
      // const data = await response.json();
      
      // For demo, create a dummy user
      const dummyUser: User = {
        id: "user-" + Math.floor(Math.random() * 10000),
        name,
        email,
        role: "user",
        settings: defaultUserSettings,
        createdAt: new Date().toISOString(),
      };

      // Save to localStorage
      localStorage.setItem("xenoUser", JSON.stringify(dummyUser));
      setUser(dummyUser);
      
      toast({
        title: "Registration successful",
        description: `Welcome to Xeno AI, ${name}!`,
      });
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
      toast({
        title: "Registration failed",
        description: message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("xenoUser");
    setUser(null);
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  };

  // Update user settings
  const updateUserSettings = async (settings: Partial<UserSettings>): Promise<boolean> => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Example API call
      // const response = await fetch("/api/user/settings", {
      //   method: "PUT",
      //   headers: { 
      //     "Content-Type": "application/json",
      //     "Authorization": `Bearer ${token}`
      //   },
      //   body: JSON.stringify(settings),
      // });
      
      // if (!response.ok) {
      //   const data = await response.json();
      //   throw new Error(data.message || "Failed to update settings");
      // }
      
      // For demo, update the user object
      const updatedUser = {
        ...user,
        settings: {
          ...user.settings,
          ...settings,
        },
      };

      // Save to localStorage
      localStorage.setItem("xenoUser", JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved",
      });
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update settings";
      toast({
        title: "Settings update failed",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  };

  // Save API key
  const saveApiKey = async (key: string): Promise<boolean> => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (!key.trim()) {
        throw new Error("API key cannot be empty");
      }

      // For demo, update the user object
      const updatedUser = {
        ...user,
        apiKey: key,
      };

      // Save to localStorage
      localStorage.setItem("xenoUser", JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      toast({
        title: "API key saved",
        description: "Your API key has been saved. Verifying...",
      });

      // Now verify the key
      return await verifyApiKey();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save API key";
      toast({
        title: "Failed to save API key",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  };

  // Verify API key
  const verifyApiKey = async (): Promise<boolean> => {
    try {
      if (!user || !user.apiKey) {
        throw new Error("No API key to verify");
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Example API call
      // const response = await fetch("/api/verify-api-key", {
      //   method: "POST",
      //   headers: { 
      //     "Content-Type": "application/json",
      //     "Authorization": `Bearer ${token}`
      //   },
      //   body: JSON.stringify({ apiKey: user.apiKey }),
      // });
      
      // if (!response.ok) {
      //   const data = await response.json();
      //   throw new Error(data.message || "API key verification failed");
      // }
      
      // For demo, assume the key is valid
      const isValid = true;

      // Update user settings with validation result
      const updatedUser = {
        ...user,
        settings: {
          ...user.settings,
          apiKeyValid: isValid,
        },
      };

      // Save to localStorage
      localStorage.setItem("xenoUser", JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      toast({
        title: isValid ? "API key verified" : "API key invalid",
        description: isValid 
          ? "Your API key has been verified and is working correctly" 
          : "Please check your API key and try again",
        variant: isValid ? "default" : "destructive",
      });
      
      return isValid;
    } catch (err) {
      const message = err instanceof Error ? err.message : "API key verification failed";
      
      // Update user settings with validation result
      if (user) {
        const updatedUser = {
          ...user,
          settings: {
            ...user.settings,
            apiKeyValid: false,
          },
        };
        
        localStorage.setItem("xenoUser", JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
      
      toast({
        title: "API key verification failed",
        description: message,
        variant: "destructive",
      });
      
      return false;
    }
  };

  // Reset password
  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      if (!email) {
        throw new Error("Email is required");
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Example API call
      // const response = await fetch("/api/auth/reset-password", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email }),
      // });
      
      // if (!response.ok) {
      //   const data = await response.json();
      //   throw new Error(data.message || "Password reset failed");
      // }
      
      toast({
        title: "Password reset email sent",
        description: "If your email is registered, you will receive a link to reset your password",
      });
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Password reset failed";
      toast({
        title: "Password reset failed",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  };

  // Value for the context provider
  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    register,
    logout,
    updateUserSettings,
    saveApiKey,
    verifyApiKey,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}