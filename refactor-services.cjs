const { Project } = require("ts-morph");
const fs = require("fs");
const path = require("path");

const project = new Project({
  tsConfigFilePath: path.join(__dirname, "tsconfig.json"),
});

const posFuncsFile = project.getSourceFileOrThrow("src/lib/pos.functions.ts");
const invFuncsFile = project.getSourceFileOrThrow("src/lib/inventory.functions.ts");

const mappings = {
  getMyRole: "src/features/auth/services/auth.functions.ts",
  getStaffOrders: "src/features/cashier/services/cashier.functions.ts",
  getOrdersHistory: "src/features/cashier/services/cashier.functions.ts",
  confirmPayment: "src/features/cashier/services/cashier.functions.ts",
  changeOrderStatus: "src/features/cashier/services/cashier.functions.ts",
  getOrderById: "src/features/cashier/services/cashier.functions.ts",
  updateStock: "src/features/products/services/product.functions.ts",
  saveProduct: "src/features/products/services/product.functions.ts",
  deleteProduct: "src/features/products/services/product.functions.ts",
  saveCategory: "src/features/categories/services/category.functions.ts",
  deleteCategory: "src/features/categories/services/category.functions.ts",
  getAnalytics: "src/features/dashboard/services/dashboard.functions.ts",
  createCashier: "src/features/staff/services/staff.functions.ts",
  deleteCashier: "src/features/staff/services/staff.functions.ts",
  getStaffWithEmail: "src/features/staff/services/staff.functions.ts",

  getUnits: "src/features/inventory/services/unit.functions.ts",
  saveUnit: "src/features/inventory/services/unit.functions.ts",
  deleteUnit: "src/features/inventory/services/unit.functions.ts",
  getIngredientCategories: "src/features/ingredients/services/ingredient-category.functions.ts",
  saveIngredientCategory: "src/features/ingredients/services/ingredient-category.functions.ts",
  deleteIngredientCategory: "src/features/ingredients/services/ingredient-category.functions.ts",
  getIngredients: "src/features/ingredients/services/ingredient.functions.ts",
  saveIngredient: "src/features/ingredients/services/ingredient.functions.ts",
  adjustStock: "src/features/ingredients/services/ingredient.functions.ts",
  getSuppliers: "src/features/suppliers/services/supplier.functions.ts",
  saveSupplier: "src/features/suppliers/services/supplier.functions.ts",
  deleteSupplier: "src/features/suppliers/services/supplier.functions.ts",
  getProductRecipes: "src/features/products/services/recipe.functions.ts",
  saveProductRecipes: "src/features/products/services/recipe.functions.ts",
  getPurchaseOrders: "src/features/purchases/services/purchase.functions.ts",
  getPurchaseOrderById: "src/features/purchases/services/purchase.functions.ts",
  savePurchaseOrder: "src/features/purchases/services/purchase.functions.ts",
  completePurchaseOrder: "src/features/purchases/services/purchase.functions.ts",
  cancelPurchaseOrder: "src/features/purchases/services/purchase.functions.ts",
  getStockMovements: "src/features/ingredients/services/stock.functions.ts",
};

const queryMappings = {
  catalogQuery: "src/features/products/queries/product.queries.ts",
  inventoryOptions: "src/features/inventory/queries/inventory.queries.ts",
};

const commonPrefix = `import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertRole(context: { supabase: any; userId: string }, role: "owner" | "cashier") {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: role,
  });
  if (error || !data) throw new Error("Anda tidak memiliki akses untuk tindakan ini.");
}
`;

const dashboardHelpers = `
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

function getJakartaDateParts(date = new Date()) {
  const jakartaDate = new Date(date.getTime() + JAKARTA_OFFSET_MS);
  return {
    year: jakartaDate.getUTCFullYear(),
    month: jakartaDate.getUTCMonth(),
    date: jakartaDate.getUTCDate(),
    hour: jakartaDate.getUTCHours(),
  };
}

function jakartaWallTimeToUtc(year: number, month: number, date: number) {
  return new Date(Date.UTC(year, month, date) - JAKARTA_OFFSET_MS);
}
`;

const productSchema = `
const productSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500),
  price_idr: z.number().int().positive().max(100_000_000),
  stock: z.number().int().min(0).max(1_000_000),
  image_url: z.string().max(1000).nullable(),
  is_active: z.boolean(),
});
`;

