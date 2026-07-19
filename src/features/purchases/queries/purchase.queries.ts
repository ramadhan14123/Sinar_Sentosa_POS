import { queryOptions } from "@tanstack/react-query";
import { getPurchaseOrders } from "../services/purchase.functions";

export const purchaseOrdersQuery = (page: number, pageSize: number, status?: string) =>
  queryOptions({
    queryKey: ["purchaseOrders", page, pageSize, status],
    queryFn: async (): Promise<any> =>
      getPurchaseOrders({ data: { page, pageSize, status: status as any } }) as any,
  });
