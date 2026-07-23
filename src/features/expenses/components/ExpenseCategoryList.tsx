import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { useExpenseCategoriesQuery } from "../queries/expense.queries";
import {
  saveExpenseCategory,
  deleteExpenseCategory,
  type ExpenseCategory,
} from "../services/expense.functions";

type CategoryFormData = { name: string; description: string };

const EMPTY_FORM: CategoryFormData = { name: "", description: "" };

export function ExpenseCategoryList() {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveExpenseCategory);
  const deleteFn = useServerFn(deleteExpenseCategory);

  const catQuery = useExpenseCategoriesQuery();
  const { data: categories = [], isLoading } = useQuery(catQuery);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ExpenseCategory | null>(null);
  const [form, setForm] = useState<CategoryFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(cat: ExpenseCategory) {
    setEditTarget(cat);
    setForm({ name: cat.name, description: cat.description ?? "" });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error("Nama kategori wajib diisi.");
    setSaving(true);
    try {
      await saveFn({
        data: {
          id: editTarget?.id,
          name: form.name.trim(),
          description: form.description.trim() || null,
        },
      });
      toast.success(editTarget ? "Kategori diperbarui." : "Kategori ditambahkan.");
      qc.invalidateQueries({ queryKey: ["expense-categories"] });
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFn({ data: { id } });
      toast.success("Kategori dihapus.");
      qc.invalidateQueries({ queryKey: ["expense-categories"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Kategori Pengeluaran</h3>
        <Button size="sm" onClick={openAdd} className="gap-2">
          <Plus className="size-4" /> Tambah Kategori
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-12 text-center">
          <Tag className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Belum ada kategori.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border">
          {categories.map((cat, i) => (
            <li
              key={cat.id}
              className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{cat.name}</p>
                {cat.description && (
                  <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                  <Pencil className="size-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus Kategori?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Kategori <strong>{cat.name}</strong> akan dihapus. Pastikan tidak ada pengeluaran yang menggunakan kategori ini.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(cat.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Ya, Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="cat-name">Nama Kategori <span className="text-destructive">*</span></Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Contoh: Transportasi"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="cat-desc">Deskripsi</Label>
              <Input
                id="cat-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Opsional"
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
