declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve?: (handler: (req: Request) => Response | Promise<Response>) => void;
};

declare module 'https://deno.land/std@0.224.0/http/server.ts' {
  export type ServeInit = {
    port?: number;
    onListen?: (params: { port: number; hostname: string }) => void;
  };
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
    options?: ServeInit,
  ): void;
}

declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export type ServeInit = {
    port?: number;
    onListen?: (params: { port: number; hostname: string }) => void;
  };
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
    options?: ServeInit,
  ): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.45.4' {
  export * from '@supabase/supabase-js';
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}

declare module 'https://esm.sh/marked@9.1.2' {
  export * from 'marked';
  import { marked } from 'marked';
  export default marked;
}

declare module 'npm:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}

declare module 'npm:marked@9.1.2' {
  export * from 'marked';
}
