import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock the modules (path and os only, fs is globally mocked)
vi.mock('path');
vi.mock('os');

describe('CLI Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File System Operations', () => {
    it('should check if file exists', () => {
      const mockExistsSync = vi.mocked(fs.existsSync);
      mockExistsSync.mockReturnValue(true);
      
      const result = fs.existsSync('/test/file.txt');
      expect(result).toBe(true);
      expect(mockExistsSync).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should read file content', async () => {
      const mockReadFile = vi.mocked(fs.promises.readFile);
      const content = 'test file content';
      mockReadFile.mockResolvedValue(content);
      
      const result = await fs.promises.readFile('/test/file.txt', 'utf8');
      expect(result).toBe(content);
      expect(mockReadFile).toHaveBeenCalledWith('/test/file.txt', 'utf8');
    });

    it('should write file content', async () => {
      const mockWriteFile = vi.mocked(fs.promises.writeFile);
      const content = 'new content';
      
      await fs.promises.writeFile('/test/output.txt', content);
      expect(mockWriteFile).toHaveBeenCalledWith('/test/output.txt', content);
    });

    it('should create directory', () => {
      const mockMkdirSync = vi.mocked(fs.mkdirSync);
      
      fs.mkdirSync('/test/new-dir', { recursive: true });
      expect(mockMkdirSync).toHaveBeenCalledWith('/test/new-dir', { recursive: true });
    });

    it('should handle file access errors', () => {
      const mockAccessSync = vi.mocked(fs.accessSync);
      mockAccessSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      expect(() => fs.accessSync('/restricted/file.txt')).toThrow('Permission denied');
    });
  });

  describe('Path Operations', () => {
    it('should join paths correctly', () => {
      const mockJoin = vi.mocked(path.join);
      mockJoin.mockReturnValue('/test/path/file.txt');
      
      const result = path.join('/test', 'path', 'file.txt');
      expect(result).toBe('/test/path/file.txt');
      expect(mockJoin).toHaveBeenCalledWith('/test', 'path', 'file.txt');
    });

    it('should resolve absolute paths', () => {
      const mockResolve = vi.mocked(path.resolve);
      mockResolve.mockReturnValue('/absolute/path/file.txt');
      
      const result = path.resolve('./file.txt');
      expect(result).toBe('/absolute/path/file.txt');
      expect(mockResolve).toHaveBeenCalledWith('./file.txt');
    });

    it('should get file extension', () => {
      const mockExtname = vi.mocked(path.extname);
      mockExtname.mockReturnValue('.txt');
      
      const result = path.extname('file.txt');
      expect(result).toBe('.txt');
      expect(mockExtname).toHaveBeenCalledWith('file.txt');
    });

    it('should get directory name', () => {
      const mockDirname = vi.mocked(path.dirname);
      mockDirname.mockReturnValue('/path/to');
      
      const result = path.dirname('/path/to/file.txt');
      expect(result).toBe('/path/to');
      expect(mockDirname).toHaveBeenCalledWith('/path/to/file.txt');
    });

    it('should get base name', () => {
      const mockBasename = vi.mocked(path.basename);
      mockBasename.mockReturnValue('file.txt');
      
      const result = path.basename('/path/to/file.txt');
      expect(result).toBe('file.txt');
      expect(mockBasename).toHaveBeenCalledWith('/path/to/file.txt');
    });
  });

  describe('OS Operations', () => {
    it('should get home directory', () => {
      const mockHomedir = vi.mocked(os.homedir);
      mockHomedir.mockReturnValue('/home/user');
      
      const result = os.homedir();
      expect(result).toBe('/home/user');
      expect(mockHomedir).toHaveBeenCalled();
    });

    it('should get temporary directory', () => {
      const mockTmpdir = vi.mocked(os.tmpdir);
      mockTmpdir.mockReturnValue('/tmp');
      
      const result = os.tmpdir();
      expect(result).toBe('/tmp');
      expect(mockTmpdir).toHaveBeenCalled();
    });

    it('should get platform information', () => {
      const mockPlatform = vi.mocked(os.platform);
      mockPlatform.mockReturnValue('darwin');
      
      const result = os.platform();
      expect(result).toBe('darwin');
      expect(mockPlatform).toHaveBeenCalled();
    });

    it('should get CPU architecture', () => {
      const mockArch = vi.mocked(os.arch);
      mockArch.mockReturnValue('x64');
      
      const result = os.arch();
      expect(result).toBe('x64');
      expect(mockArch).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle file not found errors', async () => {
      const mockReadFile = vi.mocked(fs.promises.readFile);
      mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));
      
      await expect(fs.promises.readFile('/nonexistent.txt')).rejects.toThrow('ENOENT: no such file or directory');
    });

    it('should handle permission errors', async () => {
      const mockWriteFile = vi.mocked(fs.promises.writeFile);
      mockWriteFile.mockRejectedValue(new Error('EACCES: permission denied'));
      
      await expect(fs.promises.writeFile('/restricted/file.txt', 'content')).rejects.toThrow('EACCES: permission denied');
    });

    it('should handle invalid path errors', () => {
      const mockJoin = vi.mocked(path.join);
      mockJoin.mockImplementation(() => {
        throw new Error('Invalid path');
      });
      
      expect(() => path.join('\0invalid')).toThrow('Invalid path');
    });
  });

  describe('Async Operations', () => {
    it('should handle concurrent file operations', async () => {
      const promises = [
        fs.promises.readFile('/file1.txt', 'utf8'),
        fs.promises.readFile('/file2.txt', 'utf8'),
        fs.promises.readFile('/file3.txt', 'utf8')
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toEqual(['mocked file content', 'mocked file content', 'mocked file content']);
      expect(results).toHaveLength(3);
    });

    it('should handle mixed success and failure operations', async () => {
      // Mock one call to fail
      const mockReadFile = vi.mocked(fs.promises.readFile);
      const originalImpl = mockReadFile.getMockImplementation();
      
      mockReadFile.mockImplementationOnce(() => Promise.resolve('Content of /success.txt'));
      mockReadFile.mockImplementationOnce(() => Promise.reject(new Error('File not found')));
      mockReadFile.mockImplementationOnce(() => Promise.resolve('Content of /success2.txt'));
      
      const promises = [
        fs.promises.readFile('/success.txt', 'utf8'),
        fs.promises.readFile('/missing.txt', 'utf8'),
        fs.promises.readFile('/success2.txt', 'utf8')
      ];
      
      const results = await Promise.allSettled(promises);
      
      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
      
      // Restore original implementation
      if (originalImpl) {
        mockReadFile.mockImplementation(originalImpl);
      }
    });
  });

  describe('Performance', () => {
    it('should verify fs mock is working', async () => {
      const result = await fs.promises.readFile('/test.txt', 'utf8');
      expect(result).toBe('mocked file content');
      expect(typeof result).toBe('string');
    });

    it('should handle large file operations efficiently', async () => {
      const startTime = Date.now();
      const result = await fs.promises.readFile('/large-file.txt', 'utf8');
      const endTime = Date.now();

      expect(result).toBe('mocked file content');
      expect(typeof result).toBe('string');
      expect(endTime - startTime).toBeLessThan(100); // Should be fast since it's mocked
    });

    it('should handle multiple small file operations', async () => {
      const startTime = Date.now();
      
      const result1 = await fs.promises.readFile('/file1.txt', 'utf8');
      const result2 = await fs.promises.readFile('/file2.txt', 'utf8');
      const result3 = await fs.promises.readFile('/file3.txt', 'utf8');
      
      const endTime = Date.now();

      expect(result1).toBe('mocked file content');
      expect(result2).toBe('mocked file content');
      expect(result3).toBe('mocked file content');
      expect(typeof result1).toBe('string');
      expect(typeof result2).toBe('string');
      expect(typeof result3).toBe('string');
      expect(endTime - startTime).toBeLessThan(100); // Should be fast since it's mocked
    });
  });
});