import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';

// Define upload parameters
const fileUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = uuidv4();
      const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, `${uniqueSuffix}-${Date.now()}-${safeFilename}`);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept common document and media files
    const allowedMimeTypes = [
      // Documents
      'application/pdf', 
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/svg+xml',
      // Audio
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      // Video
      'video/mp4',
      'video/quicktime'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported. Please upload a document, image, audio, or video file.'));
    }
  }
}).single('file');

// Upload file handler
export const uploadFile = (req: Request, res: Response) => {
  fileUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ 
        success: false, 
        message: err.message || 'Error uploading file'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file was uploaded'
      });
    }
    
    try {
      const file = req.file;
      const sessionId = req.body.sessionId || 'default';
      
      // Store file metadata in memory storage
      const newFile = await storage.createFile({
        name: file.originalname,
        path: file.path,
        type: file.mimetype,
        size: file.size,
        sessionId,
        url: `/uploads/${path.basename(file.path)}`,
        timestamp: Date.now()
      });
      
      console.log(`File uploaded: ${file.originalname} (${file.size} bytes)`);
      
      res.status(201).json({
        success: true,
        fileId: newFile.id,
        name: file.originalname,
        type: file.mimetype,
        size: file.size,
        url: `/uploads/${path.basename(file.path)}`
      });
      
    } catch (error) {
      console.error('Error handling file upload:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing file upload'
      });
    }
  });
};

// Get file list for a session
export const getSessionFiles = async (req: Request, res: Response) => {
  try {
    const { sessionId = 'default' } = req.params;
    
    const files = await storage.getFilesBySession(sessionId);
    
    res.status(200).json({
      success: true,
      files
    });
  } catch (error) {
    console.error('Error retrieving files:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving files'
    });
  }
};

// Get a specific file by ID
export const getFile = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    
    const file = await storage.getFile(parseInt(fileId));
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    res.status(200).json({
      success: true,
      file
    });
  } catch (error) {
    console.error('Error retrieving file:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving file'
    });
  }
};

// Delete a file by ID
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    
    const file = await storage.getFile(parseInt(fileId));
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Delete the file from the filesystem
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    // Delete from storage
    await storage.deleteFile(parseInt(fileId));
    
    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file'
    });
  }
};