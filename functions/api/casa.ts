type Env = { DB: D1Database };

type Payload = Record<string, unknown>;

function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function textValue(value: unknown, maxLength = 240) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function optionalText(value: unknown, maxLength = 1000) {
  const valueText = textValue(value, maxLength);
  return valueText || null;
}

function positiveInteger(value: unknown, fallback?: number) {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) return parsed;
  return fallback ?? null;
}

function nonNegativeInteger(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function isoDate(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

function validDate(value: unknown, fallback = isoDate()) {
  const candidate = textValue(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : fallback;
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return isoDate(value);
}

async function readDashboard(db: D1Database) {
  const [rooms, types, templates, assets, tasks, logs] = await db.batch([
    db.prepare("SELECT * FROM rooms ORDER BY sort_order, name"),
    db.prepare(
      `SELECT at.*, COUNT(mt.id) AS template_count
       FROM asset_types at
       LEFT JOIN maintenance_templates mt ON mt.asset_type_id = at.id
       GROUP BY at.id
       ORDER BY at.category, at.name`,
    ),
    db.prepare(
      `SELECT mt.*, at.name AS asset_type_name
       FROM maintenance_templates mt
       JOIN asset_types at ON at.id = mt.asset_type_id
       ORDER BY at.name, mt.name`,
    ),
    db.prepare(
      `SELECT a.*, r.name AS room_name, r.color AS room_color,
              at.name AS asset_type_name, at.icon AS asset_type_icon,
              COUNT(t.id) AS maintenance_count
       FROM assets a
       LEFT JOIN rooms r ON r.id = a.room_id
       LEFT JOIN asset_types at ON at.id = a.asset_type_id
       LEFT JOIN maintenance_tasks t ON t.asset_id = a.id
       GROUP BY a.id
       ORDER BY COALESCE(r.sort_order, 999), a.name`,
    ),
    db.prepare(
      `SELECT t.*, a.name AS asset_name, a.asset_type_id,
              r.name AS room_name, at.icon AS asset_type_icon,
              CAST(julianday(date(t.next_due_at)) - julianday(date('now')) AS INTEGER)
                AS days_until_due
       FROM maintenance_tasks t
       JOIN assets a ON a.id = t.asset_id
       LEFT JOIN rooms r ON r.id = a.room_id
       LEFT JOIN asset_types at ON at.id = a.asset_type_id
       ORDER BY t.next_due_at, a.name, t.name`,
    ),
    db.prepare(
      `SELECT l.*, t.name AS task_name, a.name AS asset_name
       FROM maintenance_logs l
       JOIN maintenance_tasks t ON t.id = l.task_id
       JOIN assets a ON a.id = t.asset_id
       ORDER BY l.completed_at DESC, l.id DESC
       LIMIT 80`,
    ),
  ]);

  return {
    rooms: rooms.results ?? [],
    assetTypes: types.results ?? [],
    templates: templates.results ?? [],
    assets: assets.results ?? [],
    tasks: tasks.results ?? [],
    logs: logs.results ?? [],
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    return Response.json(await readDashboard(env.DB));
  } catch (error) {
    console.error("dashboard", error);
    return errorResponse("I dati di casa non sono disponibili in questo momento.", 500);
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: Payload;
  try {
    const input: unknown = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return errorResponse("Corpo JSON non valido.");
    }
    body = input as Payload;
  } catch {
    return errorResponse("Corpo JSON non valido.");
  }
  try {
    const action = textValue(body.action, 40);
    const db = env.DB;

    if (["delete_room", "delete_asset_type", "delete_template", "delete_log"].includes(action)) {
      const id = positiveInteger(body.id);
      if (!id) return errorResponse("Elemento non valido.");
      const statements: Record<string, string> = {
        delete_room: "DELETE FROM rooms WHERE id = ?",
        delete_asset_type: "DELETE FROM asset_types WHERE id = ?",
        delete_template: "DELETE FROM maintenance_templates WHERE id = ?",
        delete_log: "DELETE FROM maintenance_logs WHERE id = ?",
      };
      const result = await db.prepare(statements[action]).bind(id).run();
      if (!result.meta.changes) return errorResponse("Elemento non trovato.", 404);
    } else if (action === "create_room") {
      const name = textValue(body.name, 80);
      if (!name) return errorResponse("Inserisci il nome della stanza.");
      await db
        .prepare(
          "INSERT INTO rooms (name, color, sort_order) VALUES (?, ?, ?)",
        )
        .bind(
          name,
          textValue(body.color, 20) || "#147d72",
          nonNegativeInteger(body.sort_order, 100),
        )
        .run();
    } else if (action === "create_asset") {
      const name = textValue(body.name, 120);
      if (!name) return errorResponse("Inserisci il nome dell'elemento.");
      const roomId = positiveInteger(body.room_id);
      const assetTypeId = positiveInteger(body.asset_type_id);
      const result = await db
        .prepare(
          `INSERT INTO assets
             (room_id, asset_type_id, name, category, brand, model, installed_at, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          roomId,
          assetTypeId,
          name,
          optionalText(body.category, 80),
          optionalText(body.brand, 80),
          optionalText(body.model, 80),
          optionalText(body.installed_at, 10),
          optionalText(body.notes),
        )
        .run();

      const assetId = Number(result.meta.last_row_id);
      if (body.create_default_tasks && assetTypeId) {
        await db
          .prepare(
            `INSERT INTO maintenance_tasks
               (asset_id, name, interval_days, warning_days, next_due_at, notes)
             SELECT ?, name, interval_days, warning_days,
                    date('now', '+' || interval_days || ' day'), notes
             FROM maintenance_templates
             WHERE asset_type_id = ?`,
          )
          .bind(assetId, assetTypeId)
          .run();
      }
    } else if (action === "update_asset") {
      const id = positiveInteger(body.id);
      const name = textValue(body.name, 120);
      if (!id || !name) return errorResponse("Elemento non valido.");
      await db
        .prepare(
          `UPDATE assets SET room_id = ?, asset_type_id = ?, name = ?,
             category = ?, brand = ?, model = ?, installed_at = ?, notes = ?
           WHERE id = ?`,
        )
        .bind(
          positiveInteger(body.room_id),
          positiveInteger(body.asset_type_id),
          name,
          optionalText(body.category, 80),
          optionalText(body.brand, 80),
          optionalText(body.model, 80),
          optionalText(body.installed_at, 10),
          optionalText(body.notes),
          id,
        )
        .run();
    } else if (action === "delete_asset") {
      const id = positiveInteger(body.id);
      if (!id) return errorResponse("Elemento non valido.");
      await db.prepare("DELETE FROM assets WHERE id = ?").bind(id).run();
    } else if (action === "create_task") {
      const assetId = positiveInteger(body.asset_id);
      const name = textValue(body.name, 120);
      const intervalDays = positiveInteger(body.interval_days);
      if (!assetId || !name || !intervalDays) {
        return errorResponse("Elemento, attività e frequenza sono obbligatori.");
      }
      const dueDate = validDate(
        body.next_due_at,
        addDays(isoDate(), intervalDays),
      );
      await db
        .prepare(
          `INSERT INTO maintenance_tasks
             (asset_id, name, interval_days, warning_days, next_due_at, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          assetId,
          name,
          intervalDays,
          nonNegativeInteger(body.warning_days, 14),
          dueDate,
          optionalText(body.notes),
        )
        .run();
    } else if (action === "update_task") {
      const id = positiveInteger(body.id);
      const name = textValue(body.name, 120);
      const intervalDays = positiveInteger(body.interval_days);
      if (!id || !name || !intervalDays) {
        return errorResponse("Manutenzione non valida.");
      }
      await db
        .prepare(
          `UPDATE maintenance_tasks
           SET name = ?, interval_days = ?, warning_days = ?,
               next_due_at = ?, notes = ?
           WHERE id = ?`,
        )
        .bind(
          name,
          intervalDays,
          nonNegativeInteger(body.warning_days, 14),
          validDate(body.next_due_at),
          optionalText(body.notes),
          id,
        )
        .run();
    } else if (action === "delete_task") {
      const id = positiveInteger(body.id);
      if (!id) return errorResponse("Manutenzione non valida.");
      await db
        .prepare("DELETE FROM maintenance_tasks WHERE id = ?")
        .bind(id)
        .run();
    } else if (action === "complete_task") {
      const id = positiveInteger(body.id);
      if (!id) return errorResponse("Manutenzione non valida.");
      const task = await db
        .prepare("SELECT interval_days FROM maintenance_tasks WHERE id = ?")
        .bind(id)
        .first<{ interval_days: number }>();
      if (!task) return errorResponse("Manutenzione non trovata.", 404);
      const completedAt = validDate(body.completed_at);
      await db.batch([
        db
          .prepare(
            "INSERT INTO maintenance_logs (task_id, completed_at, notes) VALUES (?, ?, ?)",
          )
          .bind(id, completedAt, optionalText(body.notes)),
        db
          .prepare(
            "UPDATE maintenance_tasks SET last_completed_at = ?, next_due_at = ? WHERE id = ?",
          )
          .bind(completedAt, addDays(completedAt, task.interval_days), id),
      ]);
    } else if (action === "create_asset_type") {
      const name = textValue(body.name, 100);
      if (!name) return errorResponse("Inserisci il nome del tipo.");
      await db
        .prepare(
          "INSERT INTO asset_types (name, category, icon) VALUES (?, ?, ?)",
        )
        .bind(
          name,
          optionalText(body.category, 80),
          textValue(body.icon, 40) || "wrench",
        )
        .run();
    } else if (action === "create_template") {
      const assetTypeId = positiveInteger(body.asset_type_id);
      const name = textValue(body.name, 120);
      const intervalDays = positiveInteger(body.interval_days);
      if (!assetTypeId || !name || !intervalDays) {
        return errorResponse("Tipo, attività e frequenza sono obbligatori.");
      }
      await db
        .prepare(
          `INSERT INTO maintenance_templates
             (asset_type_id, name, interval_days, warning_days, notes)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(
          assetTypeId,
          name,
          intervalDays,
          nonNegativeInteger(body.warning_days, 14),
          optionalText(body.notes),
        )
        .run();
    } else {
      return errorResponse("Operazione non riconosciuta.");
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("mutation", error);
    const message =
      error instanceof Error && error.message.includes("UNIQUE")
        ? "Esiste già un elemento con questo nome."
        : "Non è stato possibile salvare la modifica.";
    return errorResponse(message, 500);
  }
}
