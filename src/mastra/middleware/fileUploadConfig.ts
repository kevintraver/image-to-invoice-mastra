import { RequestHandler } from 'express';
import fileUpload from 'express-fileupload';

export const fileUploadMiddleware: RequestHandler = fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  abortOnLimit: true,
  useTempFiles: false,
  createParentPath: true, 
  safeFileNames: true,
  debug: process.env.NODE_ENV !== 'production'
});
