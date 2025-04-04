import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';
import { ChevronLeft, Home } from 'lucide-react';
import { Button } from './button';

interface StickyHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  backPath?: string;
  backLabel?: string;
  showHomeButton?: boolean;
  rightContent?: React.ReactNode;
}

export function StickyHeader({
  className,
  title,
  subtitle,
  showBackButton = false,
  backPath = '/',
  backLabel = 'Back',
  showHomeButton = false,
  rightContent,
  ...props
}: StickyHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={cn(
        "sticky top-0 z-10 w-full bg-background backdrop-blur-sm transition-all duration-200",
        isScrolled ? "border-b shadow-sm py-2" : "py-4",
        className
      )}
      {...props}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Button variant="ghost" size="sm" asChild>
              <Link to={backPath} className="flex items-center gap-1">
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{backLabel}</span>
              </Link>
            </Button>
          )}
          
          {showHomeButton && (
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <Home className="h-4 w-4" />
              </Link>
            </Button>
          )}
          
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        
        {rightContent && (
          <div>{rightContent}</div>
        )}
      </div>
    </div>
  );
}