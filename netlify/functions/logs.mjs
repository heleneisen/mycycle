const TURSO_URL = process.env.TURSO_DB_URL?.replace('libsql://', 'https://');
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

function toArg(val) {
  if (val === null || val === undefined) return { type: 'null' };
  if (typeof val === 'number') {
    return Number.isInteger(val)
      ? { type: 'integer', value: String(val) }
      : { type: 'float', value: String(val) };
  }
  return { type: 'text', value: String(val) };
}

function unwrapValue(cell) {
  if (!cell || cell.type === 'null') return null;
  if (cell.type === 'integer') return parseInt(cell.value, 10);
  if (cell.type === 'float') return parseFloat(cell.value);
  return cell.value;
}

async function tursoExecute(sql, args = []) {
  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt: { sql, args: args.map(toArg) } },
        { type: 'close' },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Turso HTTP ${res.status}: ${body}`);
  }

  const data = await res.json();
  const result = data.results[0];

  if (result.type === 'error') {
    throw new Error(`Turso query error: ${result.error?.message}`);
  }

  const { cols, rows } = result.response.result;
  return rows.map((row) => {
    const obj = {};
    cols.forEach((col, i) => { obj[col.name] = unwrapValue(row[i]); });
    return obj;
  });
}

function rowToLog(row) {
  let symptoms = {};
  if (row.symptoms) {
    try { symptoms = JSON.parse(row.symptoms); } catch { }
  }
  return {
    date: row.date,
    temp: row.temp,
    tempUnit: row.tempUnit === 'F' ? 'F' : 'C',
    tempQuestionable: row.tempQuestionable === 1,
    tempShift: row.tempShift === 1,
    fluid: row.fluid,
    flow: row.flow,
    sex: row.sex,
    isCycleDayOne: row.isCycleDayOne === 1,
    isPeak: row.isPeak === 1,
    notes: row.notes ?? '',
    symptoms,
    form: row.form ?? null,
  };
}

export default async function handler(req) {
  if (!TURSO_URL || !TURSO_TOKEN) {
    return Response.json({ error: 'Missing Turso env vars' }, { status: 500 });
  }

  const url = new URL(req.url);

  try {
    if (req.method === 'GET') {
      const date = url.searchParams.get('date');
      if (date) {
        const rows = await tursoExecute('SELECT * FROM logs WHERE date = ?', [date]);
        return Response.json(rows.length ? rowToLog(rows[0]) : null);
      } else {
        const rows = await tursoExecute('SELECT * FROM logs ORDER BY date ASC');
        return Response.json(rows.map(rowToLog));
      }
    }

    if (req.method === 'POST') {
      const log = await req.json();
      await tursoExecute(
        `INSERT OR REPLACE INTO logs
          (date, temp, tempUnit, tempQuestionable, tempShift, fluid, flow, sex, isCycleDayOne, isPeak, notes, symptoms, form)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          log.date,
          log.temp ?? null,
          log.tempUnit,
          log.tempQuestionable ? 1 : 0,
          log.tempShift ? 1 : 0,
          log.fluid ?? null,
          log.flow ?? null,
          log.sex ?? null,
          log.isCycleDayOne ? 1 : 0,
          log.isPeak ? 1 : 0,
          log.notes ?? '',
          JSON.stringify(log.symptoms ?? {}),
          log.form ?? null,
        ]
      );
      return Response.json({ ok: true });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (err) {
    console.error('[logs fn]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export const config = { path: '/api/logs' };
