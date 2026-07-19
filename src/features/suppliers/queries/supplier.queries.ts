import { queryOptions } from "@tanstack/react-query";
import { getSuppliers } from "../services/supplier.functions";

export const suppliersQuery = queryOptions({
  queryKey: ["suppliers"],
  queryFn: async (): Promise<any[]> => getSuppliers() as any,
});
