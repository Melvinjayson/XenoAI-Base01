import React from 'react';
import { Link } from 'wouter';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  showLogo?: boolean;
  showFooter?: boolean;
}

export function AuthLayout({
  children,
  title,
  subtitle,
  showLogo = true,
  showFooter = true,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-b from-background to-secondary/20">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {showLogo && (
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center mb-3">
                  <Brain className="w-10 h-10 text-primary mr-2" />
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                    Xeno AI
                  </h1>
                </div>
                <p className="text-muted-foreground">
                  {subtitle}
                </p>
              </div>
            )}

            {!showLogo && (
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold">{title}</h1>
                <p className="text-muted-foreground">
                  {subtitle}
                </p>
              </div>
            )}

            {children}

            {showFooter && (
              <div className="mt-8 text-center">
                <p className="text-xs text-muted-foreground">
                  By using Xeno AI, you agree to our{" "}
                  <Link href="/terms">
                    <a className="underline underline-offset-4 hover:text-primary">
                      Terms of Service
                    </a>
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy">
                    <a className="underline underline-offset-4 hover:text-primary">
                      Privacy Policy
                    </a>
                  </Link>
                  .
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}