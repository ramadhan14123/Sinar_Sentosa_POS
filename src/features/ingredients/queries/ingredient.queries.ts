import { getIngredientCategories, getStockMovements } from "../services/ingredient.functions";
import { queryOptions } from "@tanstack/react-query";
import { getIngredients } from "../services/ingredient.functions";

export const ingredientsQuery = queryOptions({
  queryKey: ["ingredients"],
  queryFn: async (): Promise<any[]> => getIngredients() as any,
});

export const ingredientCategoriesQuery = queryOptions({
  queryKey: ["ingredientCategories"],
  queryFn: async (): Promise<any[]> => getIngredientCategories() as any,
});

export const stockMovementsQuery = (ingredientId: string) =>
  queryOptions({
    queryKey: ["stockMovements", ingredientId],
    queryFn: async (): Promise<any> => getStockMovements({ data: { ingredientId } }) as any,
  });
