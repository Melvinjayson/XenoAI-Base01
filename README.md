# Xeno AI

## Overview
Xeno AI is an intelligent AI-powered development assistant that transforms coding into an engaging, intuitive experience through advanced technological integration and user-centric design.

## Key Features
- **Natural Language Interface**: Engage in natural conversations with the AI
- **Voice Control**: Speak to Xeno and hear responses using voice synthesis
- **Knowledge Graph Visualization**: See relationships between concepts visually
- **Mobile-Optimized**: Designed with touch-friendly controls for mobile devices
- **Contextual Memory**: The system remembers context for meaningful follow-ups
- **Tiered AI Processing**: Uses local LLMs for basic tasks, cloud services for complex reasoning
- **WebSocket Integration**: Real-time updates and notifications
- **Offline Capabilities**: Core functionality available without internet connection
- **Customizable Interface**: Personalize the look and feel of your experience

## Technical Stack
- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js with Express
- **AI Services**: OpenAI (GPT-4o, GPT-3.5 Turbo, embeddings), ElevenLabs (voice synthesis)
- **Local Processing**: On-device language processing for basic interactions
- **Connectivity**: WebSockets for real-time communication

## Getting Started
1. Clone this repository
2. Set up environment variables:
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `ELEVENLABS_API_KEY` - Your ElevenLabs API key (optional)
3. Start the application using the provided workflow
4. Access the application at the deployed URL

## Architecture
The application follows a tiered approach to AI processing:
- **Basic tasks**: Handled by free, open-source local LLMs
- **Complex reasoning**: Processed by advanced cloud APIs
- **Voice synthesis**: Uses a fallback chain (ElevenLabs → OpenAI TTS → browser TTS)

## License
Copyright © 2025 Xeno AI
