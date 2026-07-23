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
  ReceiptText,
  Settings2,
  ShoppingBag,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState, useEffect, useRef, type ReactNode } from "react";
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

import { isMenuFinished } from "@/shared/config/menu-status.config";

type NavChild = {
  to: string;
  label: string;
  owner?: boolean;
};

type NavGroup = {
  label: string;
  icon: any;
  to?: string;
  owner?: boolean;
  children?: NavChild[];
};

// ─── Business-Oriented Grouping (.docs/PHASE 1/strukturSidebar.md) ──────────

const navGroups: NavGroup[] = [
  {
    to: "/owner",
    label: "Ringkasan",
    icon: BarChart3,
    owner: true,
  },
  {
    label: "Penjualan",
    icon: ShoppingBag,
    children: [
      { to: "/cashier", label: "Antrean" },
      { to: "/cashier/pos", label: "Buat Pesanan" },
      { to: "/cashier/history", label: "Riwayat Penjualan" },
    ],
  },
  {
    label: "Produk",
    icon: Package,
    owner: true,
    children: [
      { to: "/owner/products", label: "Produk", owner: true },
      { to: "/owner/categories", label: "Kategori", owner: true },
    ],
  },
  {
    label: "Persediaan",
    icon: Boxes,
    children: [
      { to: "/cashier/inventory", label: "Stok" },
      { to: "/owner/ingredients", label: "Bahan Baku", owner: true },
      { to: "/owner/units", label: "Satuan", owner: true },
      { to: "/owner/suppliers", label: "Supplier", owner: true },
      { to: "/owner/purchases", label: "Pembelian (PO)", owner: true },
    ],
  },
  {
    label: "Keuangan",
    icon: ReceiptText,
    children: [
      { to: "/owner/expenses", label: "Pengeluaran", owner: true },
      { to: "/cashier/expenses", label: "Pengeluaran Toko" },
    ],
  },
  {
    label: "Manajemen",
    icon: Users,
    owner: true,
    children: [{ to: "/owner/staff", label: "Staf", owner: true }],
  },
  {
    label: "Pengaturan",
    icon: Settings2,
    children: [
      { to: "/app/settings/printer", label: "Printer & Toko" },
      { to: "/app/settings/storage", label: "Storage & Retensi" },
    ],
  },
];

function filterNavGroups(role: "owner" | "cashier"): NavGroup[] {
  return navGroups
    .map((group) => {
      if (group.owner && role !== "owner") return null;
      if (!group.children) return group;

      const visibleChildren = group.children.filter(
        (child) => role === "owner" || !child.owner,
      );

      if (visibleChildren.length === 0) return null;

      return {
        ...group,
        children: visibleChildren,
      };
    })
    .filter(Boolean) as NavGroup[];
}

// ─── Persistent Accordion State (localStorage) ───────────────────────────────
const STORAGE_KEY = "pos_sidebar_expanded_groups";
const SCROLL_KEY = "pos_sidebar_scroll_top";

function getInitialExpandedGroups(pathname: string): Record<string, boolean> {
  let saved: Record<string, boolean> = {};
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) saved = JSON.parse(stored);
    } catch { }
  }

  navGroups.forEach((group) => {
    if (group.children?.some((c) => c.to === pathname)) {
      saved[group.label] = true;
    }
  });

  return saved;
}

function saveExpandedGroups(state: Record<string, boolean>) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { }
  }
}

