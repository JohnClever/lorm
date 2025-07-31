import { LormError, ErrorType, ErrorSeverity, ErrorContext, FileSystemErrorCode, FileSystemError } from '../types.js';

export type { FileSystemErrorCode, FileSystemError };

/**
 * Type guard to check if an error is a Node.js file system error
 */
export function isNodeFileSystemError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    Object.values(FileSystemErrorCode).includes(error.code as FileSystemErrorCode)
  );
}

/**
 * Type guard to check if an error is our custom FileSystemError
 */
export function isFileSystemError(error: unknown): error is FileSystemError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    Object.values(FileSystemErrorCode).includes(error.code as FileSystemErrorCode)
  );
}

/**
 * Convert a Node.js file system error to our FileSystemError
 */
export function normalizeFileSystemError(error: unknown, operation?: string): FileSystemError {
  if (isNodeFileSystemError(error)) {
    const fsError = error as FileSystemError;
    fsError.code = (error.code as FileSystemErrorCode) || FileSystemErrorCode.UNKNOWN;
    return fsError;
  }

  if (error instanceof Error) {
    const fsError = error as FileSystemError;
    fsError.code = FileSystemErrorCode.UNKNOWN;
    return fsError;
  }

  const unknownError = new Error(
    operation ? `${operation} failed: ${String(error)}` : String(error)
  ) as FileSystemError;
  unknownError.code = FileSystemErrorCode.UNKNOWN;
  return unknownError;
}

/**
 * Create a LormError from a file system error
 */
export function createFileSystemLormError(
  error: FileSystemError,
  operation: string,
  context?: Partial<ErrorContext>
): LormError {
  const severity = getErrorSeverity(error.code);
  const userMessage = getUserMessage(error.code, operation, error.path);
  
  return {
    type: ErrorType.FILE_SYSTEM,
    severity,
    code: `FS_${error.code}`,
    message: error.message,
    userMessage,
    context: {
      timestamp: new Date().toISOString(),
      ...context
    },
    recoveryActions: getRecoveryActions(error.code, operation, error.path),
    originalError: error
  };
}

/**
 * Get error severity based on error code
 */
function getErrorSeverity(code: FileSystemErrorCode): ErrorSeverity {
  switch (code) {
    case FileSystemErrorCode.FILE_NOT_FOUND:
    case FileSystemErrorCode.FILE_EXISTS:
      return ErrorSeverity.MEDIUM;
    case FileSystemErrorCode.PERMISSION_DENIED:
    case FileSystemErrorCode.OPERATION_NOT_PERMITTED:
      return ErrorSeverity.HIGH;
    case FileSystemErrorCode.DISK_FULL:
    case FileSystemErrorCode.TOO_MANY_OPEN_FILES:
      return ErrorSeverity.CRITICAL;
    default:
      return ErrorSeverity.MEDIUM;
  }
}

/**
 * Get user-friendly error message
 */
function getUserMessage(code: FileSystemErrorCode, operation: string, path?: string): string {
  const pathInfo = path ? ` '${path}'` : '';
  
  switch (code) {
    case FileSystemErrorCode.FILE_NOT_FOUND:
      return `File or directory${pathInfo} not found during ${operation}`;
    case FileSystemErrorCode.PERMISSION_DENIED:
      return `Permission denied when trying to ${operation}${pathInfo}`;
    case FileSystemErrorCode.FILE_EXISTS:
      return `File${pathInfo} already exists, cannot ${operation}`;
    case FileSystemErrorCode.DIRECTORY_NOT_EMPTY:
      return `Directory${pathInfo} is not empty, cannot ${operation}`;
    case FileSystemErrorCode.DISK_FULL:
      return `Not enough disk space to ${operation}${pathInfo}`;
    case FileSystemErrorCode.TOO_MANY_OPEN_FILES:
      return `Too many open files, cannot ${operation}${pathInfo}`;
    case FileSystemErrorCode.OPERATION_NOT_PERMITTED:
      return `Operation not permitted: ${operation}${pathInfo}`;
    default:
      return `Failed to ${operation}${pathInfo}`;
  }
}

/**
 * Get recovery actions based on error code
 */
function getRecoveryActions(code: FileSystemErrorCode, operation: string, path?: string) {
  const actions = [];
  
  switch (code) {
    case FileSystemErrorCode.FILE_NOT_FOUND:
      actions.push({
        description: 'Check if the file path is correct',
        priority: 1
      });
      if (operation.includes('read') || operation.includes('access')) {
        actions.push({
          description: 'Create the missing file or directory',
          priority: 2
        });
      }
      break;
      
    case FileSystemErrorCode.PERMISSION_DENIED:
      actions.push({
        description: 'Check file/directory permissions',
        command: path ? `ls -la "${path}"` : undefined,
        priority: 1
      });
      actions.push({
        description: 'Run with appropriate permissions or change ownership',
        priority: 2
      });
      break;
      
    case FileSystemErrorCode.FILE_EXISTS:
      if (operation.includes('create') || operation.includes('write')) {
        actions.push({
          description: 'Use a different filename or remove the existing file',
          priority: 1
        });
        actions.push({
          description: 'Use overwrite mode if supported',
          priority: 2
        });
      }
      break;
      
    case FileSystemErrorCode.DISK_FULL:
      actions.push({
        description: 'Free up disk space',
        command: 'df -h',
        priority: 1
      });
      actions.push({
        description: 'Clean up temporary files',
        priority: 2
      });
      break;
      
    default:
      actions.push({
        description: 'Check system logs for more details',
        priority: 1
      });
  }
  
  return actions;
}

/**
 * Utility function to handle file system operations with proper error handling
 */
export async function handleFileSystemOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: Partial<ErrorContext>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const fsError = normalizeFileSystemError(error, operationName);
    const lormError = createFileSystemLormError(fsError, operationName, context);
    throw lormError;
  }
}

/**
 * Utility function to handle synchronous file system operations
 */
export function handleFileSystemOperationSync<T>(
  operation: () => T,
  operationName: string,
  context?: Partial<ErrorContext>
): T {
  try {
    return operation();
  } catch (error) {
    const fsError = normalizeFileSystemError(error, operationName);
    const lormError = createFileSystemLormError(fsError, operationName, context);
    throw lormError;
  }
}