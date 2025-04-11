import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ChevronRight, Bot, Zap, Brain, Globe, Lock, MessageSquare } from 'lucide-react';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Xeno AI</h1>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/chat">
              <a className="text-sm font-medium hover:text-primary transition-colors">
                Chat
              </a>
            </Link>
            <Link href="/features">
              <a className="text-sm font-medium hover:text-primary transition-colors">
                Features
              </a>
            </Link>
            <Link href="/about">
              <a className="text-sm font-medium hover:text-primary transition-colors">
                About
              </a>
            </Link>
          </nav>
          <div>
            <Button asChild>
              <Link href="/chat">
                <a>Get Started</a>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Intelligent <span className="text-primary">Conversations</span>, Powered by AI
              </h1>
              <p className="text-lg text-muted-foreground">
                Xeno AI combines advanced natural language processing, knowledge graph visualization, and autonomous data acquisition to provide you with intelligent, contextual responses.
              </p>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                <Button size="lg" onClick={() => navigate('/splash')} className="flex items-center">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Get Started
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/chat')} className="flex items-center">
                  Start Chatting
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 p-6 border">
              <div className="aspect-[4/3] relative rounded-lg overflow-hidden bg-background/80 flex items-center justify-center">
                <div className="p-8 text-center">
                  <Bot className="h-16 w-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-semibold mb-2">Xeno AI Assistant</h3>
                  <p className="text-muted-foreground">
                    Explore the power of contextual understanding and intelligent responses
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-background rounded-lg border p-6 transition-all hover:border-primary hover:shadow-md">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-Agent Collaboration</h3>
              <p className="text-muted-foreground">
                Specialized sub-agents work together to provide comprehensive analysis and insights.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-background rounded-lg border p-6 transition-all hover:border-primary hover:shadow-md">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Autonomous Data Acquisition</h3>
              <p className="text-muted-foreground">
                System autonomously gathers data from various sources to enhance its knowledge base.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-background rounded-lg border p-6 transition-all hover:border-primary hover:shadow-md">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Continuous Learning</h3>
              <p className="text-muted-foreground">
                Meta-learning engine continuously improves through feedback loops and pattern identification.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-background rounded-lg border p-6 transition-all hover:border-primary hover:shadow-md">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-Modal Interactions</h3>
              <p className="text-muted-foreground">
                Support for text, voice, image, and file-based interactions for natural communication.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-background rounded-lg border p-6 transition-all hover:border-primary hover:shadow-md">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Enhanced Security</h3>
              <p className="text-muted-foreground">
                Comprehensive security framework with privacy controls and transparency layers.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-background rounded-lg border p-6 transition-all hover:border-primary hover:shadow-md">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Companion Characters</h3>
              <p className="text-muted-foreground">
                Different AI personalities to assist with various tasks and provide specialized guidance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Experience Xeno AI?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Start chatting with our intelligent assistant and discover the power of contextual AI.
          </p>
          <Button size="lg" asChild>
            <Link href="/chat">
              <a className="px-8">Get Started Now</a>
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 mt-auto">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-semibold">Xeno AI</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <Link href="/terms">
                <a className="hover:text-foreground transition-colors">Terms</a>
              </Link>
              <Link href="/privacy">
                <a className="hover:text-foreground transition-colors">Privacy</a>
              </Link>
              <Link href="/about">
                <a className="hover:text-foreground transition-colors">About</a>
              </Link>
            </div>
          </div>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Xeno AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;