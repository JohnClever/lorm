import {
  promises as fs,
  existsSync,
  readFileSync as fsReadFileSync,
  writeFileSync as fsWriteFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "fs";
import { resolve, dirname, join, normalize } from "path";
import { gzip, gunzip } from "zlib";
import { promisify } from "util";
import { createHash } from "crypto";
import { SecurityValidator, SecurityAuditLogger } from './security';
import { Result, success, failure } from './result';
import { 
  FileSystemError, 
  normalizeFileSystemError
} from './file-system-errors';
import { FileStats, ReadOptions, WriteOptions, DirectoryOptions, FileSystemErrorCode } from '../types.js';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export type { FileStats, ReadOptions, WriteOptions, DirectoryOptions };
export { FileSystemErrorCode };
export function exists(path: string): boolean {
  return existsSync(path);
}
export async function existsAsync(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}
export async function access(path: string, mode?: number): Promise<void> {
  return fs.access(path, mode);
}
export async function getStats(path: string): Promise<FileStats | null> {
  try {
    const stats = await fs.stat(path);
    return {
      exists: true,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      mtime: stats.mtime,
    };
  } catch {
    return null;
  }
}
export function getStatsSync(path: string): FileStats | null {
  try {
    const stats = statSync(path);
    return {
      exists: true,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      mtime: stats.mtime,
    };
  } catch {
    return null;
  }
}
export async function readFile(
  path: string,
  options: ReadOptions = {}
): Promise<string> {
  const { encoding = "utf8" } = options;
  return fs.readFile(path, encoding);
}
export function readFileSync(path: string, options: ReadOptions = {}): string {
  const { encoding = "utf8" } = options;
  return fsReadFileSync(path, encoding);
}
export async function readJson<T = unknown>(path: string): Promise<T> {
  const content = await fs.readFile(path, 'utf-8');
  return JSON.parse(content);
}
export function readJsonSync<T = unknown>(path: string): T {
  const content = fsReadFileSync(path, 'utf-8');
  return JSON.parse(content);
}

// Result-based versions for better error handling
export async function readJsonSafe<T = unknown>(path: string): Promise<Result<T, FileSystemError>> {
  try {
    const content = await fs.readFile(path, 'utf-8');
    const data = JSON.parse(content) as T;
    return success(data);
  } catch (error) {
    const fsError = normalizeFileSystemError(error, 'read JSON file');
    return failure(fsError);
  }
}

export function readJsonSyncSafe<T = unknown>(path: string): Result<T, FileSystemError> {
  try {
    const content = fsReadFileSync(path, 'utf-8');
    const data = JSON.parse(content) as T;
    return success(data);
  } catch (error) {
    const fsError = normalizeFileSystemError(error, 'read JSON file');
    return failure(fsError);
  }
}
export async function writeFile(
  path: string,
  content: string,
  options: WriteOptions = {}
): Promise<void> {
  const { createDir = true, encoding = "utf8" } = options;
  const pathValidation = SecurityValidator.validateFilePath(path, process.cwd());
  if (!pathValidation.isValid) {
    await SecurityAuditLogger.logSecurityEvent('file_write_blocked', {
      path: SecurityValidator.sanitizeOutput(path),
      errors: pathValidation.errors
    }, 'error');
    throw new Error(`File write blocked: ${pathValidation.errors.join(', ')}`);
  }
  if (createDir) {
    await ensureDir(dirname(path));
  }
  await SecurityAuditLogger.logSecurityEvent('file_write', {
    path: SecurityValidator.sanitizeOutput(path),
    size: content.length
  });
  return fs.writeFile(path, content, { encoding, ...options });
}
export function writeFileSync(
  path: string,
  content: string,
  options: WriteOptions = {}
): void {
  const { createDir = true, encoding = "utf8" } = options;
  const pathValidation = SecurityValidator.validateFilePath(path, process.cwd());
  if (!pathValidation.isValid) {
    SecurityAuditLogger.logSecurityEvent('file_write_blocked', {
      path: SecurityValidator.sanitizeOutput(path),
      errors: pathValidation.errors
    }, 'error').catch(() => {});
    throw new Error(`File write blocked: ${pathValidation.errors.join(', ')}`);
  }
  if (createDir) {
    ensureDirSync(dirname(path));
  }
  SecurityAuditLogger.logSecurityEvent('file_write', {
    path: SecurityValidator.sanitizeOutput(path),
    size: content.length
  }).catch(() => {});
  fsWriteFileSync(path, content, { encoding, ...options });
}
export async function writeJson(
  path: string,
  data: unknown,
  options: WriteOptions = {}
): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  return writeFile(path, content, options);
}
export function writeJsonSync(
  path: string,
  data: unknown,
  options: WriteOptions = {}
): void {
  const content = JSON.stringify(data, null, 2);
  writeFileSync(path, content, options);
}
export async function appendFile(
  path: string,
  content: string,
  options: WriteOptions = {}
): Promise<void> {
  const { createDir = true, encoding = "utf8" } = options;
  if (createDir) {
    await ensureDir(dirname(path));
  }
  return fs.appendFile(path, content, { encoding, ...options });
}
export async function deleteFile(path: string): Promise<void> {
  const pathValidation = SecurityValidator.validateFilePath(path, process.cwd());
  if (!pathValidation.isValid) {
    await SecurityAuditLogger.logSecurityEvent('file_delete_blocked', {
      path: SecurityValidator.sanitizeOutput(path),
      errors: pathValidation.errors
    }, 'error');
    throw new Error(`File delete blocked: ${pathValidation.errors.join(', ')}`);
  }
  await SecurityAuditLogger.logSecurityEvent('file_delete', {
    path: SecurityValidator.sanitizeOutput(path)
  }, 'warn');
  try {
    await fs.unlink(path);
  } catch (error: unknown) {
    const fsError = normalizeFileSystemError(error, 'delete file');
    if (fsError.code !== FileSystemErrorCode.FILE_NOT_FOUND) {
      throw fsError;
    }
  }
}
export function deleteFileSync(path: string): void {
  try {
    unlinkSync(path);
  } catch (error: unknown) {
    const fsError = normalizeFileSystemError(error, 'delete file sync');
    if (fsError.code !== FileSystemErrorCode.FILE_NOT_FOUND) {
      throw fsError;
    }
  }
}
export async function ensureDir(
  path: string,
  options: DirectoryOptions = {}
): Promise<void> {
  const { recursive = true } = options;
  try {
    await fs.mkdir(path, { recursive, ...options });
  } catch (error: unknown) {
    const fsError = normalizeFileSystemError(error, 'ensure directory');
    if (fsError.code === FileSystemErrorCode.FILE_EXISTS) {
      // Directory already exists, which is fine
      return;
    }
    throw fsError;
  }
}
export function ensureDirSync(path: string, options: DirectoryOptions = {}): void {
  const { recursive = true } = options;
  try {
    mkdirSync(path, { recursive, ...options });
  } catch (error: unknown) {
    const fsError = normalizeFileSystemError(error, 'ensure directory sync');
    if (fsError.code === FileSystemErrorCode.FILE_EXISTS) {
      // Directory already exists, which is fine
      return;
    }
    throw fsError;
  }
}
export async function readDir(path: string): Promise<string[]> {
  return fs.readdir(path);
}
export function readDirSync(path: string): string[] {
  return readdirSync(path);
}
export async function removeDir(path: string): Promise<void> {
  try {
    await fs.rm(path, { recursive: true, force: true });
  } catch (error: unknown) {
    const fsError = normalizeFileSystemError(error, 'remove directory');
    if (fsError.code === FileSystemErrorCode.FILE_NOT_FOUND) {
      // Directory doesn't exist, which is fine
      return;
    }
    throw fsError;
  }
}
export async function copyFile(
  src: string,
  dest: string,
  options: WriteOptions = {}
): Promise<void> {
  const { createDir = true } = options;
  if (createDir) {
    await ensureDir(dirname(dest));
  }
  return fs.copyFile(src, dest);
}
export async function moveFile(
  src: string,
  dest: string,
  options: WriteOptions = {}
): Promise<void> {
  const { createDir = true } = options;
  if (createDir) {
    await ensureDir(dirname(dest));
  }
  return fs.rename(src, dest);
}
export async function findFiles(dir: string, pattern: RegExp): Promise<string[]> {
  const files: string[] = [];
  const traverse = async (currentDir: string): Promise<void> => {
    const entries = await readDir(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stats = await getStats(fullPath);
      if (stats?.isDirectory) {
        await traverse(fullPath);
      } else if (stats?.isFile && pattern.test(entry)) {
        files.push(fullPath);
      }
    }
  };
  await traverse(dir);
  return files;
}
export async function getFileSize(path: string): Promise<number> {
  const stats = await getStats(path);
  return stats?.size || 0;
}
export async function isFile(path: string): Promise<boolean> {
  const stats = await getStats(path);
  return stats?.isFile || false;
}
export async function isDirectory(path: string): Promise<boolean> {
  const stats = await getStats(path);
  return stats?.isDirectory || false;
}
export async function compressFile(path: string): Promise<Buffer> {
  const content = await fs.readFile(path);
  return gzipAsync(content);
}
export async function decompressFile(compressedData: Buffer): Promise<Buffer> {
  return gunzipAsync(compressedData);
}
export async function createTempFile(
  content: string,
  suffix = ".tmp"
): Promise<string> {
  const tempPath = join(process.cwd(), `.temp-${Date.now()}${suffix}`);
  await writeFile(tempPath, content);
  return tempPath;
}
export async function cleanupTempFiles(
  dir: string = process.cwd(),
  pattern = /\.temp-\d+/
): Promise<void> {
  const tempFiles = await findFiles(dir, pattern);
  await Promise.all(tempFiles.map((file) => deleteFile(file)));
}
export function getRelativePath(from: string, to: string): string {
  return resolve(from, to);
}
export function resolvePath(...paths: string[]): string {
  return resolve(process.cwd(), ...paths);
}
export async function isNewer(file1: string, file2: string): Promise<boolean> {
  const [stats1, stats2] = await Promise.all([
    getStats(file1),
    getStats(file2),
  ]);
  if (!stats1 || !stats2) return false;
  return stats1.mtime > stats2.mtime;
}
export class FileUtils {
  static exists = exists;
  static existsAsync = existsAsync;
  static access = access;
  static getStats = getStats;
  static getStatsSync = getStatsSync;
  static readFile = readFile;
  static readFileSync = readFileSync;
  static readJson = readJson;
  static readJsonSync = readJsonSync;
  static writeFile = writeFile;
  static writeFileSync = writeFileSync;
  static writeJson = writeJson;
  static writeJsonSync = writeJsonSync;
  static appendFile = appendFile;
  static deleteFile = deleteFile;
  static deleteFileSync = deleteFileSync;
  static ensureDir = ensureDir;
  static ensureDirSync = ensureDirSync;
  static readDir = readDir;
  static readDirSync = readDirSync;
  static removeDir = removeDir;
  static copyFile = copyFile;
  static moveFile = moveFile;
  static findFiles = findFiles;
  static getFileSize = getFileSize;
  static isFile = isFile;
  static isDirectory = isDirectory;
  static compressFile = compressFile;
  static decompressFile = decompressFile;
  static createTempFile = createTempFile;
  static cleanupTempFiles = cleanupTempFiles;
  static getRelativePath = getRelativePath;
  static resolvePath = resolvePath;
  static isNewer = isNewer;
}
export async function fileExists(path: string): Promise<boolean> {
  return existsAsync(path);
}
export default FileUtils;
