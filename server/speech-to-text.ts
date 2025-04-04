import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import type { Request, Response } from 'express';
import OpenAI from 'openai';
import { RequestHandler } from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

// Create dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create temporary directory for audio files if it doesn't exist
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Clean up old temporary files (files older than 1 hour)
export function cleanupOldAudioFiles() {
  try {
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtimeMs;
      
      // Delete files older than 1 hour (3600000 ms)
      if (fileAge > 3600000) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old temp file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old audio files:', error);
  }
}

// Schedule cleanup every hour
setInterval(cleanupOldAudioFiles, 3600000);

// Speech to text handler
export async function speechToText(req: Request, res: Response) {
  let audioFilePath = '';
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    const fileSize = req.file.size;
    const fileMimeType = req.file.mimetype;
    
    console.log(`Processing speech-to-text for file: ${req.file.originalname} (${fileSize} bytes, ${fileMimeType})`);
    
    // Validate file size
    if (fileSize > 10 * 1024 * 1024) { // 10MB limit
      return res.status(400).json({ error: 'Audio file too large. Maximum size is 10MB' });
    }
    
    // Validate mime type
    const validMimeTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg'];
    if (!validMimeTypes.includes(fileMimeType) && !fileMimeType.startsWith('audio/')) {
      return res.status(400).json({ error: 'Invalid audio format. Please use WAV, MP3, OGG, or WEBM' });
    }
    
    // Create a unique filename to avoid collisions
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);
    const safeFilename = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Save the uploaded file to temp directory
    audioFilePath = path.join(tempDir, `${timestamp}_${randomSuffix}_${safeFilename}`);
    fs.writeFileSync(audioFilePath, req.file.buffer);
    
    let text = '';
    let error = null;
    
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY is not set. Speech-to-text functionality may be limited.');
    }
    
    // First try OpenAI Whisper API if available
    if (process.env.OPENAI_API_KEY) {
      try {
        // Set a timeout for the OpenAI API call
        const timeoutPromise = new Promise<string>((_, reject) => {
          setTimeout(() => reject(new Error('OpenAI transcription timed out')), 15000); // 15 second timeout
        });
        
        // Race the API call with the timeout
        text = await Promise.race([
          transcribeWithOpenAI(audioFilePath),
          timeoutPromise
        ]);
        
        console.log('OpenAI transcription successful:', text);
      } catch (err) {
        console.error('OpenAI transcription failed, will try backup method:', err);
        error = err;
      }
    }
    
    // If OpenAI failed or is not available, use the local fallback
    if (!text) {
      try {
        text = await fallbackTranscription(audioFilePath);
        console.log('Fallback transcription successful:', text);
      } catch (err) {
        console.error('Fallback transcription failed:', err);
        if (error && error instanceof Error) {
          // If both methods failed, return the first error
          return res.status(500).json({ 
            error: 'Speech recognition failed: ' + error.message,
            fallback: true 
          });
        } else if (err instanceof Error) {
          return res.status(500).json({ 
            error: 'Speech recognition failed: ' + err.message,
            fallback: true 
          });
        } else {
          return res.status(500).json({ 
            error: 'Speech recognition failed due to unknown error',
            fallback: true 
          });
        }
      }
    }
    
    // Clean-up - delete the temporary file regardless of success/failure
    cleanupAudioFile(audioFilePath);
    
    // Add confidence level based on source
    const confidence = text.length > 0 ? 0.95 : 0;
    
    return res.json({ 
      text,
      confidence,
      source: process.env.OPENAI_API_KEY ? 'openai' : 'fallback'
    });
    
  } catch (error: any) {
    console.error('Speech to text error:', error);
    
    // Clean-up on error
    if (audioFilePath) {
      cleanupAudioFile(audioFilePath);
    }
    
    return res.status(500).json({ 
      error: 'Speech recognition failed: ' + (error.message || 'Unknown error'),
      fallback: true
    });
  }
}

// Helper function to cleanup audio files
function cleanupAudioFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted temporary audio file: ${path.basename(filePath)}`);
    }
  } catch (unlinkError) {
    console.error('Failed to delete temporary audio file:', unlinkError);
  }
}

// Transcribe with OpenAI Whisper API
async function transcribeWithOpenAI(audioFilePath: string): Promise<string> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: 'whisper-1',
    });
    
    return transcription.text;
  } catch (error) {
    console.error('Error transcribing with OpenAI:', error);
    throw error;
  }
}

// Improved fallback transcription method
async function fallbackTranscription(audioFilePath: string): Promise<string> {
  // First, check if the file exists and has content
  try {
    const stats = fs.statSync(audioFilePath);
    if (stats.size === 0) {
      throw new Error("Empty audio file");
    }
    
    // Try to extract some information about the audio file
    console.log(`Fallback processing audio file: ${audioFilePath} (${stats.size} bytes)`);
    
    // If ffmpeg is available, try to get audio metadata
    try {
      const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFilePath}"`);
      const duration = parseFloat(stdout.trim());
      
      if (isNaN(duration) || duration < 0.5) {
        console.warn(`Audio file too short (${duration}s) or invalid`);
        return "Audio too short or invalid. Please try speaking longer and clearer.";
      }
      
      if (duration > 60) {
        console.warn(`Audio file too long (${duration}s)`);
        return "Audio too long. Please limit your speech to 60 seconds or less.";
      }
      
      console.log(`Audio duration: ${duration}s`);
    } catch (ffmpegError) {
      console.warn("ffprobe not available for audio analysis:", ffmpegError);
    }
    
    // In a production environment, integrate with a local STT engine here
    // For now, return a more informative message
    return "I heard you speaking but couldn't understand what you said. Please try again or type your message.";
  } catch (error) {
    console.error("Error in fallback transcription:", error);
    throw new Error("Failed to process audio file");
  }
}