import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Login Staf — Sinar Sentosa" }, { name: "description", content: "Akses aman untuk Owner dan Kasir Sinar Sentosa." }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false);
  async function login(e: React.FormEvent) { e.preventDefault(); setLoading(true); const { error } = await supabase.auth.signInWithPassword({ email, password }); setLoading(false); if (error) return toast.error("Email atau password tidak sesuai."); await navigate({ to: "/dashboard", replace: true }); }
  return <main className="grid min-h-screen bg-surface lg:grid-cols-2"><section className="hidden bg-foreground p-16 text-background lg:flex lg:flex-col lg:justify-between"><Brand /><div><p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-warning">Operasional lebih ringan</p><h1 className="max-w-xl text-5xl font-extrabold leading-tight">Kelola pesanan, stok, dan performa dalam satu tempat.</h1></div><p className="text-sm text-background/60">Sinar Sentosa • Sistem operasional F&B</p></section><section className="flex items-center justify-center p-6"><div className="w-full max-w-md"><div className="mb-10 lg:hidden"><Brand /></div><p className="text-sm font-bold text-primary">AKSES STAF</p><h1 className="mt-2 text-3xl font-extrabold">Selamat datang kembali</h1><p className="mt-2 text-muted-foreground">Masuk menggunakan akun Owner atau Kasir.</p><form onSubmit={login} className="mt-8 space-y-5"><div><label className="mb-2 block text-sm font-bold" htmlFor="email">Email</label><div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 pl-10" placeholder="nama@restoran.com"/></div></div><div><label className="mb-2 block text-sm font-bold" htmlFor="password">Password</label><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pl-10"/></div></div><Button className="h-12 w-full text-base shadow-color" disabled={loading}>{loading ? "Memeriksa..." : "Masuk ke dashboard"}</Button></form><p className="mt-6 text-center text-xs text-muted-foreground">Akun Owner dibuat melalui administrasi Cloud. Tidak ada pendaftaran publik.</p></div></section></main>;
}