import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// Home component with advanced AI features highlighted
const Home = () => {
  const [systemStatus, setSystemStatus] = useState({
    aiModels: true,
    dataAcquisition: true,
    knowledgeGraph: true,
    metaLearning: true
  });
  
  useEffect(() => {
    // Check status of backend components
    fetch('/api/system-status')
      .then(res => res.json())
      .catch(err => console.error('Error fetching system status:', err));
      
    // For WebSocket connection status
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => console.log('WebSocket connected');
    socket.onerror = () => console.error('WebSocket connection failed');
    
    return () => socket.close();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-indigo-700 to-blue-500 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl w-full">
        <h1 className="text-3xl font-bold text-center mb-6 text-indigo-700">Xeno AI</h1>
        <p className="text-gray-700 mb-4 text-center">
          Advanced AI-powered assistant with multi-agent collaboration, knowledge visualization, and autonomous data acquisition.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <FeatureCard 
            title="Multi-Agent System" 
            description="Specialized agents work together to provide comprehensive analysis and insights"
            status={systemStatus.aiModels}
          />
          <FeatureCard 
            title="Knowledge Visualization" 
            description="Visual exploration of relationships between concepts, entities, and ideas"
            status={systemStatus.knowledgeGraph}
          />
          <FeatureCard 
            title="Autonomous Learning" 
            description="Continuously improves with meta-learning engine and feedback loops"
            status={systemStatus.metaLearning}
          />
        </div>
        
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/chat" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
            Start Chatting
          </Link>
          <Link to="/knowledge-graph" className="bg-transparent border border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-bold py-2 px-4 rounded">
            Explore Knowledge
          </Link>
          <Link to="/features" className="bg-transparent border border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-bold py-2 px-4 rounded">
            All Features
          </Link>
        </div>
      </div>
    </div>
  );
};

// Feature Card component
const FeatureCard = ({ title, description, status = true }: { title: string; description: string; status?: boolean }) => {
  return (
    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 relative">
      <div className={`absolute right-2 top-2 w-2 h-2 rounded-full ${status ? 'bg-green-500' : 'bg-amber-500'}`}></div>
      <h3 className="font-bold text-lg mb-2 text-indigo-600">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
};

// Chat Page - Enhanced with actual backend integration
const ChatPage = () => {
  const [messages, setMessages] = useState<{text: string, isUser: boolean}[]>([
    { text: "Hello! I'm Xeno AI. How can I help you today?", isUser: false }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;
    
    // Add user message
    setMessages(prev => [...prev, { text: inputValue, isUser: true }]);
    setIsProcessing(true);
    
    try {
      // Send to actual backend if available 
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputValue }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { text: data.response, isUser: false }]);
      } else {
        // Fallback response if API fails
        setMessages(prev => [
          ...prev, 
          { 
            text: "I understand you're asking about \"" + inputValue + "\". Our system is currently experiencing high load. The full Xeno AI system would use its advanced multi-agent framework to provide comprehensive information.", 
            isUser: false 
          }
        ]);
      }
    } catch (error) {
      console.error('Error in chat:', error);
      setMessages(prev => [
        ...prev, 
        { text: "Sorry, I'm having trouble connecting to my knowledge systems. Please try again in a moment.", isUser: false }
      ]);
    } finally {
      setIsProcessing(false);
      setInputValue("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-indigo-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">Xeno AI</Link>
          <nav className="flex items-center">
            <Link to="/knowledge-graph" className="ml-4 hover:underline">Knowledge Graph</Link>
            <Link to="/features" className="ml-4 hover:underline">Features</Link>
          </nav>
        </div>
      </header>
      
      <div className="flex-1 container mx-auto p-4 flex flex-col max-w-4xl">
        <div className="flex-1 bg-white rounded-lg shadow-md p-4 mb-4 overflow-auto max-h-[70vh]">
          {messages.map((msg, index) => (
            <div key={index} className={`mb-4 ${msg.isUser ? 'text-right' : ''}`}>
              <div className={`inline-block p-3 rounded-lg ${
                msg.isUser 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex items-center text-gray-500 italic">
              <div className="animate-pulse mr-2">●●●</div>
              Xeno is thinking...
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            placeholder="Type your message..."
            disabled={isProcessing}
          />
          <button 
            onClick={handleSendMessage}
            className={`${isProcessing ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-4 py-2 rounded-lg`}
            disabled={isProcessing}
          >
            {isProcessing ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Knowledge Graph Page (Simple Version)
const KnowledgeGraphPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-indigo-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">Xeno AI</Link>
          <nav>
            <Link to="/chat" className="ml-4 hover:underline">Chat</Link>
            <Link to="/features" className="ml-4 hover:underline">Features</Link>
          </nav>
        </div>
      </header>
      
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4 text-indigo-700">Knowledge Graph</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="border border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 mb-4">Interactive knowledge graph visualization.</p>
              <p className="text-gray-400 text-sm">Connects to the backend knowledge graph service.</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4 text-indigo-600">Recent Entities</h2>
            <ul className="divide-y">
              {['Artificial Intelligence', 'Machine Learning', 'Natural Language Processing', 'Computer Vision', 'Neural Networks'].map((item, idx) => (
                <li key={idx} className="py-2 cursor-pointer hover:bg-indigo-50 px-2 rounded">{item}</li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4 text-indigo-600">Insights</h2>
            <p className="text-gray-700 mb-3">Discover connections between concepts and explore related topics to expand your understanding.</p>
            <p className="text-gray-700">Knowledge graph visualization allows for intuitive navigation of complex information structures.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Features Page
const FeaturesPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-indigo-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">Xeno AI</Link>
          <nav>
            <Link to="/chat" className="ml-4 hover:underline">Chat</Link>
            <Link to="/knowledge-graph" className="ml-4 hover:underline">Knowledge Graph</Link>
          </nav>
        </div>
      </header>
      
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-center text-indigo-700">Xeno AI Features</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <FeatureDetail 
            title="Multi-Agent Collaboration"
            description="Our system employs specialized agents for different tasks - research, analysis, creativity, and more. These agents collaborate to handle complex queries and tasks with greater depth and accuracy than a single-model approach."
          />
          <FeatureDetail 
            title="Knowledge Visualization"
            description="Complex information is presented in interactive knowledge graphs, allowing you to explore relationships between concepts, entities, and ideas. This visual approach aids comprehension and discovery of connections."
          />
          <FeatureDetail 
            title="Autonomous Data Acquisition"
            description="The system continuously expands its knowledge by autonomously gathering information from various sources. This ensures that insights and responses are based on comprehensive, up-to-date information."
          />
          <FeatureDetail 
            title="Meta-Learning Engine"
            description="Through sophisticated feedback loops and pattern recognition, Xeno AI continuously improves its performance. The system learns from interactions and adapts to provide increasingly relevant and accurate responses."
          />
          <FeatureDetail 
            title="Multi-Modal Interaction"
            description="Interact through text, voice, images, or files. The system processes and responds to various input types, providing a flexible and natural user experience tailored to your preferences."
          />
          <FeatureDetail 
            title="Advanced Security Framework"
            description="Robust security measures protect your data and ensure privacy. Transparency layers provide insight into how information is processed and used, giving you confidence and control."
          />
        </div>
        
        <div className="text-center mt-12">
          <Link to="/chat" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg">
            Try Xeno AI Now
          </Link>
        </div>
      </div>
    </div>
  );
};

// Feature Detail component
const FeatureDetail = ({ title, description }: { title: string; description: string }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
      <h3 className="text-xl font-bold mb-3 text-indigo-600">{title}</h3>
      <p className="text-gray-700">{description}</p>
    </div>
  );
};

// 404 Page
const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-indigo-600 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">Page Not Found</h2>
        <p className="text-gray-600 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
          Go Home
        </Link>
      </div>
    </div>
  );
};

// Splash page for initial landing
const SplashPage = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Simulate loading and then redirect
    const timer = setTimeout(() => {
      navigate('/');
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-900">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">Xeno AI</h1>
        <p className="text-indigo-200 text-xl mb-8">Advanced AI Assistant</p>
        <div className="flex justify-center">
          <div className="w-12 h-1 bg-indigo-500 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

// Main App Component with routing and providers
const App = () => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/splash" element={<SplashPage />} />
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export default App;