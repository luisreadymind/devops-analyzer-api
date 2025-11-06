import { Router, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../middleware/errors.js';
import { extractTextFromPdf } from '../services/pdf.js';
import { analyzePdfWithOpenAI } from '../services/aiService.js';
import { generateDashboardHtml } from '../services/htmlExporter.js';
import { uploadHtmlToBlob, uploadJsonToBlob } from '../services/storageService.js';
import { logger } from '../config/logger.js';

const router = Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '20') * 1024 * 1024) // Default 20MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Only PDF files are allowed'));
    }
  }
});

router.post('/generate-report', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      throw new AppError(400, 'No file uploaded. Please provide a PDF file.');
    }

    logger.info({ 
      fileName: req.file.originalname, 
      fileSize: req.file.size 
    }, 'Processing report generation request');

    // Step 1: Extract text from PDF
    const pdfText = await extractTextFromPdf(req.file.buffer);

    // Step 2: Analyze with Azure OpenAI
    const analysisResult = await analyzePdfWithOpenAI(pdfText);

    // Step 3: Generate HTML dashboard
    const htmlContent = generateDashboardHtml(analysisResult);

    // Step 4: Upload to Azure Blob Storage
    const timestamp = Date.now();
    const sanitizedFileName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobFileName = `report_${timestamp}_${sanitizedFileName}.html`;
    const reportUrl = await uploadHtmlToBlob(htmlContent, blobFileName);

    // Step 4.5: Upload JSON analysis to Blob Storage
    const jsonFileName = `report_${timestamp}_${sanitizedFileName}.json`;
    const jsonContent = JSON.stringify(analysisResult, null, 2);
    const jsonUrl = await uploadJsonToBlob(jsonContent, jsonFileName);

    logger.info({ reportUrl, jsonUrl }, 'Report and JSON generated successfully');

    // Step 5: Return response
    res.json({
      status: 'success',
      data: {
        reportUrl,
        jsonUrl,
        analysis: analysisResult
      }
    });
  } catch (error) {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        throw new AppError(413, `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 20}MB`);
      }
      throw new AppError(400, `File upload error: ${error.message}`);
    }
    throw error;
  }
});

export default router;
