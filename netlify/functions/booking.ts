import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { bookings } from "../../db/schema.js";

// Receives bookings from the website, stores every booking in the database and
// notifies Läikelabor directly by e-mail (Resend) to the Gmail inbox.
// This does not depend on Netlify Forms spam filtering, so bookings are never silently lost.
//
// E-mail: RESEND_API_KEY (optional: BOOKING_EMAIL_TO, BOOKING_EMAIL_FROM)

const DEFAULT_EMAIL_TO = "laikelabor.of@gmail.com";
const DEFAULT_EMAIL_FROM = "Läikelabor <onboarding@resend.dev>";

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

type Booking = typeof bookings.$inferSelect;

async function sendEmail(b: Booking, lines: string[]): Promise<boolean> {
  const key = Netlify.env.get("RESEND_API_KEY");
  if (!key) {
    console.warn("Booking e-mail skipped: RESEND_API_KEY is not set.");
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Netlify.env.get("BOOKING_EMAIL_FROM") || DEFAULT_EMAIL_FROM,
      to: [Netlify.env.get("BOOKING_EMAIL_TO") || DEFAULT_EMAIL_TO],
      subject: `Uus broneering · ${b.name} · ${b.preferredTime}`,
      text: lines.join("\n"),
      html: `<h2>Uus broneering</h2><p>${lines.slice(1).map(escapeHtml).join("<br>")}</p>`,
    }),
  });
  if (!res.ok) console.error("Booking e-mail failed", res.status, await res.text());
  return res.ok;
}

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Vigane päring." }, { status: 400 });
  }
  // Honeypot: bots fill hidden fields
  if (body["bot-field"]) return Response.json({ ok: true }, { status: 201 });

  const values = {
    name: clean(body.nimi, 100),
    phone: clean(body.telefon, 40),
    carModel: clean(body.automudel, 100),
    preferredTime: clean(body["soovitud-aeg"], 40).replace("T", " "),
    services: clean(body.valik, 1000),
    location: clean(body.asukoht, 200),
    total: clean(body.summa, 40),
    notes: clean(body.lisainfo, 1000),
  };
  if (!values.name || !values.phone || !values.carModel || !values.preferredTime || !values.services) {
    return Response.json({ error: "Palun täida nimi, telefon, automudel ja soovitud aeg." }, { status: 400 });
  }

  const [row] = await db.insert(bookings).values(values).returning();

  const lines = [
    "Uus broneering!",
    `Nimi: ${row.name}`,
    `Tel: ${row.phone}`,
    `Auto: ${row.carModel}`,
    `Aeg: ${row.preferredTime}`,
    `Teenused: ${row.services.replace(/\n/g, "; ")}`,
    `Asukoht: ${row.location || "-"}`,
    `Summa: ${row.total || "-"}`,
    row.notes ? `Info: ${row.notes}` : "",
  ].filter(Boolean);

  let emailSent = false;
  try {
    emailSent = await sendEmail(row, lines);
  } catch (error) {
    console.error("Booking e-mail error", error);
  }
  if (emailSent) await db.update(bookings).set({ emailSent }).where(eq(bookings.id, row.id));

  return Response.json({ ok: true, id: row.id, emailSent }, { status: 201 });
};

export const config: Config = {
  path: "/api/booking",
};
