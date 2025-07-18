// Type declarations for Lorm client

// Module declaration for generated types
declare module ".lorm/types" {
  // This will be populated by the CLI's type generation
  export interface LormRouter {
    [key: string]: any;
  }
}

// Fallback when types aren't available
declare global {
  namespace Lorm {
    interface Router {
      [key: string]: any;
    }
  }
}

export {};