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

    // Ensure container exists (private access now)
    await containerClient.createIfNotExists({
      access: 'blob'
    });

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
