import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRole } from "@/lib/pos.functions";

export function useRole() {
  const getRole = useServerFn(getMyRole);
  return useQuery({ queryKey: ["my-role"], queryFn: () => getRole() });
}