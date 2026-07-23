import { Minus, Plus, Search, Utensils } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { formatIDR } from "@/shared/utils/format";

type CategoryItem = {
  id: string;
  name: string;
};

type ProductItem = {
  id: string;
  name: string;
  price_idr: number;
  stock: number;
  image_url: string | null;
  category_id: string | null;
};

type Props = {
  products: ProductItem[];
  categories: CategoryItem[];
  cart: Record<string, number>;
  onUpdateQuantity: (id: string, amount: number, maxStock: number) => void;
};

export function PosProductGrid({ products, categories, cart, onUpdateQuantity }: Props) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          (selectedCategory === "all" || p.category_id === selectedCategory) &&
          p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [products, selectedCategory, searchQuery],
  );

  const sections = useMemo(() => {
    if (selectedCategory !== "all") return [{ id: selectedCategory, name: "", products: filteredProducts }];
    const ids = new Set(categories.map((c) => c.id));
    const out = categories.map((c) => ({
      id: c.id,
      name: c.name,
      products: filteredProducts.filter((p) => p.category_id === c.id),
    }));
    const other = filteredProducts.filter((p) => !p.category_id || !ids.has(p.category_id));
    if (other.length) out.push({ id: "other", name: "Lainnya", products: other });
    return out.filter((s) => s.products.length > 0);
  }, [selectedCategory, categories, filteredProducts]);

  return (
    <div className="min-w-0">
      <div className="relative mb-5 max-w-2xl">
        <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari menu..."
          className="h-12 rounded-2xl border-border/60 bg-background pl-12 shadow-sm"
        />
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          onClick={() => setSelectedCategory("all")}
          className="rounded-full px-5"
          size="sm"
        >
          Semua
        </Button>
        {categories.map((c) => (
          <Button
            key={c.id}
            variant={selectedCategory === c.id ? "default" : "outline"}
            onClick={() => setSelectedCategory(c.id)}
            className="rounded-full px-5"
            size="sm"
          >
            {c.name}
          </Button>
        ))}
      </div>

      {sections.length ? (
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.id}>
              {selectedCategory === "all" && section.name && (
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-extrabold">{section.name}</h2>
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                    {section.products.length} menu
                  </span>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-1 xl:grid-cols-2">
                {section.products.map((p) => {
                  const qty = cart[p.id] ?? 0;
                  return (
                    <article
                      key={p.id}
                      className="grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-transparent bg-background p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:border-primary/10 hover:shadow-md"
                    >
                      <div className="relative size-20 overflow-hidden rounded-xl bg-primary-soft">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="grid size-full place-items-center">
                            <Utensils className="size-7 text-primary/40" />
                          </div>
                        )}
                        {p.stock === 0 && (
                          <div className="absolute inset-0 grid place-items-center bg-foreground/60">
                            <span className="text-[10px] font-bold text-background">HABIS</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-base font-bold">{p.name}</h3>
                        <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                          Stok {p.stock}
                        </p>
                        <p className="mt-1 font-display text-lg font-bold text-primary">
                          {formatIDR(p.price_idr)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {qty > 0 ? (
                          <>
                            <Button
                              size="icon"
                              variant="outline"
                              className="size-10 rounded-xl"
                              onClick={() => onUpdateQuantity(p.id, -1, p.stock)}
                              aria-label="Kurangi"
                            >
                              <Minus />
                            </Button>
                            <span className="w-6 text-center font-display text-base font-bold">
                              {qty}
                            </span>
                            <Button
                              size="icon"
                              className="size-10 rounded-xl shadow-color"
                              disabled={qty >= p.stock}
                              onClick={() => onUpdateQuantity(p.id, 1, p.stock)}
                              aria-label="Tambah"
                            >
                              <Plus />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="icon"
                            className="size-11 rounded-xl shadow-color"
                            disabled={p.stock === 0}
                            onClick={() => onUpdateQuantity(p.id, 1, p.stock)}
                            aria-label="Tambah"
                          >
                            <Plus />
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
          Menu tidak ditemukan.
        </div>
      )}
    </div>
  );
}
