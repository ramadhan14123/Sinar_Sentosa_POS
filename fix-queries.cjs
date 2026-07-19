const fs = require("fs");

function fix(file, type) {
  let c = fs.readFileSync(file, "utf8");
  if (type === "ing") {
    c = c.replace(
      "async (): Promise<any[]> => () as any,",
      "async (): Promise<any[]> => getIngredients() as any,",
    );
    c = c.replace(
      "async (): Promise<any[]> => () as any,",
      "async (): Promise<any[]> => getIngredientCategories() as any,",
    );
    c = c.replace(
      "async (): Promise<any> => ({}) as any,",
      "async (): Promise<any> => getStockMovements({ data: { ingredientId } }) as any,",
    );
  } else if (type === "sup") {
    c = c.replace(
      "async (): Promise<any[]> => () as any,",
      "async (): Promise<any[]> => getSuppliers() as any,",
    );
  } else if (type === "unit") {
    c = c.replace(
      "async (): Promise<any[]> => () as any,",
      "async (): Promise<any[]> => getUnits() as any,",
    );
  } else if (type === "pur") {
    c = c.replace(
      "queryFn: async (): Promise<any> => ({}) as any,",
      "queryFn: async (): Promise<any> => getPurchaseOrders({ data: { page, pageSize, status: status as any } }) as any,",
    );
  }
  fs.writeFileSync(file, c);
}

fix("src/features/ingredients/queries/ingredient.queries.ts", "ing");
fix("src/features/suppliers/queries/supplier.queries.ts", "sup");
fix("src/features/inventory/queries/unit.queries.ts", "unit");
fix("src/features/purchases/queries/purchase.queries.ts", "pur");
