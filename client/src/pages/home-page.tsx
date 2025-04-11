
import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Bot, Brain, ChevronRight, Network, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-serif text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">Xeno AI</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/about">
              <a className="text-sm font-medium transition-colors hover:text-primary">About</a>
            </Link>
            <Link href="/features">
              <a className="text-sm font-medium transition-colors hover:text-primary">Features</a>
            </Link>
            <Link href="/chat">
              <Button variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
                Begin Journey
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="container mx-auto max-w-7xl relative">
          <div className="text-center space-y-6">
            <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
              Rational Intelligence for a<br />Resilient World
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Inspired by Stoic wisdom, engineered for ethical clarity. Experience AI that combines ancient principles with cutting-edge technology.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
              <Link href="/splash">
                <Button size="lg" className="group bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all">
                  Begin with Reason
                  <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/chat">
                <Button size="lg" variant="outline" className="hover:bg-primary/5 transition-colors">
                  Experience AI Wisdom
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Principles */}
      <section className="px-4 py-16 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <h2 className="font-serif text-3xl font-bold text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            Core Principles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "Logos (Reason)",
                description: "Rational decision-making through advanced AI algorithms guided by stoic principles"
              },
              {
                icon: Search,
                title: "Ethical Computation",
                description: "Balanced analysis ensuring decisions align with virtuous principles"
              },
              {
                icon: Network,
                title: "Eudaimonia",
                description: "AI assistance focused on genuine human flourishing and well-being"
              }
            ].map((principle, index) => (
              <Card key={index} className="p-6 group hover:shadow-lg transition-all duration-300 hover:border-primary/50 bg-gradient-to-br from-background to-muted/20">
                <principle.icon className="h-8 w-8 text-primary mb-4 transition-transform group-hover:scale-110" />
                <h3 className="font-serif text-xl font-semibold mb-2">{principle.title}</h3>
                <p className="text-muted-foreground">{principle.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Applications */}
      <section className="relative px-4 py-16">
        <div className="container mx-auto max-w-7xl">
          <h2 className="font-serif text-3xl font-bold text-center mb-12">
            Practical Applications
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-background to-muted/10">
              <div className="space-y-4">
                <div className="p-3 bg-primary/10 rounded-lg w-fit">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-serif text-2xl font-semibold">Knowledge Synthesis</h3>
                <p className="text-muted-foreground">
                  Combining ancient wisdom with modern insights for better decision-making
                </p>
              </div>
            </Card>
            <Card className="p-8 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-background to-muted/10">
              <div className="space-y-4">
                <div className="p-3 bg-primary/10 rounded-lg w-fit">
                  <Network className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-serif text-2xl font-semibold">Ethical Guidance</h3>
                <p className="text-muted-foreground">
                  AI-powered support for navigating complex moral challenges
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="container mx-auto max-w-7xl text-center">
          <h2 className="font-serif text-3xl font-bold mb-6">Join the Ethos</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Become part of a community dedicated to ethical AI and philosophical wisdom
          </p>
          <Link href="/chat">
            <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all">
              Begin Your Journey
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
