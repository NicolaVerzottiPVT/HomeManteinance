interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

type Json = Record<string, unknown> | unknown[];

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

function json(data: Json, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

function badRequest(message: string) {
  return json({ error: message }, 400);
}

function isoDate(input = new Date()) {
  return input.toISOString().slice(0, 10);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers });

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/dashboard' && request.method === 'GET') {
        const result = await env.DB.prepare(`
          SELECT
            t.id,
            t.name,
            t.interval_days,
            t.warning_days,
            t.last_completed_at,
            a.id AS asset_id,
            a.name AS asset_name,
            a.category,
            r.name AS room_name,
            date(COALESCE(t.last_completed_at, t.created_at), '+' || t.interval_days || ' day') AS next_due,
            CAST(julianday(date(COALESCE(t.last_completed_at, t.created_at), '+' || t.interval_days || ' day')) - julianday(date('now')) AS INTEGER) AS days_until_due
          FROM maintenance_tasks t
          JOIN assets a ON a.id = t.asset_id
          LEFT JOIN rooms r ON r.id = a.room_id
          ORDER BY days_until_due ASC, a.name ASC
        `).all();
        return json(result.results ?? []);
      }


      if (path === '/api/asset-types' && request.method === 'GET') {
        const result = await env.DB.prepare(`
          SELECT at.*, COUNT(mt.id) AS maintenance_count
          FROM asset_types at
          LEFT JOIN maintenance_templates mt ON mt.asset_type_id = at.id
          GROUP BY at.id
          ORDER BY at.category, at.name
        `).all();
        return json(result.results ?? []);
      }

      if (path === '/api/asset-types' && request.method === 'POST') {
        const body = await request.json<Record<string, unknown>>();
        const name = String(body.name ?? '').trim();
        if (!name) return badRequest('Il nome è obbligatorio.');
        const result = await env.DB.prepare(`
          INSERT INTO asset_types (name, category, notes) VALUES (?, ?, ?)
        `).bind(name, body.category ? String(body.category) : null, body.notes ? String(body.notes) : null).run();
        return json({ id: result.meta.last_row_id }, 201);
      }

      if (path === '/api/maintenance-templates' && request.method === 'GET') {
        const result = await env.DB.prepare(`
          SELECT mt.*, at.name AS asset_type_name, at.category AS asset_type_category
          FROM maintenance_templates mt
          JOIN asset_types at ON at.id = mt.asset_type_id
          ORDER BY at.name, mt.name
        `).all();
        return json(result.results ?? []);
      }

      if (path === '/api/maintenance-templates' && request.method === 'POST') {
        const body = await request.json<Record<string, unknown>>();
        const assetTypeId = Number(body.asset_type_id);
        const name = String(body.name ?? '').trim();
        const intervalDays = Number(body.interval_days);
        const warningDays = Number(body.warning_days ?? 14);
        if (!assetTypeId || !name || !Number.isFinite(intervalDays) || intervalDays <= 0) {
          return badRequest('Tipo, nome e intervallo valido sono obbligatori.');
        }
        const result = await env.DB.prepare(`
          INSERT INTO maintenance_templates (asset_type_id, name, interval_days, warning_days, notes)
          VALUES (?, ?, ?, ?, ?)
        `).bind(assetTypeId, name, intervalDays, Math.max(0, warningDays), body.notes ? String(body.notes) : null).run();
        return json({ id: result.meta.last_row_id }, 201);
      }

      const typeTemplatesMatch = path.match(/^\/api\/asset-types\/(\d+)\/templates$/);
      if (typeTemplatesMatch && request.method === 'GET') {
        const result = await env.DB.prepare(`
          SELECT * FROM maintenance_templates WHERE asset_type_id = ? ORDER BY name
        `).bind(Number(typeTemplatesMatch[1])).all();
        return json(result.results ?? []);
      }

      if (path === '/api/assets' && request.method === 'GET') {
        const result = await env.DB.prepare(`
          SELECT a.*, r.name AS room_name,
                 COUNT(t.id) AS maintenance_count
          FROM assets a
          LEFT JOIN rooms r ON r.id = a.room_id
          LEFT JOIN maintenance_tasks t ON t.asset_id = a.id
          GROUP BY a.id
          ORDER BY COALESCE(r.sort_order, 999), a.name
        `).all();
        return json(result.results ?? []);
      }

      if (path === '/api/rooms' && request.method === 'GET') {
        const result = await env.DB.prepare('SELECT * FROM rooms ORDER BY sort_order, name').all();
        return json(result.results ?? []);
      }

      if (path === '/api/assets' && request.method === 'POST') {
        const body = await request.json<Record<string, unknown>>();
        const name = String(body.name ?? '').trim();
        if (!name) return badRequest('Il nome è obbligatorio.');
        const roomId = body.room_id ? Number(body.room_id) : null;
        const result = await env.DB.prepare(`
          INSERT INTO assets (room_id, asset_type_id, name, category, brand, model, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          roomId,
          body.asset_type_id ? Number(body.asset_type_id) : null,
          name,
          body.category ? String(body.category) : null,
          body.brand ? String(body.brand) : null,
          body.model ? String(body.model) : null,
          body.notes ? String(body.notes) : null
        ).run();
        const assetId = Number(result.meta.last_row_id);
        if (body.create_default_tasks && body.asset_type_id) {
          await env.DB.prepare(`
            INSERT INTO maintenance_tasks (asset_id, name, interval_days, warning_days)
            SELECT ?, name, interval_days, warning_days
            FROM maintenance_templates
            WHERE asset_type_id = ?
          `).bind(assetId, Number(body.asset_type_id)).run();
        }
        return json({ id: assetId }, 201);
      }

      const assetMatch = path.match(/^\/api\/assets\/(\d+)$/);
      if (assetMatch && request.method === 'GET') {
        const id = Number(assetMatch[1]);
        const asset = await env.DB.prepare(`
          SELECT a.*, r.name AS room_name
          FROM assets a LEFT JOIN rooms r ON r.id = a.room_id
          WHERE a.id = ?
        `).bind(id).first();
        if (!asset) return json({ error: 'Elemento non trovato.' }, 404);

        const tasks = await env.DB.prepare(`
          SELECT t.*,
                 date(COALESCE(t.last_completed_at, t.created_at), '+' || t.interval_days || ' day') AS next_due,
                 CAST(julianday(date(COALESCE(t.last_completed_at, t.created_at), '+' || t.interval_days || ' day')) - julianday(date('now')) AS INTEGER) AS days_until_due
          FROM maintenance_tasks t
          WHERE t.asset_id = ?
          ORDER BY days_until_due ASC
        `).bind(id).all();

        return json({ ...asset, tasks: tasks.results ?? [] });
      }

      if (path === '/api/tasks' && request.method === 'POST') {
        const body = await request.json<Record<string, unknown>>();
        const assetId = Number(body.asset_id);
        const name = String(body.name ?? '').trim();
        const intervalDays = Number(body.interval_days);
        const warningDays = Number(body.warning_days ?? 14);
        if (!assetId || !name || !Number.isFinite(intervalDays) || intervalDays <= 0) {
          return badRequest('asset_id, nome e intervallo valido sono obbligatori.');
        }
        const result = await env.DB.prepare(`
          INSERT INTO maintenance_tasks (asset_id, name, interval_days, warning_days, last_completed_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(assetId, name, intervalDays, Math.max(0, warningDays), body.last_completed_at || null).run();
        return json({ id: result.meta.last_row_id }, 201);
      }

      const completeMatch = path.match(/^\/api\/tasks\/(\d+)\/complete$/);
      if (completeMatch && request.method === 'POST') {
        const taskId = Number(completeMatch[1]);
        const body = await request.json<Record<string, unknown>>().catch(() => ({}));
        const completedAt = body.completed_at ? String(body.completed_at) : isoDate();
        const notes = body.notes ? String(body.notes).trim() : null;

        const existing = await env.DB.prepare('SELECT id FROM maintenance_tasks WHERE id = ?').bind(taskId).first();
        if (!existing) return json({ error: 'Manutenzione non trovata.' }, 404);

        await env.DB.batch([
          env.DB.prepare('INSERT INTO maintenance_logs (task_id, completed_at, notes) VALUES (?, ?, ?)').bind(taskId, completedAt, notes),
          env.DB.prepare('UPDATE maintenance_tasks SET last_completed_at = ? WHERE id = ?').bind(completedAt, taskId)
        ]);
        return json({ ok: true, completed_at: completedAt });
      }

      const logsMatch = path.match(/^\/api\/tasks\/(\d+)\/logs$/);
      if (logsMatch && request.method === 'GET') {
        const taskId = Number(logsMatch[1]);
        const result = await env.DB.prepare(`
          SELECT id, completed_at, notes
          FROM maintenance_logs
          WHERE task_id = ?
          ORDER BY completed_at DESC, id DESC
        `).bind(taskId).all();
        return json(result.results ?? []);
      }

      if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
      return json({ error: 'Endpoint non trovato.' }, 404);
    } catch (error) {
      console.error(error);
      return json({ error: 'Errore interno.' }, 500);
    }
  }
};
