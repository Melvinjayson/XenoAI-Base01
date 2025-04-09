import React from 'react';

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-400">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-6 text-purple-700">Xeno AI</h1>
        <p className="text-gray-700 mb-4">
          Welcome to Xeno AI, an advanced conversational AI assistant with powerful features
          including multi-agent collaboration, knowledge visualization, and autonomous data acquisition.
        </p>
        <div className="p-4 bg-purple-50 rounded-md mb-4">
          <h2 className="font-bold text-lg mb-2 text-purple-600">Ready for Deployment</h2>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>Multi-agent collaborative system</li>
            <li>Knowledge graph visualization</li>
            <li>Autonomous data acquisition</li>
            <li>Voice and text interactions</li>
            <li>Meta-learning engine</li>
          </ul>
        </div>
        <div className="flex justify-center">
          <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;