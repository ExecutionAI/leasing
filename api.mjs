import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'leasing' } }
);

// ── Auth ──────────────────────────────────────────────────────────────────────

const requireAdmin = (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
};

// ── Status transitions ────────────────────────────────────────────────────────

const upload = multer({ storage: multer.memoryStorage() });

// ── OpenAI helper ─────────────────────────────────────────────────────────────

async function callOpenAI(systemPrompt, userContent) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(data.choices[0].message.content);
}

const VALID_TRANSITIONS = {
  prospecto:            ['cotizacion_enviada', 'cancelado'],
  cotizacion_enviada:   ['contrato_firmado', 'cancelado'],
  contrato_firmado:     ['activo', 'cancelado'],
  activo:               ['terminado', 'cancelado'],
  terminado:            [],
  cancelado:            ['prospecto'],
};

// ── Admin UI ──────────────────────────────────────────────────────────────────

app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, 'admin', 'index.html'));
});

// ── Stats ─────────────────────────────────────────────────────────────────────

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [clientsRes, dealsRes] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('leasing_deals').select('id, status, monthly_payment'),
    ]);

    if (clientsRes.error) throw clientsRes.error;
    if (dealsRes.error) throw dealsRes.error;

    const deals = dealsRes.data;
    const activos = deals.filter(d => d.status === 'activo');
    const now = new Date();
    const thisMonth = deals.filter(d => {
      const created = new Date(d.created_at);
      return created.getMonth() === now.getMonth() &&
             created.getFullYear() === now.getFullYear();
    });

    res.json({
      total_clientes: clientsRes.count,
      deals_activos: activos.length,
      valor_cartera: activos.reduce((sum, d) => sum + (d.monthly_payment || 0), 0),
      deals_este_mes: thisMonth.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Clients ───────────────────────────────────────────────────────────────────

app.get('/api/admin/clients', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/admin/clients/:id', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

app.post('/api/admin/clients', requireAdmin, async (req, res) => {
  const { full_name, email, phone, company, type, source, notes } = req.body;
  if (!full_name) return res.status(400).json({ error: 'full_name es requerido' });

  const { data, error } = await supabase
    .from('clients')
    .insert({ full_name, email, phone, company, type, source, notes })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.patch('/api/admin/clients/:id', requireAdmin, async (req, res) => {
  const { full_name, email, phone, company, type, source, notes } = req.body;
  const { data, error } = await supabase
    .from('clients')
    .update({ full_name, email, phone, company, type, source, notes })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/admin/clients/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// ── Vehicles ──────────────────────────────────────────────────────────────────

app.get('/api/admin/vehicles', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/admin/vehicles/:id', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

app.post('/api/admin/vehicles', requireAdmin, async (req, res) => {
  const { brand, model, year, value, color, notes } = req.body;
  if (!brand || !model) return res.status(400).json({ error: 'brand y model son requeridos' });

  const { data, error } = await supabase
    .from('vehicles')
    .insert({ brand, model, year, value, color, notes })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.patch('/api/admin/vehicles/:id', requireAdmin, async (req, res) => {
  const { brand, model, year, value, color, notes } = req.body;
  const { data, error } = await supabase
    .from('vehicles')
    .update({ brand, model, year, value, color, notes })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/admin/vehicles/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// ── Deals ─────────────────────────────────────────────────────────────────────

app.get('/api/admin/deals', requireAdmin, async (req, res) => {
  const { status } = req.query;
  let query = supabase
    .from('leasing_deals')
    .select(`
      *,
      client:clients(id, full_name, phone, company, type),
      vehicle:vehicles(id, brand, model, year, value)
    `)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/admin/deals/:id', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('leasing_deals')
    .select(`
      *,
      client:clients(id, full_name, phone, email, company, type),
      vehicle:vehicles(id, brand, model, year, value, color)
    `)
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

app.post('/api/admin/deals', requireAdmin, async (req, res) => {
  const { client_id, vehicle_id, status = 'prospecto', monthly_payment, contract_start, contract_end, notes } = req.body;
  if (!client_id) return res.status(400).json({ error: 'client_id es requerido' });

  const { data, error } = await supabase
    .from('leasing_deals')
    .insert({ client_id, vehicle_id, status, monthly_payment, contract_start, contract_end, notes })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.patch('/api/admin/deals/:id', requireAdmin, async (req, res) => {
  const { client_id, vehicle_id, monthly_payment, contract_start, contract_end, notes } = req.body;
  const { data, error } = await supabase
    .from('leasing_deals')
    .update({ client_id, vehicle_id, monthly_payment, contract_start, contract_end, notes, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.patch('/api/admin/deals/:id/status', requireAdmin, async (req, res) => {
  const { status: newStatus } = req.body;

  const { data: deal, error: fetchErr } = await supabase
    .from('leasing_deals')
    .select('status')
    .eq('id', req.params.id)
    .single();

  if (fetchErr) return res.status(404).json({ error: 'Deal no encontrado' });

  const allowed = VALID_TRANSITIONS[deal.status] || [];
  if (!allowed.includes(newStatus)) {
    return res.status(400).json({
      error: `Transición inválida: ${deal.status} → ${newStatus}`,
      allowed,
    });
  }

  const { data, error } = await supabase
    .from('leasing_deals')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/admin/deals/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase
    .from('leasing_deals')
    .delete()
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// ── AI: Parse WhatsApp conversation ───────────────────────────────────────────

app.post('/api/admin/parse-whatsapp', requireAdmin, async (req, res) => {
  const { conversation } = req.body;
  if (!conversation || !conversation.trim()) {
    return res.status(400).json({ error: 'Se requiere el texto de la conversación' });
  }
  try {
    const result = await callOpenAI(
      `Eres un asistente CRM para una empresa de arrendamiento de autos en México.
Extrae los datos del cliente de esta conversación de WhatsApp y responde ÚNICAMENTE con un JSON válido con estas claves:
- full_name: string (nombre completo, requerido)
- phone: string o null (número de teléfono, solo dígitos y espacios)
- email: string o null
- company: string o null (empresa u organización)
- type: "PFAE" | "PM" | null (persona física con actividad empresarial o persona moral)
- notes: string o null (resumen breve de lo que busca el cliente)
Si no encuentras un dato, usa null. No inventes información.`,
      conversation.trim()
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI: Parse PDF contract ─────────────────────────────────────────────────────

app.post('/api/admin/parse-contract', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Se requiere un archivo PDF' });
  const { client_id } = req.body;
  if (!client_id) return res.status(400).json({ error: 'client_id es requerido' });

  try {
    const pdfResult = await pdfParse(req.file.buffer);
    const text = pdfResult.text.slice(0, 12000); // cap to avoid token limits

    const result = await callOpenAI(
      `Eres un asistente CRM para una empresa de arrendamiento de autos en México.
Extrae los datos del contrato de arrendamiento del siguiente texto y responde ÚNICAMENTE con un JSON válido con estas claves:
- vehicle: objeto con: brand (marca), model (modelo), year (número o null), color (string o null), value (valor del vehículo en MXN como número o null)
- monthly_payment: número en MXN o null (renta mensual / pago mensual)
- contract_start: string en formato YYYY-MM-DD o null (fecha de inicio)
- contract_end: string en formato YYYY-MM-DD o null (fecha de vencimiento/término)
- notes: string o null (observaciones relevantes del contrato)
Si no encuentras un dato, usa null. No inventes información.`,
      text
    );

    res.json({ ...result, client_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`CRM API running on port ${PORT}`));
