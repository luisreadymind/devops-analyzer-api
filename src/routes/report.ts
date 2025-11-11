import { Router, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../middleware/errors.js';
import { extractTextFromPdf } from '../services/pdf.js';
import { analyzePdfWithOpenAI } from '../services/aiService.js';
import { generateDashboardHtml } from '../services/htmlExporter.js';
import { uploadHtmlToBlob, uploadJsonToBlob, uploadWordToBlob } from '../services/storageService.js';
import { WordExporterService } from '../services/wordExporter.js';
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
    
    // Handle PDF processing errors with more helpful messages
    if (error instanceof Error && error.message.includes('PDF Processing Error:')) {
      logger.warn({ 
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        error: error.message 
      }, 'PDF contains no extractable text');
      
      throw new AppError(400, {
        type: 'PDF_NO_TEXT',
        message: error.message,
        suggestions: [
          'Ensure the PDF contains selectable text (not just images)',
          'Try using OCR software to convert image-based PDFs to text-based PDFs',
          'Verify the PDF is not corrupted or password-protected',
          'Use a different PDF file with readable text content'
        ]
      });
    }
    
    throw error;
  }
});

router.post('/export-word', async (req: Request, res: Response) => {
  try {
    const analysisData = req.body;

    // Validar que se recibió un JSON válido
    if (!analysisData || typeof analysisData !== 'object') {
      throw new AppError(400, 'Invalid JSON data. Please provide a valid DevOps analysis JSON.');
    }

    // Validar campos requeridos
    const requiredFields = ['cliente', 'capacidadWAF', 'recomendaciones', 'planTrabajo'];
    for (const field of requiredFields) {
      if (!analysisData[field]) {
        throw new AppError(400, `Missing required field: ${field}`);
      }
    }

    logger.info({ cliente: analysisData.cliente }, 'Processing Word export request');

    // Generar documento Word
    const wordExporter = new WordExporterService();
    const wordBuffer = await wordExporter.generateDevOpsReportWord(analysisData);

    // Generar nombre del archivo
    const cliente = analysisData.cliente.replace(/[^a-zA-Z0-9]/g, '_');
    const fecha = analysisData.fechaAssessment || new Date().toISOString().split('T')[0];
    const fileName = `Reporte_EstudioDevOps_${cliente}_${fecha}.docx`;

    logger.info({ fileName, size: wordBuffer.length }, 'Word document generated successfully');

    // Enviar el documento como respuesta
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', wordBuffer.length.toString());

    res.send(wordBuffer);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'Error generating Word document');
    throw error;
  }
});

router.post('/generate-full-report', async (req: Request, res: Response) => {
  try {
    const analysisData = req.body;

    // Validar que se recibió un JSON válido
    if (!analysisData || typeof analysisData !== 'object') {
      throw new AppError(400, 'Invalid JSON data. Please provide a valid DevOps analysis JSON.');
    }

    // Validar campos requeridos
    const requiredFields = ['cliente', 'capacidadWAF', 'recomendaciones', 'planTrabajo'];
    for (const field of requiredFields) {
      if (!analysisData[field]) {
        throw new AppError(400, `Missing required field: ${field}`);
      }
    }

    logger.info({ cliente: analysisData.cliente }, 'Processing full report generation request');

    // Generar HTML dashboard
    const htmlContent = generateDashboardHtml(analysisData);

    // Generar documento Word
    const wordExporter = new WordExporterService();
    const wordBuffer = await wordExporter.generateDevOpsReportWord(analysisData);

    // Generar timestamp y nombres de archivos
    const timestamp = Date.now();
    const cliente = analysisData.cliente.replace(/[^a-zA-Z0-9]/g, '_');
    const fecha = analysisData.fechaAssessment || new Date().toISOString().split('T')[0];

    const htmlFileName = `report_${timestamp}_${cliente}_${fecha}.html`;
    const jsonFileName = `report_${timestamp}_${cliente}_${fecha}.json`;
    const wordFileName = `report_${timestamp}_${cliente}_${fecha}.docx`;

    // Subir HTML al blob storage
    const htmlUrl = await uploadHtmlToBlob(htmlContent, htmlFileName);

    // Subir JSON al blob storage
    const jsonContent = JSON.stringify(analysisData, null, 2);
    const jsonUrl = await uploadJsonToBlob(jsonContent, jsonFileName);

    // Subir Word al blob storage
    const wordUrl = await uploadWordToBlob(wordBuffer, wordFileName);

    logger.info({ htmlUrl, jsonUrl, wordUrl }, 'Full report generated and uploaded successfully');

    // Devolver respuesta con las URLs
    res.json({
      status: 'success',
      data: {
        htmlUrl,
        jsonUrl,
        wordUrl,
        analysis: analysisData
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'Error generating full report');
    throw error;
  }
});

export default router;
