
import { Request, Response, NextFunction } from 'express';

export function validateRequest(req: Request, res: Response, next: NextFunction) {
  // Validate content type
  if (req.headers['content-type'] && !req.headers['content-type'].includes('application/json')) {
    return res.status(415).json({ error: 'Content type must be application/json' });
  }

  // Validate required headers
  const requiredHeaders = ['user-agent'];
  const missingHeaders = requiredHeaders.filter(header => !req.headers[header]);
  if (missingHeaders.length > 0) {
    return res.status(400).json({ error: `Missing required headers: ${missingHeaders.join(', ')}` });
  }

  // Validate request size
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 50 * 1024 * 1024) { // 50MB limit
    return res.status(413).json({ error: 'Request too large' });
  }

  next();
}
