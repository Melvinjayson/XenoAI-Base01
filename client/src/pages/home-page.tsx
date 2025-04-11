import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Bot, Scroll, Brain, Scale, Heart, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-serif text-xl font-bold">Xeno AI</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/about">
              <a className="text-sm font-medium transition-colors hover:text-primary">About</a>
            </Link>
            <Link href="/features">
              <a className="text-sm font-medium transition-colors hover:text-primary">Features</a>
            </Link>
            <Link href="/chat">
              <Button variant="outline">Begin with Reason</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 py-20 md:py-32 mx-auto max-w-7xl">
        <div className="text-center space-y-6">
          <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
            Rational Intelligence for a Resilient World
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Inspired by Stoic wisdom, designed for ethical clarity
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
            <Link href="/splash">
              <Button size="lg" className="font-medium">
                Begin with Reason
              </Button>
            </Link>
            <Link href="/chat">
              <Button size="lg" variant="outline">
                Experience AI Wisdom
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Core Principles */}
      <section className="px-4 py-16 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <h2 className="font-serif text-3xl font-bold text-center mb-12">Core Principles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 hover:border-primary transition-colors">
              <Brain className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-serif text-xl font-semibold mb-2">Logos (Reason)</h3>
              <p className="text-muted-foreground">Rational decision-making through advanced AI algorithms guided by stoic principles</p>
            </Card>
            <Card className="p-6 hover:border-primary transition-colors">
              <Scale className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-serif text-xl font-semibold mb-2">Ethical Computation</h3>
              <p className="text-muted-foreground">Balanced analysis ensuring decisions align with virtuous principles</p>
            </Card>
            <Card className="p-6 hover:border-primary transition-colors">
              <Heart className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-serif text-xl font-semibold mb-2">Eudaimonia</h3>
              <p className="text-muted-foreground">AI assistance focused on genuine human flourishing and well-being</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Applications */}
      <section className="px-4 py-16">
        <div className="container mx-auto max-w-7xl">
          <h2 className="font-serif text-3xl font-bold text-center mb-12">Practical Applications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Scroll className="h-8 w-8 text-primary" />
              <h3 className="font-serif text-2xl font-semibold">Knowledge Synthesis</h3>
              <p className="text-muted-foreground">Combining ancient wisdom with modern insights for better decision-making</p>
            </div>
            <div className="space-y-4">
              <Users className="h-8 w-8 text-primary" />
              <h3 className="font-serif text-2xl font-semibold">Ethical Guidance</h3>
              <p className="text-muted-foreground">AI-powered support for navigating complex moral challenges</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 bg-primary/5">
        <div className="container mx-auto max-w-7xl text-center">
          <h2 className="font-serif text-3xl font-bold mb-6">Join the Ethos</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Become part of a community dedicated to ethical AI and philosophical wisdom
          </p>
          <Link href="/chat">
            <Button size="lg" variant="default">Begin Your Journey</Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;