import { withSupabase } from "npm:@supabase/server";

type AdminRole = "owner" | "admin" | "reviewer";
const allowedStatuses = ["new", "reviewing", "verified", "unverified", "duplicate", "archived"];
const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const maxPhotoBytes = 20 * 1024 * 1024;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const clean = (value: unknown) => String(value ?? "").trim();
const nullableText = (value: unknown, limit = 5000) => clean(value).slice(0, limit) || null;
const json = (body: object, status = 200) =>
  Response.json(body, { status, headers: { ...corsHeaders, "Cache-Control": "no-store" } });

function validDate(value: unknown) {
  const date = clean(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(date + "T00:00:00Z");
  if (Number.isNaN(+parsed) || parsed.toISOString().slice(0, 10) !== date) return null;
  return date;
}

function validTime(value: unknown) {
  const time = clean(value);
  if (!time) return null;
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return time;
  if (/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time)) return time.slice(0, 5);
  return undefined;
}

function numeric(value: unknown) {
  if (value === null || value === undefined || clean(value) === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extension(type: string) {
  return type === "image/jpeg" ? "jpg" :
    type === "image/png" ? "png" :
    type === "image/webp" ? "webp" :
    type === "image/heic" ? "heic" : "heif";
}

function signatureMatches(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/png") return bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
  const header = new TextDecoder().decode(bytes);
  if (type === "image/webp") return header.slice(0, 4) === "RIFF" && header.slice(8, 12) === "WEBP";
  if (type === "image/heic" || type === "image/heif") return header.slice(4, 12).includes("ftyp");
  return false;
}

async function adminIdentity(ctx: any) {
  const email = clean(ctx.userClaims?.email).toLowerCase();
  if (!email) return null;
  const { data, error } = await ctx.supabaseAdmin
    .from("admin_allowlist")
    .select("email,role,active")
    .eq("email", email)
    .eq("active", true)
    .maybeSingle();
  if (error || !data) return null;
  return { email: data.email, role: data.role as AdminRole };
}

async function audit(ctx: any, email: string, action: string, entityId: string, details: object) {
  await ctx.supabaseAdmin.from("admin_audit_log").insert({
    admin_email: email,
    action,
    entity_type: "sighting",
    entity_id: entityId,
    details,
  });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

    const admin = await adminIdentity(ctx);
    if (!admin) return json({ error: "Not authorized." }, 403);

    try {
      const isMultipart = (req.headers.get("content-type") || "").includes("multipart/form-data");
      const body: any = isMultipart ? await req.formData() : await req.json();
      const value = (key: string) => isMultipart ? body.get(key) : body[key];
      const action = clean(value("action"));
      const id = clean(value("id"));
      if (!id) return json({ error: "Missing sighting id." }, 400);

      if (action === "updateStatus") {
        const status = clean(value("status"));
        if (!allowedStatuses.includes(status)) return json({ error: "Choose a valid status." }, 400);

        const { data, error } = await ctx.supabaseAdmin
          .from("sightings")
          .update({ status })
          .eq("id", id)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data) return json({ error: "Sighting not found." }, 404);
        await audit(ctx, admin.email, "update_sighting_status", id, {
          fields: ["status"],
          status,
        });
        return json({ ok: true, status });
      }

      if (action === "updateSighting") {
        const internal_notes = nullableText(value("internal_notes"), 10000);
        const update: Record<string, unknown> = { internal_notes };
        if (admin.role !== "reviewer") {
          const sighting_date = validDate(value("sighting_date"));
          const sighting_time = validTime(value("sighting_time"));
          const location_description = clean(value("location_description")).slice(0, 500);
          const flamingo_count = numeric(value("flamingo_count"));
          const latitude = numeric(value("latitude"));
          const longitude = numeric(value("longitude"));

          if (!sighting_date) return json({ error: "Enter a valid sighting date." }, 400);
          if (sighting_time === undefined) return json({ error: "Enter a valid local time." }, 400);
          if (!location_description) return json({ error: "Enter the sighting location." }, 400);
          if (!Number.isInteger(flamingo_count) || Number(flamingo_count) < 1 || Number(flamingo_count) > 10000) {
            return json({ error: "Flamingo count must be a whole number from 1 to 10,000." }, 400);
          }
          if ((latitude === null) !== (longitude === null)) {
            return json({ error: "Enter both latitude and longitude, or leave both blank." }, 400);
          }
          if (latitude === undefined || longitude === undefined ||
              (latitude !== null && (latitude < -90 || latitude > 90)) ||
              (longitude !== null && (longitude < -180 || longitude > 180))) {
            return json({ error: "Enter valid coordinates." }, 400);
          }

          Object.assign(update, {
            sighting_date,
            sighting_time,
            location_description,
            latitude,
            longitude,
            flamingo_count,
            bands_or_tags: nullableText(value("bands_or_tags")),
            behavior: nullableText(value("behavior")),
            notes: nullableText(value("notes")),
          });
        }

        const { data, error } = await ctx.supabaseAdmin
          .from("sightings")
          .update(update)
          .eq("id", id)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data) return json({ error: "Sighting not found." }, 404);
        await audit(ctx, admin.email, "update_sighting", id, {
          fields: Object.keys(update),
        });
        return json({ ok: true });
      }

      if (action === "addPhotos") {
        if (admin.role === "reviewer") return json({ error: "Photo changes require an admin role." }, 403);
        if (!isMultipart) return json({ error: "Photo upload data is missing." }, 400);
        const files = body.getAll("photos").filter((entry: unknown) => entry instanceof File && entry.size > 0) as File[];
        const { data: sighting, error: sightingError } = await ctx.supabaseAdmin
          .from("sightings").select("id").eq("id", id).maybeSingle();
        if (sightingError) throw sightingError;
        if (!sighting) return json({ error: "Sighting not found." }, 404);
        const { count, error: countError } = await ctx.supabaseAdmin
          .from("sighting_photos").select("id", { count: "exact", head: true }).eq("sighting_id", id);
        if (countError) throw countError;
        const remaining = 3 - (count || 0);
        if (!files.length || files.length > remaining) return json({ error: `This sighting can accept ${Math.max(0, remaining)} more photo(s).` }, 400);
        if (files.some(file => file.size > maxPhotoBytes || !allowedTypes.includes(file.type))) {
          return json({ error: "Use JPG, PNG, WebP, HEIC, or HEIF photos up to 20 MB each." }, 400);
        }
        for (const file of files) {
          const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
          if (!signatureMatches(bytes, file.type)) return json({ error: "One file is not a supported image." }, 400);
        }

        const uploaded: string[] = [];
        try {
          for (const file of files) {
            const path = `${id}/${crypto.randomUUID()}.${extension(file.type)}`;
            const { error: uploadError } = await ctx.supabaseAdmin.storage
              .from("sighting-photos")
              .upload(path, file, { contentType: file.type, upsert: false });
            if (uploadError) throw uploadError;
            uploaded.push(path);
            const { error: rowError } = await ctx.supabaseAdmin.from("sighting_photos").insert({
              sighting_id: id,
              storage_path: path,
              original_filename: clean(file.name).slice(0, 500) || "photo." + extension(file.type),
              mime_type: file.type,
              size_bytes: file.size,
            });
            if (rowError) throw rowError;
          }
        } catch (error) {
          if (uploaded.length) await ctx.supabaseAdmin.storage.from("sighting-photos").remove(uploaded);
          throw error;
        }
        await audit(ctx, admin.email, "add_sighting_photos", id, { photo_count: uploaded.length });
        return json({ ok: true, added: uploaded.length });
      }

      if (action === "deletePhoto") {
        if (admin.role === "reviewer") return json({ error: "Photo changes require an admin role." }, 403);
        const photoId = clean(value("photo_id"));
        if (!photoId) return json({ error: "Missing photo id." }, 400);
        const { data: photo, error: lookupError } = await ctx.supabaseAdmin
          .from("sighting_photos")
          .select("id,storage_path,original_filename")
          .eq("id", photoId)
          .eq("sighting_id", id)
          .maybeSingle();
        if (lookupError) throw lookupError;
        if (!photo) return json({ error: "Photo not found." }, 404);
        const { error: storageError } = await ctx.supabaseAdmin.storage.from("sighting-photos").remove([photo.storage_path]);
        if (storageError) throw storageError;
        const { error: deleteError } = await ctx.supabaseAdmin.from("sighting_photos").delete().eq("id", photoId);
        if (deleteError) throw deleteError;
        await audit(ctx, admin.email, "delete_sighting_photo", id, {
          photo_id: photoId,
          original_filename: photo.original_filename,
        });
        return json({ ok: true });
      }

      return json({ error: "Unknown action." }, 400);
    } catch (error) {
      console.error("admin sighting editor error", error);
      return json({ error: "Sighting update failed." }, 500);
    }
  }),
};
