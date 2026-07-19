const fs = require("fs");

let c = fs.readFileSync("src/features/purchases/services/purchase.functions.ts", "utf8");
c = c.replace(/supabaseAdmin\.from/g, "(supabaseAdmin as any).from");
c = c.replace(/context\.supabase\.rpc/g, "(context.supabase as any).rpc");
fs.writeFileSync("src/features/purchases/services/purchase.functions.ts", c);

let ownerIng = fs.readFileSync("src/routes/_authenticated/owner.ingredients.tsx", "utf8");
ownerIng = ownerIng.replace(/stockMovementsQuery\(id\)/g, 'stockMovementsQuery(id || "")');
fs.writeFileSync("src/routes/_authenticated/owner.ingredients.tsx", ownerIng);

let ownerPur = fs.readFileSync("src/routes/_authenticated/owner.purchases.tsx", "utf8");
ownerPur = ownerPur.replace(/po =>/g, "(po: any) =>");
fs.writeFileSync("src/routes/_authenticated/owner.purchases.tsx", ownerPur);
