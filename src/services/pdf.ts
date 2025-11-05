import pdfParse from 'pdf-parse';
import { logger } from '../config/logger.js';

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF appears to be empty or contains no extractable text');
    }

    logger.info({ pages: data.numpages }, 'PDF text extracted successfully');
    return data.text;
  } catch (error) {
    logger.error({ error }, 'Failed to extract text from PDF');
    throw new Error('Unable to extract text from PDF. Please ensure the file is not corrupted or password-protected.');
  }
}
