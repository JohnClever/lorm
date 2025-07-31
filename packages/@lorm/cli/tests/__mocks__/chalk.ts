import { vi } from 'vitest';

// Mock chalk for testing
const createChalkMock = (color: string) => {
  const mock = vi.fn((text: string) => text) as any;
  mock.bold = vi.fn((text: string) => text);
  mock.dim = vi.fn((text: string) => text);
  mock.italic = vi.fn((text: string) => text);
  mock.underline = vi.fn((text: string) => text);
  mock.strikethrough = vi.fn((text: string) => text);
  return mock;
};

const chalk = {
  red: createChalkMock('red'),
  green: createChalkMock('green'),
  blue: createChalkMock('blue'),
  yellow: createChalkMock('yellow'),
  magenta: createChalkMock('magenta'),
  cyan: createChalkMock('cyan'),
  white: createChalkMock('white'),
  gray: createChalkMock('gray'),
  grey: createChalkMock('grey'),
  black: createChalkMock('black'),
  bold: vi.fn((text: string) => text),
  dim: vi.fn((text: string) => text),
  italic: vi.fn((text: string) => text),
  underline: vi.fn((text: string) => text),
  strikethrough: vi.fn((text: string) => text),
  reset: vi.fn((text: string) => text)
};

// Add chaining support
Object.keys(chalk).forEach(key => {
  if (typeof chalk[key as keyof typeof chalk] === 'function') {
    Object.keys(chalk).forEach(chainKey => {
      if (chainKey !== key && typeof chalk[chainKey as keyof typeof chalk] === 'function') {
        (chalk[key as keyof typeof chalk] as any)[chainKey] = chalk[chainKey as keyof typeof chalk];
      }
    });
  }
});

export default chalk;