function getStoredScrollTop(): number {
  if (typeof window === "undefined") return 0;
  try {
    const val = sessionStorage.getItem(SCROLL_KEY);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveScrollTop(top: number) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SCROLL_KEY, top.toString());
  } catch { }
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

  const fetchOrders = useServerFn(getStaffOrders);
  const { data: orders } = useQuery({
    queryKey: ["staff-orders"],
    queryFn: () => fetchOrders(),
    refetchInterval: 5000,
  });

  const totalActive = (orders ?? []).filter(
    (o: any) => !["completed", "cancelled"].includes(o.status),
  ).length;

  const visibleGroups = filterNavGroups(role);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    getInitialExpandedGroups(pathname),
  );

  const navRef = useRef<HTMLElement | null>(null);

  // ─── Restore Sidebar Scroll Position ─────────────────────────────────────
  useEffect(() => {
    const savedTop = getStoredScrollTop();
    if (navRef.current && savedTop > 0) {
      navRef.current.scrollTop = savedTop;
    }
  }, [pathname, expandedGroups]);

  const handleNavScroll = (e: React.UIEvent<HTMLElement>) => {
    saveScrollTop(e.currentTarget.scrollTop);
  };

  useEffect(() => {
    setExpandedGroups((prev) => {
      let updated = { ...prev };
      let changed = false;
      navGroups.forEach((group) => {
        if (group.children?.some((c) => c.to === pathname) && !updated[group.label]) {
          updated[group.label] = true;
          changed = true;
        }
      });
      if (changed) {
        saveExpandedGroups(updated);
        return updated;
      }
      return prev;
    });
  }, [pathname]);

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups((prev) => {
      const next = {
        ...prev,
        [groupLabel]: !prev[groupLabel],
      };
      saveExpandedGroups(next);
      return next;
    });
  };

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  function renderNavContent(isMobile = false) {
    return visibleGroups.map((group) => {
      const Icon = group.icon;
      const isGroupFinished = isMenuFinished(group.label);

      // Standalone Item (e.g. Ringkasan)
      if (!group.children) {
        const isActive = pathname === group.to;
        const isItemFinished = isGroupFinished && isMenuFinished(group.to!);
        const linkContent = (
          <Link
            to={group.to!}
            className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-muted hover:text-foreground ${isActive ? "bg-primary-soft text-primary" : "text-muted-foreground"
              }`}
          >
            <div className="flex items-center gap-3">
              <Icon className="size-4 shrink-0" />
              <span>{group.label}</span>
            </div>
            {!isItemFinished && (
              <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Beta
              </span>
            )}
          </Link>
        );

        return isMobile ? (
          <SheetClose asChild key={group.label}>
            {linkContent}
          </SheetClose>
        ) : (
          <div key={group.label}>{linkContent}</div>
        );
      }

      // Group Header / Accordion
      const isOpen = !!expandedGroups[group.label];
      const hasActiveChild = group.children.some((c) => c.to === pathname);

      return (
        <div key={group.label} className="flex flex-col gap-1">
          <button
            onClick={() => toggleGroup(group.label)}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-muted hover:text-foreground ${hasActiveChild ? "text-primary font-bold" : "text-muted-foreground"
              }`}
          >
            <div className="flex items-center gap-3">
              <Icon className="size-4 shrink-0" />
              <span>{group.label}</span>
              {!isGroupFinished && (
                <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Beta
                </span>
              )}
            </div>
            {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          {isOpen && (
            <div className="flex flex-col gap-1 pl-9 pr-1">
              {group.children.map((child) => {
                const isActive = pathname === child.to;
                const isChildFinished = isMenuFinished(child.to);
                const childContent = (
                  <Link
                    to={child.to}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition hover:bg-muted hover:text-foreground ${isActive ? "bg-primary-soft text-primary font-bold" : "text-muted-foreground"
                      }`}
                  >
                    <span>{child.label}</span>
                    <div className="flex items-center gap-1.5">
                      {!isChildFinished && (
                        <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                          Beta
                        </span>
                      )}
                      {child.to === "/cashier" && totalActive > 0 && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                          {totalActive > 99 ? "99+" : totalActive}
                        </span>
                      )}
                    </div>
                  </Link>
                );

                return isMobile ? (
                  <SheetClose asChild key={child.to}>
                    {childContent}
                  </SheetClose>
                ) : (
                  <div key={child.to}>{childContent}</div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-background p-5 lg:flex lg:flex-col">
        <Brand />
        <nav
          ref={navRef}
          onScroll={handleNavScroll}
          className="mt-8 flex flex-1 flex-col gap-2 overflow-y-auto pr-1 custom-sidebar-scrollbar"
        >
          {renderNavContent(false)}
        </nav>
        <Button
          variant="ghost"
          className="mt-4 justify-start text-muted-foreground shrink-0"
          onClick={signOut}
        >
          <LogOut className="mr-2 size-4" />
          Keluar
        </Button>
      </aside>

      {/* Main Container */}
      <div className="lg:pl-64">
        {/* Header */}
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
                <nav className="flex flex-1 flex-col gap-2 py-5 overflow-y-auto pr-1 custom-sidebar-scrollbar">
                  {renderNavContent(true)}
                </nav>
                <Button
                  variant="ghost"
                  className="shrink-0 justify-start text-muted-foreground"
                  onClick={signOut}
                >
                  <LogOut className="mr-2 size-4" />
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

        {/* Content */}
        <main className="mx-auto max-w-7xl p-4 pb-24 sm:p-8">{children}</main>

        {/* Mobile Bottom Bar */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t bg-background p-2 lg:hidden pb-safe">
          {[
            { to: "/cashier", label: "Antrean", icon: ClipboardList, badge: totalActive },
            { to: "/cashier/pos", label: "Buat Pesanan", icon: ShoppingBag },
            { to: "/cashier/inventory", label: "Stok", icon: Boxes },
            { to: "/cashier/history", label: "Riwayat", icon: Clock },
          ].map(({ to, label, icon: Icon, badge }) => (
            <Link
              key={to}
              to={to}
              className={`relative flex min-w-16 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold ${pathname === to ? "bg-primary-soft text-primary" : "text-muted-foreground"
                }`}
            >
              <Icon className="size-5" />
              {label}
              {badge !== undefined && badge > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
