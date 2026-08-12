import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

/*
  Les routes /lovable/* (webhook d'authentification, aperçu des gabarits)
  s'authentifient elles-mêmes par signature. Les faire passer par nos gardes
  applicatifs les casserait — on les laisse traverser en premier.
*/
function estRouteLovable(url: string): boolean {
  return new URL(url).pathname.startsWith("/lovable/");
}

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  if (estRouteLovable(request.url)) return next();
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
