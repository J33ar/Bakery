import { Router, type IRouter } from "express";
import { WarehouseItemModel, WarehouseMovementModel, BranchModel, UserModel } from "@workspace/db";
import {
  ListWarehouseItemsQueryParams,
  CreateWarehouseItemBody,
  UpdateWarehouseItemParams,
  UpdateWarehouseItemBody,
  DeleteWarehouseItemParams,
  ListWarehouseMovementsQueryParams,
  CreateWarehouseMovementBody,
} from "@workspace/api-zod";
import { effectiveBranchId, requireAuth } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { formatZodError } from "../lib/zodError";

const router: IRouter = Router();

async function serializeItem(i: any) {
  const branch = await BranchModel.findById(i.branchId);
  return {
    id: i._id.toString(),
    name: i.name,
    code: i.code,
    category: i.category,
    unit: i.unit,
    quantity: Number(i.quantity),
    minQuantity: Number(i.minQuantity),
    supplier: i.supplier ?? null,
    purchasePrice: i.purchasePrice != null ? Number(i.purchasePrice) : null,
    notes: i.notes ?? null,
    branchId: i.branchId.toString(),
    branchName: branch?.name ?? null,
    archived: i.archived,
    lowStock: Number(i.quantity) <= Number(i.minQuantity),
  };
}

router.get("/warehouse-items", requireAuth, async (req, res): Promise<void> => {
  const query = ListWarehouseItemsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: formatZodError(query.error) });
    return;
  }
  const branchId = effectiveBranchId(req.session.user!, query.data.branchId as any);

  const filter: any = {};
  if (branchId) filter.branchId = String(branchId);
  if (query.data.search) {
    filter.$or = [
      { name: { $regex: query.data.search, $options: "i" } },
      { code: { $regex: query.data.search, $options: "i" } },
    ];
  }

  let rows = await WarehouseItemModel.find(filter);
  if (query.data.lowStock) {
    rows = rows.filter((r: any) => Number(r.quantity) <= Number(r.minQuantity));
  }
  res.json(await Promise.all(rows.map(serializeItem)));
});

router.post("/warehouse-items", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateWarehouseItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const item = await WarehouseItemModel.create({
    ...parsed.data,
    quantity: Number(parsed.data.quantity ?? 0),
    minQuantity: Number(parsed.data.minQuantity),
    purchasePrice: parsed.data.purchasePrice != null ? Number(parsed.data.purchasePrice) : null,
  });
  await logAudit(req.session.user, item.branchId.toString(), "إضافة صنف مخزون", `تمت إضافة الصنف ${item.name}`);
  res.status(201).json(await serializeItem(item));
});

router.patch("/warehouse-items/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateWarehouseItemParams.safeParse(req.params);
  const body = UpdateWarehouseItemBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: formatZodError((params.error ?? body.error)!) });
    return;
  }
  const updates: any = { ...body.data };
  if (updates.minQuantity !== undefined) updates.minQuantity = Number(updates.minQuantity);
  if (updates.purchasePrice !== undefined) updates.purchasePrice = Number(updates.purchasePrice);

  const item = await WarehouseItemModel.findByIdAndUpdate(params.data.id, updates, { new: true });
  if (!item) {
    res.status(404).json({ error: "الصنف غير موجود" });
    return;
  }
  await logAudit(req.session.user, item.branchId.toString(), "تعديل صنف مخزون", `تعديل الصنف ${item.name}`);
  res.json(await serializeItem(item));
});

router.delete("/warehouse-items/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteWarehouseItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: formatZodError(params.error) });
    return;
  }
  const item = await WarehouseItemModel.findByIdAndDelete(params.data.id);
  if (!item) {
    res.status(404).json({ error: "الصنف غير موجود" });
    return;
  }
  await logAudit(req.session.user, item.branchId.toString(), "حذف صنف مخزون", `حذف الصنف ${item.name}`);
  res.status(204).send();
});

router.get("/warehouse-movements", requireAuth, async (req, res): Promise<void> => {
  const query = ListWarehouseMovementsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: formatZodError(query.error) });
    return;
  }
  const branchId = effectiveBranchId(req.session.user!, query.data.branchId as any);

  let itemIds: string[] | undefined;
  if (branchId) {
    const items = await WarehouseItemModel.find({ branchId: String(branchId) });
    itemIds = items.map((i: any) => i._id.toString());
  }

  const filter: any = {};
  if (query.data.itemId) filter.itemId = String(query.data.itemId);

  let rows = await WarehouseMovementModel.find(filter);
  if (itemIds) {
    rows = rows.filter((r: any) => itemIds!.includes(r.itemId.toString()));
  }

  const results = [];
  for (const r of rows) {
    const item = await WarehouseItemModel.findById(r.itemId);
    let userName: string | null = null;
    if (r.userId) {
      const u = await UserModel.findById(r.userId);
      userName = u?.fullName ?? null;
    }
    results.push({
      id: r._id.toString(),
      itemId: r.itemId.toString(),
      itemName: item?.name ?? "",
      branchId: item?.branchId?.toString() ?? "",
      type: r.type,
      quantity: Number(r.quantity),
      quantityBefore: Number(r.quantityBefore),
      quantityAfter: Number(r.quantityAfter),
      userId: r.userId?.toString() ?? null,
      userName,
      reason: r.reason ?? null,
      notes: r.notes ?? null,
      date: r.date instanceof Date ? r.date.toISOString() : new Date().toISOString(),
    });
  }
  res.json(results);
});

router.post("/warehouse-movements", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateWarehouseMovementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  const item = await WarehouseItemModel.findById(String(parsed.data.itemId));
  if (!item) {
    res.status(404).json({ error: "الصنف غير موجود" });
    return;
  }

  const before = Number(item.quantity);
  let after = before;
  if (parsed.data.type === "in") after = before + parsed.data.quantity;
  else if (parsed.data.type === "out") after = before - parsed.data.quantity;
  else after = parsed.data.quantity;

  if (after < 0) {
    res.status(400).json({ error: "الكمية المتوفرة غير كافية" });
    return;
  }

  await WarehouseItemModel.findByIdAndUpdate(item._id, { quantity: after });

  const movement = await WarehouseMovementModel.create({
    itemId: item._id.toString(),
    type: parsed.data.type,
    quantity: parsed.data.quantity,
    quantityBefore: before,
    quantityAfter: after,
    userId: req.session.user!.id,
    reason: parsed.data.reason ?? null,
    notes: parsed.data.notes ?? null,
    date: new Date(),
  });

  await logAudit(
    req.session.user,
    item.branchId.toString(),
    "حركة مخزون",
    `${parsed.data.type} بكمية ${parsed.data.quantity} للصنف ${item.name}`,
  );

  res.status(201).json({
    id: movement._id.toString(),
    itemId: movement.itemId.toString(),
    itemName: item.name,
    branchId: item.branchId.toString(),
    type: movement.type,
    quantity: Number(movement.quantity),
    quantityBefore: Number(movement.quantityBefore),
    quantityAfter: Number(movement.quantityAfter),
    userId: movement.userId?.toString() ?? null,
    userName: req.session.user?.fullName ?? null,
    reason: movement.reason ?? null,
    notes: movement.notes ?? null,
    date: movement.date instanceof Date ? movement.date.toISOString() : new Date().toISOString(),
  });
});

export default router;
