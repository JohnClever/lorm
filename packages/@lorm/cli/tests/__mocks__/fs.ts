import { vi } from 'vitest';

// Mock fs module for testing
const mockFs = {
  existsSync: vi.fn(),
  readFileSync: vi.fn().mockImplementation((path: string, encoding?: string) => {
    const content = `Content of ${path}`;
    if (encoding === 'utf8' || encoding === 'utf-8') {
      return content;
    }
    // For tests, always return string to match expected behavior
    return content;
  }),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  rmSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  lstatSync: vi.fn(),
  copyFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  chmodSync: vi.fn(),
  accessSync: vi.fn(),
  promises: {
    readFile: vi.fn(() => Promise.resolve('mocked file content')),
    writeFile: vi.fn(),
    appendFile: vi.fn(),
    mkdir: vi.fn(),
    rmdir: vi.fn(),
    rm: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    lstat: vi.fn(),
    copyFile: vi.fn(),
    unlink: vi.fn(),
    chmod: vi.fn(),
    access: vi.fn(),
    exists: vi.fn()
  },
  constants: {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1
  }
};

export default mockFs;
export const {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  readdirSync,
  statSync,
  lstatSync,
  copyFileSync,
  unlinkSync,
  chmodSync,
  accessSync,
  promises,
  constants
} = mockFs;