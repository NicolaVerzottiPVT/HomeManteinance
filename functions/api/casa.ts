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

function isRealDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "0001-01-01") return false;
  const date = new Date(value + "T12:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
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

    const updateTables: Record<string, string> = {
      update_asset: "assets", update_room: "rooms", update_asset_type: "asset_types",
      update_template: "maintenance_templates", update_task: "maintenance_tasks", update_log: "maintenance_logs",
    };
    if (Object.hasOwn(updateTables, action)) {
      const id = positiveInteger(body.id);
      if (!id) return errorResponse("Identificativo non valido.");
      const exists = await db.prepare("SELECT id FROM " + updateTables[action] + " WHERE id = ?").bind(id).first();
      if (!exists) return errorResponse("Elemento non trovato.", 404);
      if (action !== "update_log" && !textValue(body.name)) return errorResponse("Inserisci un nome.");
      if (action === "update_task" || action === "update_template") {
        const interval = positiveInteger(body.interval_days);
        if (!interval || interval > 36500 || body.warning_days === "" || !Number.isSafeInteger(Number(body.warning_days)) || Number(body.warning_days) < 0)
          return errorResponse("Frequenza e preavviso non validi.");
      }
      if (action === "update_task" && !isRealDate(body.next_due_at)) return errorResponse("Scadenza non valida.");
      if (action === "update_log" && !isRealDate(body.completed_at)) return errorResponse("Data intervento non valida.");
      if (action === "update_asset" && body.installed_at && !isRealDate(body.installed_at)) return errorResponse("Data installazione non valida.");
      if (action === "update_room" && (!/^#[0-9a-f]{6}$/i.test(String(body.color)) || body.sort_order === "" || !Number.isSafeInteger(Number(body.sort_order)) || Number(body.sort_order) < 0))
        return errorResponse("Colore o ordine non valido.");
      const references = action === "update_asset" ? [["room_id", "rooms"], ["asset_type_id", "asset_types"]] : action === "update_template" ? [["asset_type_id", "asset_types"]] : [];
      for (const [field, table] of references) {
        if (action === "update_asset" && (body[field] === "" || body[field] == null)) continue;
        const ref = positiveInteger(body[field]);
        if (!ref || !await db.prepare("SELECT id FROM " + table + " WHERE id = ?").bind(ref).first())
          return errorResponse("La stanza o il tipo selezionato non è più disponibile.");
      }
    }

    if (action === "update_room") {
      await db.prepare("UPDATE rooms SET name = ?, color = ?, sort_order = ? WHERE id = ?")
        .bind(textValue(body.name, 80), body.color, Number(body.sort_order), Number(body.id)).run();
    } else if (action === "update_asset_type") {
      await db.prepare("UPDATE asset_types SET name = ?, category = ?, icon = ? WHERE id = ?")
        .bind(textValue(body.name, 100), optionalText(body.category, 80), textValue(body.icon, 40) || "wrench", Number(body.id)).run();
    } else if (action === "update_template") {
      await db.prepare("UPDATE maintenance_templates SET asset_type_id = ?, name = ?, interval_days = ?, warning_days = ?, notes = ? WHERE id = ?")
        .bind(Number(body.asset_type_id), textValue(body.name, 120), Number(body.interval_days), Number(body.warning_days), optionalText(body.notes), Number(body.id)).run();
    } else if (action === "update_log") {
      const logId = Number(body.id);
      // Calculate the effective newest date from the entire history, not the 80 displayed rows.
      // Both statements run in one D1 transaction. Notes-only edits preserve manual due dates.
      await db.batch([
        db.prepare(`UPDATE maintenance_tasks SET
          next_due_at = CASE WHEN
            (SELECT MAX(completed_at) FROM maintenance_logs WHERE task_id = maintenance_tasks.id)
            IS NOT
            (SELECT MAX(CASE WHEN id = ? THEN ? ELSE completed_at END) FROM maintenance_logs WHERE task_id = maintenance_tasks.id)
          THEN date((SELECT MAX(CASE WHEN id = ? THEN ? ELSE completed_at END) FROM maintenance_logs WHERE task_id = maintenance_tasks.id), '+' || interval_days || ' days')
          ELSE next_due_at END,
          last_completed_at = (SELECT MAX(CASE WHEN id = ? THEN ? ELSE completed_at END) FROM maintenance_logs WHERE task_id = maintenance_tasks.id)
          WHERE id = (SELECT task_id FROM maintenance_logs WHERE id = ?)`)
          .bind(logId, body.completed_at, logId, body.completed_at, logId, body.completed_at, logId),
        db.prepare("UPDATE maintenance_logs SET completed_at = ?, notes = ? WHERE id = ?")
          .bind(body.completed_at, optionalText(body.notes), logId),
      ]);
    } else if (["delete_room", "delete_asset_type", "delete_template", "delete_log"].includes(action)) {
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
    return errorResponse(message, error instanceof Error && error.message.includes("UNIQUE") ? 409 : 500);
  }
}
