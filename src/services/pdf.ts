import pdfParse from 'pdf-parse';
import { logger } from '../config/logger.js';

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    logger.info({ bufferSize: buffer.length }, 'Starting PDF text extraction');
    const data = await pdfParse(buffer);
    
    logger.info({ 
      pages: data.numpages, 
      textLength: data.text?.length || 0,
      hasText: !!data.text && data.text.trim().length > 0,
      pdfInfo: data.info
    }, 'PDF parsing completed');
    
    if (!data.text || data.text.trim().length === 0) {
      logger.warn({ 
        pages: data.numpages, 
        info: data.info,
        bufferSize: buffer.length 
      }, 'PDF contains no extractable text - may be image-based or corrupted');
      
      // Provide more specific error message
      const errorDetails = [];
      if (data.numpages === 0) {
        errorDetails.push('PDF appears to have no pages');
      } else {
        errorDetails.push(`PDF has ${data.numpages} page(s) but no extractable text`);
      }
      errorDetails.push('This usually means the PDF contains only images or scanned content');
      errorDetails.push('Please provide a PDF with selectable text or convert images to text first');
      
      throw new Error(`PDF Processing Error: ${errorDetails.join('. ')}.`);
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
    
    // Re-throw with more context, but don't double-wrap our custom errors
    if (errorMessage.includes('PDF Processing Error:')) {
      throw error;
    }
    
    throw new Error(`Unable to extract text from PDF: ${errorMessage}. Please ensure the file is a valid PDF with extractable text content.`);
  }
}
