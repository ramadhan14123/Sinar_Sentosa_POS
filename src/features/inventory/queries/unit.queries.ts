import { queryOptions } from "@tanstack/react-query";
import { getUnits } from "../services/unit.functions";

export const unitsQuery = queryOptions({
  queryKey: ["units"],
  queryFn: async (): Promise<any[]> => getUnits() as any,
});
