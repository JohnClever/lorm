/**
 * Compression Worker Thread
 * Handles compression and decompression operations in a separate thread
 */

const { parentPort, workerData } = require('worker_threads');
const { createGzip, createGunzip } = require('zlib');

if (parentPort) {
  parentPort.on('message', async (message) => {
    const { operation, data, options } = message;
    const startTime = Date.now();

    try {
      let result;

      if (operation === 'compress') {
        const gzip = createGzip({ level: options.level || 6 });
        const chunks = [];

        await new Promise((resolve, reject) => {
          gzip.on('data', (chunk) => chunks.push(chunk));
          gzip.on('end', resolve);
          gzip.on('error', reject);
          gzip.end(Buffer.from(data));
        });

        result = Buffer.concat(chunks);
        
        parentPort.postMessage({
          data: result,
          originalSize: data.length,
          compressedSize: result.length,
          ratio: result.length / data.length,
          duration: Date.now() - startTime
        });
      } else if (operation === 'decompress') {
        const gunzip = createGunzip();
        const chunks = [];

        await new Promise((resolve, reject) => {
          gunzip.on('data', (chunk) => chunks.push(chunk));
          gunzip.on('end', resolve);
          gunzip.on('error', reject);
          gunzip.end(Buffer.from(data));
        });

        result = Buffer.concat(chunks);
        
        parentPort.postMessage({
          data: result,
          compressedSize: data.length,
          decompressedSize: result.length,
          duration: Date.now() - startTime
        });
      }
    } catch (error) {
      parentPort.postMessage({
        error: error.message || 'Unknown error'
      });
    }
  });
}