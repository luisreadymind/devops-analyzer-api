import { BlobServiceClient } from '@azure/storage-blob';
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

export async function uploadHtmlToBlob(
  htmlContent: string,
  fileName: string
): Promise<string> {
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Ensure container exists
    await containerClient.createIfNotExists({
      access: 'blob' // Public read access for blobs
    });

    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    logger.info({ fileName, containerName }, 'Uploading HTML to blob storage');

    await blockBlobClient.upload(htmlContent, Buffer.byteLength(htmlContent), {
      blobHTTPHeaders: {
        blobContentType: 'text/html',
        blobCacheControl: 'public, max-age=3600'
      }
    });

    const blobUrl = blockBlobClient.url;
    logger.info({ blobUrl }, 'HTML uploaded successfully');

    return blobUrl;
  } catch (error) {
    logger.error({ error, fileName }, 'Failed to upload HTML to blob storage');
    throw new Error('Failed to upload report to storage. Please try again.');
  }
}
