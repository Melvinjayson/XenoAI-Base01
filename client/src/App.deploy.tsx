import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

// Simple Home component
const Home = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-purple-600 to-blue-400 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl w-full">
        <h1 className="text-3xl font-bold text-center mb-6 text-purple-700">Xeno AI</h1>
        <p className="text-gray-700 mb-4 text-center">
          Advanced AI-powered assistant with multi-agent collaboration, knowledge visualization, and autonomous data acquisition.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <FeatureCard 
            title="Multi-Agent System" 
            description="Specialized agents work together to provide comprehensive analysis and insights"
          />
          <FeatureCard 
            title="Knowledge Graphs" 
            description="Visual exploration of relationships between concepts, entities, and ideas"
          />
          <FeatureCard 
            title="Autonomous Learning" 
            description="Continuously improves with meta-learning engine and feedback loops"
          />
        </div>
        
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/chat" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
            Start Chatting
          </Link>
          <Link to="/features" className="bg-transparent border border-purple-600 text-purple-600 hover:bg-purple-50 font-bold py-2 px-4 rounded">
            Explore Features
          </Link>
        </div>
      </div>
    </div>
  );
};

// Feature Card component
const FeatureCard = ({ title, description }: { title: string; description: string }) => {
  return (
    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
      <h3 className="font-bold text-lg mb-2 text-purple-600">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
};

// Simple Chat Page
const ChatPage = () => {
  const [messages, setMessages] = useState<{text: string, isUser: boolean}[]>([
    { text: "Hello! I'm Xeno AI. How can I help you today?", isUser: false }
  ]);
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    // Add user message
    setMessages([...messages, { text: inputValue, isUser: true }]);
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [
        ...prev, 
        { 
          text: "I understand you're asking about \"" + inputValue + "\". As this is a demo, I'm providing a simulated response. The full Xeno AI system would use its advanced multi-agent framework to give you comprehensive information.", 
          isUser: false 
        }
      ]);
    }, 1000);
    
    setInputValue("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-purple-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">Xeno AI</Link>
          <nav>
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
                  ? 'bg-purple-600 text-white rounded-br-none' 
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
            placeholder="Type your message..."
          />
          <button 
            onClick={handleSendMessage}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

// Features Page
const FeaturesPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-purple-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">Xeno AI</Link>
          <nav>
            <Link to="/chat" className="ml-4 hover:underline">Chat</Link>
          </nav>
        </div>
      </header>
      
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-center text-purple-700">Xeno AI Features</h1>
        
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
          <Link to="/chat" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg">
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
      <h3 className="text-xl font-bold mb-3 text-purple-600">{title}</h3>
      <p className="text-gray-700">{description}</p>
    </div>
  );
};

// 404 Page
const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-purple-600 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">Page Not Found</h2>
        <p className="text-gray-600 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
          Go Home
        </Link>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;