import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">La ruta solicitada no existe.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Error al cargar</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ocurrió un problema. Intenta de nuevo.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AP Down Monitor — NOC" },
      { name: "description", content: "Monitor interno de Access Points caídos para equipos NOC." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "AP Down Monitor — NOC" },
      { property: "og:description", content: "Monitor interno de Access Points caídos para equipos NOC." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "AP Down Monitor — NOC" },
      { name: "twitter:description", content: "Monitor interno de Access Points caídos para equipos NOC." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ddc01579-38ac-4cbc-a92b-6c8c4b930d63/id-preview-d91021fb--217b91b4-5875-4cb9-b8de-a8812de100a7.lovable.app-1784575968209.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ddc01579-38ac-4cbc-a92b-6c8c4b930d63/id-preview-d91021fb--217b91b4-5875-4cb9-b8de-a8812de100a7.lovable.app-1784575968209.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white border-b-2 border-transparent transition-colors"
      activeProps={{ className: "px-3 py-2 text-sm font-medium text-white border-b-2 border-sky-400" }}
    >
      {label}
    </Link>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-50">
        <header className="bg-slate-900 text-white border-b border-slate-800">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded bg-sky-500 flex items-center justify-center font-bold text-xs">
                  NOC
                </div>
                <div>
                  <div className="text-sm font-semibold leading-tight">AP Down Monitor</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Network Operations</div>
                </div>
              </div>
              <nav className="flex items-center h-14">
                <NavLink to="/dashboard" label="Dashboard" />
                <NavLink to="/" label="Estado de APs" />
                <NavLink to="/sitios" label="Resumen por Sitio" />
                <NavLink to="/carga" label="Carga de Datos" />
                <NavLink to="/config" label="Configuración" />
              </nav>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">
          <Outlet />
        </main>
      </div>
    </QueryClientProvider>
  );
}
