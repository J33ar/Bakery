import { mongoose } from "../index";
import { z } from "zod";

const warehouseItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    category: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    minQuantity: { type: Number, required: true },
    supplier: { type: String, default: null },
    purchasePrice: { type: Number, default: null },
    notes: { type: String, default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "branches", required: true },
    archived: { type: Boolean, required: true, default: false },
  },
  { timestamps: false }
);

export const WarehouseItemModel =
  mongoose.models["warehouse_items"] ?? mongoose.model("warehouse_items", warehouseItemSchema);

export const insertWarehouseItemSchema = z.object({
  name: z.string(),
  code: z.string(),
  category: z.string(),
  unit: z.string(),
  quantity: z.number().optional(),
  minQuantity: z.number(),
  supplier: z.string().nullable().optional(),
  purchasePrice: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  branchId: z.string(),
  archived: z.boolean().optional(),
});
export type InsertWarehouseItem = z.infer<typeof insertWarehouseItemSchema>;

export interface WarehouseItem {
  id: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  supplier: string | null;
  purchasePrice: number | null;
  notes: string | null;
  branchId: string;
  archived: boolean;
}
