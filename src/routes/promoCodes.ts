import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";

const promoCodeBodySchema = z.object({
  code: z.string().trim().min(1),
  discountPercent: z.number().int().min(1).max(100),
  activationLimit: z.number().int().positive(),
  expiresAt: z.string().datetime(),
});

const promoCodeUpdateSchema = promoCodeBodySchema.partial();

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const promoCodesRouter = Router();

promoCodesRouter.post("/", async (req, res) => {
  const parsed = promoCodeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { code, discountPercent, activationLimit, expiresAt } = parsed.data;
  try {
    const result = await pool.query(
      `INSERT INTO promo_codes(code, discount_percent, activation_limit, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, code, discount_percent AS "discountPercent", activation_limit AS "activationLimit",
                 activation_count AS "activationCount", expires_at AS "expiresAt", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [code, discountPercent, activationLimit, expiresAt]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return res.status(409).json({ error: "Promo code already exists" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

promoCodesRouter.get("/", async (_req, res) => {
  const result = await pool.query(
    `SELECT id, code, discount_percent AS "discountPercent", activation_limit AS "activationLimit",
            activation_count AS "activationCount", expires_at AS "expiresAt", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM promo_codes
     ORDER BY created_at DESC`
  );
  return res.json(result.rows);
});

promoCodesRouter.get("/:id", async (req, res) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { id } = parsed.data;

  const result = await pool.query(
    `SELECT id, code, discount_percent AS "discountPercent", activation_limit AS "activationLimit",
            activation_count AS "activationCount", expires_at AS "expiresAt", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM promo_codes WHERE id = $1`,
    [id]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Promo code not found" });
  }
  return res.json(result.rows[0]);
});

promoCodesRouter.put("/:id", async (req, res) => {
  const idParsed = idParamSchema.safeParse(req.params);
  if (!idParsed.success) {
    return res.status(400).json({ error: idParsed.error.flatten() });
  }

  const bodyParsed = promoCodeUpdateSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({ error: bodyParsed.error.flatten() });
  }
  if (Object.keys(bodyParsed.data).length === 0) {
    return res.status(400).json({ error: "Provide at least one field for update" });
  }

  const { id } = idParsed.data;
  const { code, discountPercent, activationLimit, expiresAt } = bodyParsed.data;

  try {
    const result = await pool.query(
      `UPDATE promo_codes
       SET code = COALESCE($2, code),
           discount_percent = COALESCE($3, discount_percent),
           activation_limit = COALESCE($4, activation_limit),
           expires_at = COALESCE($5, expires_at),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, code, discount_percent AS "discountPercent", activation_limit AS "activationLimit",
                 activation_count AS "activationCount", expires_at AS "expiresAt", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, code, discountPercent, activationLimit, expiresAt]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Promo code not found" });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return res.status(409).json({ error: "Promo code already exists" });
    }
    if ((error as { code?: string }).code === "23514") {
      return res.status(400).json({ error: "Invalid promo code constraints" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

promoCodesRouter.delete("/:id", async (req, res) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { id } = parsed.data;

  const result = await pool.query(`DELETE FROM promo_codes WHERE id = $1`, [id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Promo code not found" });
  }
  return res.status(204).send();
});
