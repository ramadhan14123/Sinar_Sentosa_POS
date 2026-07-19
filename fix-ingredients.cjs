const fs = require("fs");

let ingFn = fs.readFileSync("src/features/ingredients/services/ingredient.functions.ts", "utf8");
ingFn += `
export const getIngredientCategories = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context, 'owner');
    const { data, error } = await (context.supabase as any).from('ingredient_categories').select('*').order('name');
    if (error) throw new Error('Gagal memuat kategori bahan baku.');
    return data as any;
  });

export const getStockMovements = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ ingredientId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertRole(context, 'owner');
    const { data: movements, error } = await (context.supabase as any)
      .from('stock_movements')
      .select('*, created_by_user:profiles(full_name)')
      .eq('ingredient_id', data.ingredientId)
      .order('created_at', { ascending: false });
    if (error) throw new Error('Gagal memuat histori stok.');
    return movements as any;
  });
`;
ingFn = ingFn.replace(/context\.supabase\.from/g, "(context.supabase as any).from");
ingFn = ingFn.replace(/supabaseAdmin\.from/g, "(supabaseAdmin as any).from");
fs.writeFileSync("src/features/ingredients/services/ingredient.functions.ts", ingFn);

let ingQ = fs.readFileSync("src/features/ingredients/queries/ingredient.queries.ts", "utf8");
ingQ =
  `import { getIngredientCategories, getStockMovements } from '../services/ingredient.functions';
` + ingQ;
ingQ += `
export const ingredientCategoriesQuery = queryOptions({
  queryKey: ['ingredientCategories'],
  queryFn: () => getIngredientCategories(),
});

export const stockMovementsQuery = (ingredientId: string) => queryOptions({
  queryKey: ['stockMovements', ingredientId],
  queryFn: () => getStockMovements({ data: { ingredientId } }),
});
`;
fs.writeFileSync("src/features/ingredients/queries/ingredient.queries.ts", ingQ);
