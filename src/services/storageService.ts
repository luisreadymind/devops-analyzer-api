import { BlobServiceClient, BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { logger } from '../config/logger.js';

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'devopsbireports';

function getBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  if (connectionString) {
    logger.info('Using connection string for Azure Storage');
    return BlobServiceClient.fromConnectionString(connectionString);
  }

  // Use Managed Identity in production
  logger.info('Using Managed Identity for Azure Storage');
  const credential = new DefaultAzureCredential();
  const blobServiceUrl = `https://${accountName}.blob.core.windows.net`;
  return new BlobServiceClient(blobServiceUrl, credential);
}

function generateSasToken(blobName: string, accountKey?: string): string {
  if (!accountKey) {
    logger.warn('No account key available, returning URL without SAS');
    return '';
  }

  try {
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    
    // SAS token válido por 7 días
    const sasOptions = {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'), // Read only
      startsOn: new Date(),
      expiresOn: new Date(new Date().valueOf() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    const sasToken = generateBlobSASQueryParameters(
      sasOptions,
      sharedKeyCredential
    ).toString();

    return sasToken;
  } catch (error) {
    logger.error({ error }, 'Failed to generate SAS token');
    return '';
  }
}

export async function uploadHtmlToBlob(
  htmlContent: string,
  fileName: string
): Promise<string> {
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Ensure container exists. Avoid forcing public access because some storage
    // accounts disable public access at the account level (PublicAccessNotPermitted).
    try {
      await containerClient.createIfNotExists();
    } catch (err: any) {
      // If the account forbids public access, createIfNotExists without access
      // should still succeed; if we hit an error here, log and rethrow.
      logger.warn({ err }, 'createIfNotExists failed; continuing if container exists');
      // rethrow only if it's not a conditional failure (we will let upload fail later)
    }

    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    logger.info({ 
      fileName, 
      containerName, 
      contentLength: htmlContent.length 
    }, 'Uploading HTML to blob storage');

    await blockBlobClient.upload(htmlContent, Buffer.byteLength(htmlContent), {
      blobHTTPHeaders: {
        blobContentType: 'text/html; charset=utf-8',
        blobCacheControl: 'public, max-age=3600'
      }
    });

    // Generate URL with SAS token
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const sasToken = generateSasToken(fileName, accountKey);
    
    const blobUrl = sasToken 
      ? `${blockBlobClient.url}?${sasToken}`
      : blockBlobClient.url;

    logger.info({ blobUrl: blobUrl.substring(0, 80) + '...' }, 'HTML uploaded successfully with SAS token');

    return blobUrl;
  } catch (error) {
    logger.error({ error, fileName }, 'Failed to upload HTML to blob storage');
    throw new Error('Failed to upload report to storage. Please try again.');
  }
}

export async function uploadJsonToBlob(
  jsonContent: string,
  fileName: string
): Promise<string> {
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);

    try {
      await containerClient.createIfNotExists();
    } catch (err: any) {
      logger.warn({ err }, 'createIfNotExists failed; continuing if container exists');
    }

    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    logger.info({ 
      fileName, 
      containerName, 
      contentLength: jsonContent.length 
    }, 'Uploading JSON to blob storage');

    await blockBlobClient.upload(jsonContent, Buffer.byteLength(jsonContent), {
      blobHTTPHeaders: {
        blobContentType: 'application/json; charset=utf-8',
        blobCacheControl: 'public, max-age=3600'
      }
    });

    // Generate URL with SAS token
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const sasToken = generateSasToken(fileName, accountKey);
    
    const blobUrl = sasToken 
      ? `${blockBlobClient.url}?${sasToken}`
      : blockBlobClient.url;

    logger.info({ blobUrl: blobUrl.substring(0, 80) + '...' }, 'JSON uploaded successfully with SAS token');

    return blobUrl;
  } catch (error) {
    logger.error({ error, fileName }, 'Failed to upload JSON to blob storage');
    throw new Error('Failed to upload JSON to storage. Please try again.');
  }
}

export async function uploadWordToBlob(
  wordBuffer: Buffer,
  fileName: string
): Promise<string> {
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);

    try {
      await containerClient.createIfNotExists();
    } catch (err: any) {
      logger.warn({ err }, 'createIfNotExists failed; continuing if container exists');
    }

    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    logger.info({ 
      fileName, 
      containerName, 
      contentLength: wordBuffer.length 
    }, 'Uploading Word document to blob storage');

    await blockBlobClient.upload(wordBuffer, wordBuffer.length, {
      blobHTTPHeaders: {
        blobContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        blobCacheControl: 'public, max-age=3600'
      }
    });

    // Generate URL with SAS token
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const sasToken = generateSasToken(fileName, accountKey);
    
    const blobUrl = sasToken 
      ? `${blockBlobClient.url}?${sasToken}`
      : blockBlobClient.url;

    logger.info({ blobUrl: blobUrl.substring(0, 80) + '...' }, 'Word document uploaded successfully with SAS token');

    return blobUrl;
  } catch (error) {
    logger.error({ error, fileName }, 'Failed to upload Word document to blob storage');
    throw new Error('Failed to upload Word document to storage. Please try again.');
  }
}
