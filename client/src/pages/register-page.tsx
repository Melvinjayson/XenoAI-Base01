import { useEffect } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import { useAuth } from "@/context/auth-context";
import { useLocation } from "wouter";

export default function RegisterPage() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-b from-background to-secondary/20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent mb-2">
            Xeno AI
          </h1>
          <p className="text-muted-foreground">
            Create an account to get started with Xeno AI
          </p>
        </div>

        <RegisterForm />

        <p className="text-center text-xs text-muted-foreground mt-8">
          By creating an account, you agree to our{" "}
          <a href="#" className="underline underline-offset-4 hover:text-primary">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}