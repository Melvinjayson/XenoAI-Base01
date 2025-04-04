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
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    console.log(`Processing speech-to-text for file: ${req.file.originalname}`);
    
    // Save the uploaded file to temp directory
    const audioFilePath = path.join(tempDir, `${Date.now()}_${req.file.originalname}`);
    fs.writeFileSync(audioFilePath, req.file.buffer);
    
    let text = '';
    let error = null;
    
    // First try OpenAI Whisper API if available
    if (process.env.OPENAI_API_KEY) {
      try {
        text = await transcribeWithOpenAI(audioFilePath);
      } catch (err) {
        console.error('OpenAI transcription failed, will try backup method:', err);
        error = err;
      }
    }
    
    // If OpenAI failed or is not available, use the local fallback
    if (!text) {
      try {
        text = await fallbackTranscription(audioFilePath);
      } catch (err) {
        console.error('Fallback transcription failed:', err);
        if (error && error instanceof Error) {
          // If both methods failed, return the first error
          return res.status(500).json({ error: 'Speech recognition failed: ' + error.message });
        } else if (err instanceof Error) {
          return res.status(500).json({ error: 'Speech recognition failed: ' + err.message });
        } else {
          return res.status(500).json({ error: 'Speech recognition failed due to unknown error' });
        }
      }
    }
    
    // Delete the temporary file
    try {
      fs.unlinkSync(audioFilePath);
    } catch (unlinkError) {
      console.error('Failed to delete temporary audio file:', unlinkError);
    }
    
    return res.json({ text });
    
  } catch (error: any) {
    console.error('Speech to text error:', error);
    return res.status(500).json({ error: 'Speech recognition failed: ' + error.message });
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

// Simple fallback transcription method
async function fallbackTranscription(audioFilePath: string): Promise<string> {
  // This is a placeholder - in a production environment, you would 
  // implement a real fallback using a local speech recognition library
  // For example: using Mozilla DeepSpeech, Vosk, or other local STT engines
  
  // Simulate a delay for testing purposes
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return a placeholder message
  return "Speech recognition is currently unavailable. Please type your message instead.";
}