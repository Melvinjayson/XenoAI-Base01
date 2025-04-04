import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { createCanvas, loadImage } from 'canvas';
import { hexToRgb, rgbToHex } from '../client/src/lib/color-utils';

// Define upload parameters
const upload = multer({
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
      cb(null, `${uniqueSuffix}-${Date.now()}${path.extname(file.originalname)}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
}).single('image');

// Define Color type
interface Color {
  hex: string;
  rgb: [number, number, number];
  count: number;
}

// Function to extract colors from image
async function extractColorsFromImage(imagePath: string, maxColors: number = 8): Promise<string[]> {
  const image = await loadImage(imagePath);
  
  // Create canvas
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  
  // Scale down large images for performance
  const maxSize = 150; // small size is enough for color analysis
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const scaledWidth = image.width * scale;
  const scaledHeight = image.height * scale;
  
  canvas.width = scaledWidth;
  canvas.height = scaledHeight;
  
  // Draw image on canvas
  ctx.drawImage(image, 0, 0, scaledWidth, scaledHeight);
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
  const pixels = imageData.data;
  
  // Color quantization
  const colorMap: Record<string, Color> = {};
  const skipFactor = 1; // Sample every nth pixel
  
  for (let i = 0; i < pixels.length; i += 4 * skipFactor) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];
    
    // Skip transparent pixels
    if (a < 128) continue;
    
    // Reduce precision to quantize colors (group similar colors)
    const quantizedR = Math.round(r / 24) * 24;
    const quantizedG = Math.round(g / 24) * 24;
    const quantizedB = Math.round(b / 24) * 24;
    
    const hexColor = rgbToHex(quantizedR, quantizedG, quantizedB);
    
    if (colorMap[hexColor]) {
      colorMap[hexColor].count++;
    } else {
      colorMap[hexColor] = {
        hex: hexColor,
        rgb: [quantizedR, quantizedG, quantizedB],
        count: 1
      };
    }
  }
  
  // Sort colors by frequency
  const sortedColors = Object.values(colorMap)
    .sort((a, b) => b.count - a.count)
    .map(color => color.hex);
  
  // Filter out very similar colors by comparing brightness and hue
  const filteredColors: string[] = [];
  
  for (const color of sortedColors) {
    if (filteredColors.length >= maxColors) break;
    
    // Check if this color is significantly different from already selected colors
    if (!isDuplicateColor(color, filteredColors)) {
      filteredColors.push(color);
    }
  }
  
  return filteredColors;
}

// Check if a color is too similar to already selected colors
function isDuplicateColor(color: string, selectedColors: string[], threshold: number = 0.15): boolean {
  const [r1, g1, b1] = hexToRgb(color);
  
  for (const selected of selectedColors) {
    const [r2, g2, b2] = hexToRgb(selected);
    
    // Calculate color distance using weighted Euclidean distance
    const colorDistance = Math.sqrt(
      Math.pow((r1 - r2) * 0.3, 2) + 
      Math.pow((g1 - g2) * 0.59, 2) + 
      Math.pow((b1 - b2) * 0.11, 2)
    ) / 255;
    
    if (colorDistance < threshold) {
      return true; // Too similar
    }
  }
  
  return false;
}

// Handler for image upload and color extraction
export const uploadAndAnalyzeImage = (req: Request, res: Response) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ 
        success: false, 
        message: err.message || 'Error uploading file'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please upload an image file'
      });
    }
    
    try {
      const filePath = req.file.path;
      const colors = await extractColorsFromImage(filePath);
      
      // Get image URL
      const uploadDir = '/uploads/';
      const fileName = path.basename(filePath);
      const imageUrl = `${uploadDir}${fileName}`;
      
      res.status(200).json({
        success: true,
        colors,
        imageUrl
      });
      
    } catch (error) {
      console.error('Error analyzing image:', error);
      res.status(500).json({
        success: false,
        message: 'Error analyzing image'
      });
    }
  });
};

// API endpoint to extract colors from an image URL
export const extractColorsFromUrl = async (req: Request, res: Response) => {
  const { imageUrl } = req.body;
  
  if (!imageUrl) {
    return res.status(400).json({
      success: false,
      message: 'Image URL is required'
    });
  }
  
  try {
    // Create a temporary file to download the image
    const uploadDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const tempFilePath = path.join(uploadDir, `temp-${Date.now()}.jpg`);
    
    // If the URL is a data URL, convert it to a file
    if (imageUrl.startsWith('data:image/')) {
      const base64Data = imageUrl.split(',')[1];
      fs.writeFileSync(tempFilePath, Buffer.from(base64Data, 'base64'));
      
      const colors = await extractColorsFromImage(tempFilePath);
      
      // Clean up the temp file
      fs.unlinkSync(tempFilePath);
      
      res.status(200).json({
        success: true,
        colors
      });
    } else {
      // For external URLs, would need to download the image first
      // This is not implemented here to avoid potential security issues
      res.status(400).json({
        success: false,
        message: 'Only data URLs are supported'
      });
    }
    
  } catch (error) {
    console.error('Error analyzing image URL:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing image'
    });
  }
};