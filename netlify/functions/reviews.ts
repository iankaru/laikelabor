import type { Config } from "@netlify/functions";
import { desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { reviews } from "../../db/schema.js";

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

export default async (req: Request) => {
  if (req.method === "GET") {
    const rows = await db
      .select({ id: reviews.id, name: reviews.name, rating: reviews.rating, message: reviews.message, createdAt: reviews.createdAt })
      .from(reviews)
      .orderBy(desc(reviews.createdAt))
      .limit(100);
    return Response.json(rows);
  }

  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Vigane päring." }, { status: 400 });
    }
    // Honeypot: bots fill hidden fields
    if (body.website) return Response.json({ ok: true }, { status: 201 });

    const name = clean(body.name, 60);
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 1000) : "";
    const rating = Number(body.rating);
    if (!name || message.length < 3 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return Response.json({ error: "Palun täida nimi, hinnang ja tagasiside." }, { status: 400 });
    }
    const [row] = await db.insert(reviews).values({ name, rating, message }).returning();
    return Response.json(row, { status: 201 });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/reviews",
};
