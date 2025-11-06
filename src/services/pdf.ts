import pdfParse from 'pdf-parse';
import { logger } from '../config/logger.js';

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    logger.info({ bufferSize: buffer.length }, 'Starting PDF text extraction');
    const data = await pdfParse(buffer);
    
    if (!data.text || data.text.trim().length === 0) {
      logger.warn({ pages: data.numpages, info: data.info }, 'PDF contains no extractable text');
      throw new Error('PDF appears to be empty or contains no extractable text');
    }

    logger.info({ pages: data.numpages, textLength: data.text.length }, 'PDF text extracted successfully');
    return data.text;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    logger.error({ 
      error: errorMessage, 
      stack: errorStack,
      bufferSize: buffer.length 
    }, 'Failed to extract text from PDF');
    
    // Re-throw with more context
    throw new Error(`Unable to extract text from PDF: ${errorMessage}. Please ensure the file is a valid PDF and not corrupted or password-protected.`);
  }
}
