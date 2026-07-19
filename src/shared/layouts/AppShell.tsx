import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Clock,
  FolderTree,
  LogOut,
  Menu,
  Package,
  Printer,
  ShoppingBag,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Brand } from "../components/Brand";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { getStaffOrders } from "@/features/cashier/services/cashier.functions";

type NavLink = {
  to?: string;
  label: string;
  icon: any;
  owner?: boolean;
  children?: { to: string; label: string }[];
};

const links: NavLink[] = [
  { to: "/owner", label: "Ringkasan", icon: BarChart3, owner: true },
  { to: "/cashier", label: "Antrean", icon: ClipboardList },
  { to: "/cashier/pos", label: "Buat Pesanan", icon: ShoppingBag },
  { to: "/cashier/inventory", label: "Stok", icon: Boxes },
  { to: "/cashier/history", label: "Riwayat", icon: Clock },
  { to: "/owner/products", label: "Produk", icon: Package, owner: true },
  { to: "/owner/categories", label: "Kategori", icon: FolderTree, owner: true },
  {
    label: "Inventory",
    icon: Boxes,
    owner: true,
    children: [
      { to: "/owner/ingredients", label: "Bahan Baku" },
      { to: "/owner/units", label: "Satuan" },
      { to: "/owner/suppliers", label: "Supplier" },
      { to: "/owner/purchases", label: "Pembelian (PO)" },
    ],
  },
  { to: "/owner/staff", label: "Staf", icon: Users, owner: true },
  { to: "/app/settings/printer", label: "Printer", icon: Printer },
];

function NavItem({
  item,
  pathname,
  totalActive,
  isMobile = false,
}: {
  item: NavLink;
  pathname: string;
  totalActive: number;
  isMobile?: boolean;
}) {
  const [open, setOpen] = useState(
    pathname.startsWith("/owner/") && item.children?.some((c) => pathname === c.to),
  );
  const Icon = item.icon;

  if (item.children) {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={() => setOpen(!open)}
          className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold transition hover:bg-muted hover:text-foreground text-muted-foreground`}
        >
          <div className="flex items-center gap-3">
            <Icon className="size-5 lg:size-4" />
            {item.label}
          </div>
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        {open && (
          <div className="flex flex-col gap-1 pl-10 pr-2">
            {item.children.map((child) => {
              const isActive = pathname === child.to;
              const linkContent = (
                <Link
                  key={child.to}
                  to={child.to}
                  className={`block rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-muted hover:text-foreground ${isActive ? "bg-primary-soft text-primary" : "text-muted-foreground"}`}
                >
                  {child.label}
                </Link>
              );

              if (isMobile) {
                return (
                  <SheetClose asChild key={child.to}>
                    {linkContent}
                  </SheetClose>
                );
              }
              return linkContent;
            })}
          </div>
        )}
      </div>
    );
  }

  const isActive = pathname === item.to;
  const linkContent = (
    <Link
      to={item.to!}
      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition hover:bg-muted hover:text-foreground ${isActive ? "bg-primary-soft text-primary" : "text-muted-foreground"}`}
    >
      <Icon className="size-5 lg:size-4" />
      {item.label}
      {item.to === "/cashier" && totalActive > 0 && (
        <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
          {totalActive > (isMobile ? 99 : 9) ? (isMobile ? "99+" : "9+") : totalActive}
        </span>
      )}
    </Link>
  );

  if (isMobile) {
    return <SheetClose asChild>{linkContent}</SheetClose>;
  }

  return linkContent;
}

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
  const visible = links.filter((link) => role === "owner" || !link.owner);
  const fetchOrders = useServerFn(getStaffOrders);

  const { data: orders } = useQuery({
    queryKey: ["staff-orders"],
    queryFn: () => fetchOrders(),
    refetchInterval: 5000,
  });

  const totalActive = (orders ?? []).filter(
    (o: any) => !["completed", "cancelled"].includes(o.status),
  ).length;

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
        <nav className="mt-10 flex flex-1 flex-col gap-1 overflow-y-auto no-scrollbar">
          {visible.map((item, idx) => (
            <NavItem key={idx} item={item} pathname={pathname} totalActive={totalActive} />
          ))}
        </nav>
        <Button
          variant="ghost"
          className="mt-4 justify-start text-muted-foreground"
          onClick={signOut}
        >
          <LogOut className="mr-2" />
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
                <SheetHeader className="border-b pb-5 text-left shrink-0">
                  <SheetTitle>
                    <Brand />
                  </SheetTitle>
                  <SheetDescription>Menu {role === "owner" ? "Owner" : "Kasir"}</SheetDescription>
                </SheetHeader>
                <nav className="flex flex-1 flex-col gap-1 py-5 overflow-y-auto no-scrollbar">
                  {visible.map((item, idx) => (
                    <NavItem
                      key={idx}
                      item={item}
                      pathname={pathname}
                      totalActive={totalActive}
                      isMobile
                    />
                  ))}
                </nav>
                <Button
                  variant="ghost"
                  className="shrink-0 justify-start text-muted-foreground"
                  onClick={signOut}
                >
                  <LogOut className="mr-2" />
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

        <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t bg-background p-2 lg:hidden pb-safe">
          {/* Bottom nav always shows first 4 items (cashier items) */}
          {visible
            .filter((i) => !i.children)
            .slice(0, 4)
            .map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to!}
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
