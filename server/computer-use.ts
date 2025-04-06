/**
 * Computer Use Module
 * 
 * This module provides functionalities for interacting with the computer environment,
 * allowing the AI to perform actions such as managing files, checking system 
 * information, and running simple workflows.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

// Promisify exec for async/await usage
const execAsync = promisify(exec);

// Safe directories where file operations are allowed
const SAFE_DIRECTORIES = [
  os.tmpdir(),
  path.join(process.cwd(), 'temp'),
  path.join(process.cwd(), 'downloads'),
  path.join(process.cwd(), 'uploads')
];

// Ensure that safe directories exist
for (const dir of SAFE_DIRECTORIES) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (error) {
      console.error(`Error creating safe directory ${dir}:`, error);
    }
  }
}

/**
 * Check if a path is within safe directories
 * @param filePath Path to check
 * @returns Whether the path is safe
 */
function isPathSafe(filePath: string): boolean {
  const resolvedPath = path.resolve(filePath);
  
  return SAFE_DIRECTORIES.some(safeDir => {
    const resolvedSafeDir = path.resolve(safeDir);
    return resolvedPath.startsWith(resolvedSafeDir);
  });
}

/**
 * Get basic system information
 * @returns Information about the system
 */
export function getSystemInfo(): {
  platform: string;
  architecture: string;
  cpus: { model: string; speed: number }[];
  totalMemory: number;
  freeMemory: number;
  uptime: number;
} {
  return {
    platform: os.platform(),
    architecture: os.arch(),
    cpus: os.cpus().map(cpu => ({
      model: cpu.model,
      speed: cpu.speed
    })),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    uptime: os.uptime()
  };
}

/**
 * List files in a directory
 * @param directoryPath Directory path
 * @returns List of files and directories
 */
export function listFiles(directoryPath: string): {
  name: string;
  isDirectory: boolean;
  size: number;
  lastModified: Date;
}[] {
  // Check if directory exists
  if (!fs.existsSync(directoryPath)) {
    throw new Error(`Directory not found: ${directoryPath}`);
  }
  
  // Read directory
  const files = fs.readdirSync(directoryPath);
  
  // Get file information
  return files.map(file => {
    const filePath = path.join(directoryPath, file);
    const stats = fs.statSync(filePath);
    
    return {
      name: file,
      isDirectory: stats.isDirectory(),
      size: stats.size,
      lastModified: stats.mtime
    };
  });
}

/**
 * Read a file
 * @param filePath Path to the file
 * @returns File content
 */
export function readFile(filePath: string): string {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  // Check if path is safe for text reading
  if (!isPathSafe(filePath)) {
    throw new Error('Access denied: file is outside safe directories');
  }
  
  // Read file
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Write to a file
 * @param filePath Path to the file
 * @param content Content to write
 * @returns Success status
 */
export function writeFile(filePath: string, content: string): boolean {
  // Check if path is safe
  if (!isPathSafe(filePath)) {
    throw new Error('Access denied: file is outside safe directories');
  }
  
  // Create directory if it doesn't exist
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Write file
  fs.writeFileSync(filePath, content, 'utf-8');
  return true;
}

/**
 * Delete a file
 * @param filePath Path to the file
 * @returns Success status
 */
export function deleteFile(filePath: string): boolean {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  // Check if path is safe
  if (!isPathSafe(filePath)) {
    throw new Error('Access denied: file is outside safe directories');
  }
  
  // Delete file
  fs.unlinkSync(filePath);
  return true;
}

/**
 * Create a directory
 * @param directoryPath Directory path
 * @returns Success status
 */
export function createDirectory(directoryPath: string): boolean {
  // Check if path is safe
  if (!isPathSafe(directoryPath)) {
    throw new Error('Access denied: directory is outside safe directories');
  }
  
  // Create directory
  fs.mkdirSync(directoryPath, { recursive: true });
  return true;
}

/**
 * Delete a directory
 * @param directoryPath Directory path
 * @param recursive Whether to delete recursively
 * @returns Success status
 */
export function deleteDirectory(directoryPath: string, recursive: boolean = false): boolean {
  // Check if directory exists
  if (!fs.existsSync(directoryPath)) {
    throw new Error(`Directory not found: ${directoryPath}`);
  }
  
  // Check if path is safe
  if (!isPathSafe(directoryPath)) {
    throw new Error('Access denied: directory is outside safe directories');
  }
  
  // Delete directory
  if (recursive) {
    fs.rmSync(directoryPath, { recursive: true, force: true });
  } else {
    fs.rmdirSync(directoryPath);
  }
  
  return true;
}

/**
 * Run a command (safely)
 * @param command Command to run
 * @returns Command output
 */
export async function runCommand(command: string): Promise<{
  stdout: string;
  stderr: string;
}> {
  // Check for potentially dangerous commands
  const dangerousCommands = [
    'rm -rf', 'rd /s', 'del /s', 'format', 'mkfs',
    'dd', 'chmod 777', 'sudo', 'su', '> /dev/'
  ];
  
  if (dangerousCommands.some(cmd => command.includes(cmd))) {
    throw new Error('Potentially dangerous command detected');
  }
  
  // Allow only certain commands
  const allowedCommands = [
    'echo', 'ls', 'dir', 'cat', 'type',
    'find', 'grep', 'wc', 'head', 'tail',
    'sort', 'uniq', 'date', 'time', 'pwd',
    'cd', 'mkdir', 'touch', 'df', 'du',
    'ps', 'whoami', 'hostname', 'uname',
    'ifconfig', 'ipconfig', 'ping'
  ];
  
  const commandBase = command.split(' ')[0];
  if (!allowedCommands.includes(commandBase)) {
    throw new Error(`Command not allowed: ${commandBase}`);
  }
  
  // Run command
  return await execAsync(command);
}

/**
 * Get running processes information
 * @returns List of processes
 */
export async function getProcesses(): Promise<{
  pid: number;
  name: string;
  cpu: string;
  memory: string;
}[]> {
  try {
    const platform = os.platform();
    let command = '';
    
    if (platform === 'win32') {
      command = 'tasklist /fo csv /nh';
    } else {
      command = 'ps -eo pid,comm,%cpu,%mem --sort=-%cpu | head -21';
    }
    
    const { stdout } = await execAsync(command);
    
    // Parse the output based on platform
    if (platform === 'win32') {
      // Windows CSV format
      const lines = stdout.trim().split('\n');
      return lines.map(line => {
        const parts = line.replace(/"/g, '').split(',');
        return {
          pid: parseInt(parts[1], 10),
          name: parts[0],
          cpu: 'N/A', // Not available in basic tasklist
          memory: parts[4]
        };
      });
    } else {
      // Unix format
      const lines = stdout.trim().split('\n').slice(1); // Skip header
      return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          pid: parseInt(parts[0], 10),
          name: parts[1],
          cpu: parts[2] + '%',
          memory: parts[3] + '%'
        };
      });
    }
  } catch (error: any) {
    console.error('Error getting processes:', error.message);
    throw error;
  }
}

