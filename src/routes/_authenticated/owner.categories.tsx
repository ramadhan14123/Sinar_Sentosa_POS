import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FolderPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { saveCategory } from "@/lib/pos.functions";

export const Route = createFileRoute("/_authenticated/owner/categories")({ component: CategoriesPage });
function CategoriesPage() { const role = useRole(); const save = useServerFn(saveCategory); const [name, setName] = useState(""); const query = useQuery({ queryKey: ["categories-admin"], queryFn: async () => { const { data, error } = await supabase.from("categories").select("*").order("sort_order"); if (error) throw error; return data; }, enabled: role.data?.role === "owner" }); if (role.data && role.data.role !== "owner") return <Navigate to="/cashier" replace/>; return <AppShell role="owner" eyebrow="Katalog" title="Kategori Menu"><div className="grid gap-6 lg:grid-cols-[360px_1fr]"><form className="rounded-2xl border bg-background p-5" onSubmit={async (e) => { e.preventDefault(); try { await save({ data: { name, sortOrder: query.data?.length ?? 0 } }); setName(""); toast.success("Kategori ditambahkan."); await query.refetch(); } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal menambah kategori."); } }}><div className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><FolderPlus/></div><h2 className="mt-4 text-lg font-bold">Kategori baru</h2><p className="mt-1 text-sm text-muted-foreground">Kategori akan muncul sebagai filter menu pelanggan.</p><Input className="mt-5" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Minuman" maxLength={60}/><Button className="mt-3 w-full">Tambah kategori</Button></form><div className="overflow-hidden rounded-2xl border bg-background"><div className="divide-y">{query.data?.map((c, index) => <div className="flex items-center gap-4 p-5" key={c.id}><span className="grid size-9 place-items-center rounded-lg bg-muted text-sm font-bold">{index + 1}</span><div className="flex-1"><p className="font-bold">{c.name}</p><p className="text-xs text-muted-foreground">Urutan tampil {c.sort_order}</p></div></div>)}</div></div></div></AppShell>; }