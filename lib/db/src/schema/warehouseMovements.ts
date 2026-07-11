import { mongoose } from "../index";
import { z } from "zod";

const warehouseMovementSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "warehouse_items", required: true },
    type: { type: String, required: true }, // in | out | adjustment
    quantity: { type: Number, required: true },
    quantityBefore: { type: Number, required: true },
    quantityAfter: { type: Number, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
    reason: { type: String, default: null },
    notes: { type: String, default: null },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
);

export const WarehouseMovementModel =
  mongoose.models["warehouse_movements"] ??
  mongoose.model("warehouse_movements", warehouseMovementSchema);

export const insertWarehouseMovementSchema = z.object({
  itemId: z.string(),
  type: z.string(),
  quantity: z.number(),
  quantityBefore: z.number(),
  quantityAfter: z.number(),
  userId: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type InsertWarehouseMovement = z.infer<typeof insertWarehouseMovementSchema>;

export interface WarehouseMovement {
  id: string;
  itemId: string;
  type: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  userId: string | null;
  reason: string | null;
  notes: string | null;
  date: Date;
}
