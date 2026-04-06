import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";

const activationSchema = z.object({
  code: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
});

export const activationsRouter = Router();

activationsRouter.post("/", async (req, res) => {
  const parsed = activationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const promoResult = await client.query(
      `SELECT id, code, discount_percent, activation_limit, activation_count, expires_at
       FROM promo_codes
       WHERE code = $1
       FOR UPDATE`,
      [parsed.data.code]
    );

    if (promoResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Promo code not found" });
    }

    const promo = promoResult.rows[0] as {
      id: number;
      code: string;
      discount_percent: number;
      activation_limit: number;
      activation_count: number;
      expires_at: string;
    };

    if (new Date(promo.expires_at).getTime() <= Date.now()) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Promo code has expired" });
    }

    if (promo.activation_count >= promo.activation_limit) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Promo code activation limit reached" });
    }

    const activationInsert = await client.query(
      `INSERT INTO activations(promo_code_id, email)
       VALUES ($1, $2)
       ON CONFLICT (promo_code_id, email) DO NOTHING
       RETURNING id, activated_at`,
      [promo.id, parsed.data.email]
    );

    if (activationInsert.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "This email has already activated the promo code" });
    }

    const countUpdate = await client.query(
      `UPDATE promo_codes
       SET activation_count = activation_count + 1,
           updated_at = NOW()
       WHERE id = $1
         AND activation_count < activation_limit
       RETURNING activation_count`,
      [promo.id]
    );

    if (countUpdate.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Promo code activation limit reached" });
    }

    await client.query("COMMIT");
    return res.status(201).json({
      promoCode: promo.code,
      email: parsed.data.email,
      discountPercent: promo.discount_percent,
      activationCount: countUpdate.rows[0].activation_count,
      activatedAt: activationInsert.rows[0].activated_at,
    });
  } catch {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});
