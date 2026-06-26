import { QueryClient } from "@tanstack/react-query";
import { createRouter, Link } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: () => (
      <div className="grid min-h-screen place-items-center bg-surface px-6 text-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">404</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold">Halaman tidak ditemukan</h1>
          <p className="mt-2 text-muted-foreground">Periksa kembali alamat atau kembali ke beranda.</p>
          <Link to="/" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-color">Kembali ke beranda</Link>
        </div>
      </div>
    ),
  });

  return router;
};
