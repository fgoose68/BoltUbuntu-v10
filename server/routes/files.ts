import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { query, run, get } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { logEvent } from '../services/logger';
import { sendPushoverNotification } from '../services/pushover';
import { randomUUID } from 'crypto';

export const filesRouter = express.Router();

const ALLOWED_EXTENSIONS = ['.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt', '.pdf'];
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/pdf'
];

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = '/uploads/office';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext) && ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Office documents are allowed.'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

filesRouter.get('/list', async (req: AuthRequest, res) => {
  try {
    const files = query('SELECT * FROM files ORDER BY created_at DESC');
    res.json({ files });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

filesRouter.post('/upload', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const storageLocation = req.body.destination || 'local';
    let finalPath = req.file.path;

    if (storageLocation === 'nas') {
      const nasPath = `/mnt/nas/office/${req.file.filename}`;
      try {
        await fs.mkdir('/mnt/nas/office', { recursive: true });
        await fs.copyFile(req.file.path, nasPath);
        await fs.unlink(req.file.path);
        finalPath = nasPath;
      } catch (error) {
        console.error('Error copying to NAS:', error);
      }
    }

    const fileId = randomUUID();

    run(
      'INSERT INTO files (id, filename, file_type, file_size, storage_path, storage_location, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [fileId, req.file.originalname, path.extname(req.file.originalname).toLowerCase(), req.file.size, finalPath, storageLocation, req.file.mimetype, req.userId]
    );

    logEvent('upload', 'info', `File uploaded: ${req.file.originalname}`, {
      fileId,
      size: req.file.size
    }, req.userId!);

    await sendPushoverNotification(
      'File Uploaded',
      `${req.file.originalname} uploaded successfully (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`,
      'positive'
    );

    res.json({
      message: 'File uploaded successfully',
      file: { id: fileId, filename: req.file.originalname }
    });
  } catch (error) {
    console.error('Upload error:', error);
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

filesRouter.get('/download/:fileId', async (req: AuthRequest, res) => {
  try {
    const { fileId } = req.params;

    const file = get('SELECT * FROM files WHERE id = ?', [fileId]);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    try {
      await fs.access(file.storage_path);
    } catch {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    logEvent('download', 'info', `File downloaded: ${file.filename}`, {
      fileId: file.id
    }, req.userId!);

    res.download(file.storage_path, file.filename);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

filesRouter.delete('/:fileId', async (req: AuthRequest, res) => {
  try {
    const { fileId } = req.params;

    const file = get('SELECT * FROM files WHERE id = ?', [fileId]);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    await fs.unlink(file.storage_path).catch(() => {});

    run('DELETE FROM files WHERE id = ?', [fileId]);

    logEvent('upload', 'info', `File deleted: ${file.filename}`, {
      fileId: file.id
    }, req.userId!);

    await sendPushoverNotification(
      'File Deleted',
      `${file.filename} has been deleted`,
      'neutral'
    );

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});
