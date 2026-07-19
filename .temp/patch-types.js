const fs = require("fs");
const path =
  "d:/BITB03/PROJECT MAS HEN/POS-SOTO/culinary-pos-system/src/integrations/supabase/types.ts";
let content = fs.readFileSync(path, "utf8");

const newTables = `
      units: {
        Row: {
          id: string
          name: string
          symbol: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          symbol: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          symbol?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ingredient_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          id: string
          category_id: string
          unit_id: string
          name: string
          sku: string | null
          current_stock: number
          minimum_stock: number
          average_cost: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          unit_id: string
          name: string
          sku?: string | null
          current_stock?: number
          minimum_stock?: number
          average_cost?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          unit_id?: string
          name?: string
          sku?: string | null
          current_stock?: number
          minimum_stock?: number
          average_cost?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ingredient_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          }
        ]
      }
      suppliers: {
        Row: {
          id: string
          name: string
          phone: string | null
          email: string | null
          address: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          email?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          email?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          id: string
          supplier_id: string
          invoice_number: string
          purchase_date: string
          total_amount: number
          status: Database["public"]["Enums"]["purchase_status"]
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supplier_id: string
          invoice_number: string
          purchase_date?: string
          total_amount?: number
          status?: Database["public"]["Enums"]["purchase_status"]
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string
          invoice_number?: string
          purchase_date?: string
          total_amount?: number
          status?: Database["public"]["Enums"]["purchase_status"]
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          }
        ]
      }
      purchase_order_items: {
        Row: {
          id: string
          purchase_order_id: string
          ingredient_id: string
          quantity: number
          unit_cost: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          purchase_order_id: string
          ingredient_id: string
          quantity: number
          unit_cost: number
          subtotal: number
          created_at?: string
        }
        Update: {
          id?: string
          purchase_order_id?: string
          ingredient_id?: string
          quantity?: number
          unit_cost?: number
          subtotal?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          }
        ]
      }
      product_recipes: {
        Row: {
          id: string
          product_id: string
          ingredient_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          ingredient_id: string
          quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          ingredient_id?: string
          quantity?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          }
        ]
      }
      stock_movements: {
        Row: {
          id: string
          ingredient_id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          quantity: number
          stock_before: number
          stock_after: number
          reference_type: string | null
          reference_id: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          quantity: number
          stock_before: number
          stock_after: number
          reference_type?: string | null
          reference_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          quantity?: number
          stock_before?: number
          stock_after?: number
          reference_type?: string | null
          reference_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          }
        ]
      }
      ingredient_batches: {
        Row: {
          id: string
          ingredient_id: string
          purchase_order_item_id: string
          quantity_received: number
          quantity_remaining: number
          cost_per_unit: number
          expired_at: string | null
          manufactured_at: string | null
          batch_number: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          purchase_order_item_id: string
          quantity_received: number
          quantity_remaining: number
          cost_per_unit: number
          expired_at?: string | null
          manufactured_at?: string | null
          batch_number?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          purchase_order_item_id?: string
          quantity_received?: number
          quantity_remaining?: number
          cost_per_unit?: number
          expired_at?: string | null
          manufactured_at?: string | null
          batch_number?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_batches_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_batches_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          }
        ]
      }\n`;

content = content.replace("      user_roles: {", newTables + "      user_roles: {");

const newEnums = `
      purchase_status: "draft" | "completed" | "cancelled"
      stock_movement_type: "purchase" | "sale" | "adjustment" | "waste" | "return"\n`;

content = content.replace("    Enums: {", "    Enums: {" + newEnums);

const newFunctions = `
      complete_purchase_order: {
        Args: { p_purchase_order_id: string; p_user_id: string }
        Returns: undefined
      }
      cancel_purchase_order: {
        Args: { p_purchase_order_id: string }
        Returns: undefined
      }\n`;

content = content.replace("    Functions: {", "    Functions: {" + newFunctions);

const newConstantsEnums = `
      purchase_status: ["draft", "completed", "cancelled"],
      stock_movement_type: ["purchase", "sale", "adjustment", "waste", "return"],\n`;

content = content.replace("    Enums: {", "    Enums: {" + newConstantsEnums);

fs.writeFileSync(path, content, "utf8");
console.log("types.ts updated");
