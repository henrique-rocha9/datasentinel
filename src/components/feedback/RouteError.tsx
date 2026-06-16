import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { reportLovableError } from "@/lib/lovable-error-reporting";

interface RouteErrorProps {
  error: Error;
  reset?: () => void;
  title?: string;
  description?: string;
}

/**
 * Standard error fallback for route boundaries. Reports the error to
 * Lovable observability and offers a retry path.
 */
export function RouteError({ error, reset, title, description }: RouteErrorProps) {
  useEffect(() => {
    console.error("[route-error]", error);
    reportLovableError(error, { boundary: "route" });
  }, [error]);

  return (
    <div role="alert" className="flex min-h-[40vh] items-center justify-center px-6 py-12">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-1 ring-destructive/30">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          {title ?? "Algo deu errado"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {description ?? error.message ?? "Ocorreu um erro inesperado ao carregar esta tela."}
        </p>
        {reset ? (
          <div className="mt-5">
            <Button size="sm" onClick={reset}>
              Tentar novamente
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
