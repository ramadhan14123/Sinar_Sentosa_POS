import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRole } from "@/features/auth/services/auth.functions";

export function useRole() {
  const getRole = useServerFn(getMyRole);
  return useQuery({ queryKey: ["my-role"], queryFn: () => getRole() });
}
