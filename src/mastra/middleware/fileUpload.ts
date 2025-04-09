import { RequestHandler } from 'express';
import multer from 'multer';
import path from 'path';


const storage = multer.memoryStorage();


const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
};

export const uploadMiddleware: RequestHandler = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter,
}).single('pdf');