let targetContents = {};

function addDeclaration(name, declText, targetPath, extraCode = "") {
  if (!targetContents[targetPath]) {
    targetContents[targetPath] = commonPrefix + extraCode;
  }
  targetContents[targetPath] += "\n" + declText + "\n";
}

[posFuncsFile, invFuncsFile].forEach((file) => {
  file.getVariableStatements().forEach((stmt) => {
    const isExported = stmt.isExported();
    if (isExported) {
      stmt.getDeclarations().forEach((decl) => {
        const name = decl.getName();
        if (mappings[name]) {
          let extra = "";
          if (mappings[name].includes("dashboard")) extra = dashboardHelpers;
          if (mappings[name].includes("product.functions")) extra = productSchema;

          addDeclaration(name, stmt.getText(), mappings[name], extra);
        }
      });
    }
  });
});

Object.entries(targetContents).forEach(([targetPath, content]) => {
  const fullPath = path.join(__dirname, targetPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  console.log("Created", targetPath);
});

// Queries refactoring
const queriesFile = project.getSourceFileOrThrow("src/lib/queries.ts");
const invQueriesFile = project.getSourceFileOrThrow("src/lib/inventory.queries.ts");

let queriesContents = {};
function addQuery(name, declText, targetPath) {
  if (!queriesContents[targetPath]) {
    queriesContents[targetPath] =
      `import { queryOptions } from "@tanstack/react-query";\nimport { supabase } from "@/integrations/supabase/client";\n\n`;
  }
  queriesContents[targetPath] += declText + "\n";
}

[queriesFile, invQueriesFile].forEach((file) => {
  file.getVariableStatements().forEach((stmt) => {
    if (stmt.isExported()) {
      stmt.getDeclarations().forEach((decl) => {
        const name = decl.getName();
        if (queryMappings[name]) {
          addQuery(name, stmt.getText(), queryMappings[name]);
        }
      });
    }
  });
});

Object.entries(queriesContents).forEach(([targetPath, content]) => {
  const fullPath = path.join(__dirname, targetPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  console.log("Created", targetPath);
});

// Update routes imports
const routeFiles = project
  .getSourceFiles("src/routes/**/*.tsx")
  .concat(project.getSourceFiles("src/routes/**/*.ts"));

routeFiles.forEach((file) => {
  let changed = false;

  // Track imports we need to add: module path -> Set of names
  const newImports = new Map();

  const addImport = (modulePath, name) => {
    if (!newImports.has(modulePath)) newImports.set(modulePath, new Set());
    newImports.get(modulePath).add(name);
  };

  file.getImportDeclarations().forEach((impDecl) => {
    const moduleSpecifier = impDecl.getModuleSpecifierValue();

    // Process functions
    if (
      moduleSpecifier === "@/lib/pos.functions" ||
      moduleSpecifier === "@/lib/inventory.functions" ||
      moduleSpecifier === "@/lib/settings.functions"
    ) {
      if (moduleSpecifier === "@/lib/settings.functions") {
        impDecl.setModuleSpecifier("@/features/settings/services/settings.functions");
        changed = true;
      } else {
        const namedImports = impDecl.getNamedImports();
        namedImports.forEach((ni) => {
          const name = ni.getName();
          if (mappings[name]) {
            // @/features/... instead of src/features/...
            const newPath = "@/" + mappings[name].replace("src/", "").replace(".ts", "");
            addImport(newPath, name);
          }
        });
        impDecl.remove();
        changed = true;
      }
    }

    // Process queries
    if (moduleSpecifier === "@/lib/queries" || moduleSpecifier === "@/lib/inventory.queries") {
      const namedImports = impDecl.getNamedImports();
      namedImports.forEach((ni) => {
        const name = ni.getName();
        if (queryMappings[name]) {
          const newPath = "@/" + queryMappings[name].replace("src/", "").replace(".ts", "");
          addImport(newPath, name);
        }
      });
      impDecl.remove();
      changed = true;
    }
  });

  if (changed && newImports.size > 0) {
    newImports.forEach((names, modulePath) => {
      file.addImportDeclaration({
        namedImports: Array.from(names),
        moduleSpecifier: modulePath,
      });
    });
  }

  if (changed) {
    file.saveSync();
    console.log("Updated imports in", file.getFilePath());
  }
});
