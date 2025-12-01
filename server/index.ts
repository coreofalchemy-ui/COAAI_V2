import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import facesRouter from './routes/faces.js';
import geminiRouter from './routes/gemini.js';
import { checkBucketAccess } from './gcsClient.js';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

function logToFile(msg: string) {
    const logPath = 'c:/Users/user/Desktop/coa/ai-fashion-hub-main/debug_absolute.log';
    try {
        fs.appendFileSync(logPath, msg + '\n');
    } catch (e) {
        // ignore
    }
}

logToFile('index.ts loaded');

const app = express();
const PORT = 3002;

// Middleware
app.use(cors({
    origin: process.env.VITE_DEV_SERVER || 'http://localhost:5173',
    credentials: true,
}));

app.use(express.json({ limit: '500mb' })); // Increased limit for images
app.use(express.urlencoded({ limit: '500mb', extended: true, parameterLimit: 50000 }));

// Routes
app.use('/api/faces', facesRouter);
app.use('/api/gemini', geminiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GCS connection check endpoint
app.get('/api/status', async (req, res) => {
    logToFile('API Status endpoint called');
    try {
        logToFile('Calling checkBucketAccess...');
        const bucketAccessible = await checkBucketAccess();
        logToFile(`checkBucketAccess returned: ${bucketAccessible}`);
        res.json({
            gcs: bucketAccessible ? 'connected' : 'disconnected',
            bucket: process.env.GCS_BUCKET_NAME || 'coa-lookbook-assets',
        });
    } catch (error) {
        logToFile(`Error in API status: ${error}`);
        res.status(500).json({
            gcs: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Face Library API Server running on http://localhost:${PORT}`);
    console.log(`📦 GCS Bucket: ${process.env.GCS_BUCKET_NAME || 'coa-lookbook-assets'}`);
    console.log(`🔑 Using key file: server/keys/face-library-key.json`);
});
