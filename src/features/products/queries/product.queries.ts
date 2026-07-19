import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: async () => {
    const [products, categories] = await Promise.all([
      supabase.from("products").select("*").eq("is_active", true).order("name"),
      supabase.from("categories").select("*").order("sort_order"),
    ]);
    if (products.error || categories.error) throw new Error("Katalog belum dapat dimuat.");
    return { products: products.data, categories: categories.data };
  },
});