/**
 * Check if a port is in use
 * @param port Port number
 * @returns Whether the port is in use
 */
export async function isPortInUse(port: number): Promise<boolean> {
  try {
    const platform = os.platform();
    let command = '';
    
    if (platform === 'win32') {
      command = `netstat -ano | find "LISTENING" | find ":${port} "`;
    } else {
      command = `lsof -i:${port} -P -n -t`;
    }
    
    const { stdout } = await execAsync(command);
    return stdout.trim().length > 0;
  } catch (error) {
    // Command returns non-zero exit code if no processes found
    return false;
  }
}

/**
 * Get available disk space
 * @param directory Directory to check space for
 * @returns Disk space information
 */
export async function getDiskSpace(directory: string = process.cwd()): Promise<{
  available: number;
  total: number;
  used: number;
  usedPercentage: string;
}> {
  try {
    const platform = os.platform();
    let command = '';
    
    if (platform === 'win32') {
      command = `wmic logicaldisk get size,freespace,caption`;
    } else {
      command = `df -k ${directory}`;
    }
    
    const { stdout } = await execAsync(command);
    
    if (platform === 'win32') {
      // Parse Windows output (very simplified)
      const lines = stdout.trim().split('\n').slice(1);
      const drives = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        const caption = parts[0];
        const freespace = parseInt(parts[1], 10);
        const size = parseInt(parts[2], 10);
        
        return {
          drive: caption,
          available: freespace,
          total: size,
          used: size - freespace,
          usedPercentage: ((size - freespace) / size * 100).toFixed(2) + '%'
        };
      });
      
      // Find the drive containing the directory
      const directoryDrive = directory.split(':')[0] + ':';
      const drive = drives.find(d => d.drive === directoryDrive) || drives[0];
      
      return {
        available: drive.available,
        total: drive.total,
        used: drive.used,
        usedPercentage: drive.usedPercentage
      };
    } else {
      // Parse Unix output
      const lines = stdout.trim().split('\n').slice(1);
      const parts = lines[0].trim().split(/\s+/);
      
      const total = parseInt(parts[1], 10) * 1024;
      const used = parseInt(parts[2], 10) * 1024;
      const available = parseInt(parts[3], 10) * 1024;
      const usedPercentage = parts[4];
      
      return { total, used, available, usedPercentage };
    }
  } catch (error: any) {
    console.error('Error getting disk space:', error.message);
    throw error;
  }
}

/**
 * Create a temporary file
 * @param content File content
 * @param extension File extension (default: .txt)
 * @returns Path to the temporary file
 */
export function createTempFile(
  content: string,
  extension: string = '.txt'
): string {
  // Generate a temporary file path
  const filename = `temp-${Date.now()}-${Math.floor(Math.random() * 10000)}${extension}`;
  const filePath = path.join(os.tmpdir(), filename);
  
  // Write the file
  fs.writeFileSync(filePath, content, 'utf-8');
  
  return filePath;
}

/**
 * Download a file from URL to local path
 * @param url URL to download from
 * @param destinationPath Path to save the file to
 * @returns Promise resolving to the saved file path
 */
export async function downloadFile(
  url: string,
  destinationPath: string
): Promise<string> {
  // Check if path is safe
  if (!isPathSafe(destinationPath)) {
    throw new Error('Access denied: destination is outside safe directories');
  }
  
  try {
    // Use node-fetch for HTTP requests
    const fetch = require('node-fetch');
    const response = await fetch(url);
    
    // Check if response is ok
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    // Create directory if it doesn't exist
    const dirPath = path.dirname(destinationPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Write file
    const buffer = await response.buffer();
    fs.writeFileSync(destinationPath, buffer);
    
    return destinationPath;
  } catch (error: any) {
    console.error(`Error downloading file from ${url}:`, error.message);
    throw error;
  }
}