export interface LormRouterRegistry {
  [key: string]: any;
}

export interface GlobalLormRouter {
  [key: string]: any;
}

export type LormRouter = LormRouterRegistry;

export type DynamicLormRouter = Record<string, any>;

export type LoadedLormTypes = LormRouter | DynamicLormRouter | Record<string, never>;

declare module '@lorm/client' {
  interface LormRouterRegistry {
    [key: string]: any;
  }
}