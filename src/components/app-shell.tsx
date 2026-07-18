import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  FolderTree,
  LogOut,
  Menu,
  Package,
  Printer,
  ShoppingBag,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { getStaffOrders } from "@/lib/pos.functions";

const links = [
  { to: "/owner", label: "Ringkasan", icon: BarChart3, owner: true },
  { to: "/cashier", label: "Antrean", icon: ClipboardList },
  { to: "/cashier/pos", label: "Buat Pesanan", icon: ShoppingBag },
  { to: "/cashier/inventory", label: "Stok", icon: Boxes },
  { to: "/owner/products", label: "Produk", icon: Package, owner: true },
  { to: "/owner/categories", label: "Kategori", icon: FolderTree, owner: true },
  { to: "/owner/staff", label: "Staf", icon: Users, owner: true },
  { to: "/app/settings/printer", label: "Printer", icon: Printer },
] as const;

export function AppShell({
  children,
  title,
  eyebrow,
  role,
}: {
  children: ReactNode;
  title: string;
  eyebrow: string;
  role: "owner" | "cashier";
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const visible = links.filter((link) => role === "owner" || !("owner" in link));
  const fetchOrders = useServerFn(getStaffOrders);
  const { data: orders } = useQuery({
    queryKey: ["staff-orders"],
    queryFn: () => fetchOrders(),
    refetchInterval: 5000,
  });
  const totalActive = (orders ?? []).filter((o: any) => !["completed", "cancelled"].includes(o.status)).length;
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-background p-5 lg:flex lg:flex-col">
        <Brand />
        <nav className="mt-10 flex flex-1 flex-col gap-1">
          {visible.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition hover:bg-muted hover:text-foreground ${pathname === to ? "bg-primary-soft text-primary" : "text-muted-foreground"}`}
            >
              <Icon className="size-4" />
              {label}
              {to === "/cashier" && totalActive > 0 && (
                <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {totalActive > 9 ? "9+" : totalActive}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" className="justify-start text-muted-foreground" onClick={signOut}>
          <LogOut />
          Keluar
        </Button>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b bg-background/90 px-4 py-4 backdrop-blur sm:px-8">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 lg:hidden"
                  aria-label="Buka menu navigasi"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-72 flex-col p-5">
                <SheetHeader className="border-b pb-5 text-left">
                  <SheetTitle>
                    <Brand />
                  </SheetTitle>
                  <SheetDescription>Menu {role === "owner" ? "Owner" : "Kasir"}</SheetDescription>
                </SheetHeader>
                <nav className="flex flex-1 flex-col gap-1 py-5">
                  {visible.map(({ to, label, icon: Icon }) => (
                    <SheetClose asChild key={to}>
                      <Link
                        to={to}
                        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition hover:bg-muted hover:text-foreground ${pathname === to ? "bg-primary-soft text-primary" : "text-muted-foreground"}`}
                      >
                        <Icon className="size-5" />
                        {label}
                        {to === "/cashier" && totalActive > 0 && (
                          <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                            {totalActive > 99 ? "99+" : totalActive}
                          </span>
                        )}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
                <Button
                  variant="ghost"
                  className="justify-start text-muted-foreground"
                  onClick={signOut}
                >
                  <LogOut />
                  Keluar
                </Button>
              </SheetContent>
            </Sheet>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                {eyebrow}
              </p>
              <h1 className="truncate font-display text-2xl font-bold">{title}</h1>
            </div>
            <div className="hidden sm:block lg:hidden">
              <Brand compact />
            </div>
            <span className="hidden rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success sm:block">
              {role === "owner" ? "Owner" : "Kasir"}
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 pb-24 sm:p-8">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t bg-background p-2 lg:hidden">
          {visible.slice(0, 4).map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`relative flex min-w-16 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold ${pathname === to ? "bg-primary-soft text-primary" : "text-muted-foreground"}`}
            >
              <Icon className="size-5" />
              {label}
              {to === "/cashier" && totalActive > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                  {totalActive > 99 ? "99+" : totalActive}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
