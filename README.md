# Xeno AI

Xeno AI is an advanced conversational AI assistant that combines natural language processing, knowledge graph visualization, and autonomous data acquisition to provide intelligent, contextual responses.

## Features

- **Multi-Agent Collaboration**: Specialized sub-agents work together to provide comprehensive analysis and insights
- **Autonomous Data Acquisition**: System autonomously gathers data from various sources to enhance its knowledge base
- **Knowledge Visualization**: Interactive knowledge graph for exploring entity-topic relationships
- **Multi-Modal Interactions**: Support for text, voice, image, and file-based interactions
- **Advanced Search**: Comprehensive search with filtering options and natural language query processing
- **Meta-Learning Engine**: Continuous improvement through feedback loops and pattern identification

## Getting Started

### Prerequisites

- Node.js v20 or higher
- PostgreSQL (for persistent storage)
- OpenAI API Key (for advanced processing)
- ElevenLabs API Key (optional, for enhanced voice synthesis)

### Environment Variables

Create a `.env` file with the following variables:

```
# Server configuration
PORT=5000
NODE_ENV=production

# Session configuration
SESSION_SECRET=<your-session-secret>

# Database configuration (if using PostgreSQL)
DATABASE_URL=<your-database-url>

# OpenAI API Key
OPENAI_API_KEY=<your-openai-api-key>

# ElevenLabs API Key (optional)
ELEVENLABS_API_KEY=<your-elevenlabs-api-key>

# AI Model fallback strategy
MODEL_FALLBACK_ENABLED=true
DEFAULT_LOCAL_MODEL=true
COMPLEXITY_THRESHOLD=0.7
```

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/xeno-ai.git
   cd xeno-ai
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the application:
   ```
   npm run build
   ```

4. Start the server:
   ```
   npm start
   ```

The application will be available at http://localhost:5000.

### Docker Deployment

1. Build the Docker image:
   ```
   docker build -t xeno-ai .
   ```

2. Run the container:
   ```
   docker run -p 5000:5000 --env-file .env xeno-ai
   ```

## Deployment on Replit

This application is ready to be deployed on Replit. Simply click the "Deploy" button to start the deployment process.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.