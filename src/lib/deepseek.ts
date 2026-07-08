/**
 * DeepSeek API Client for natural language parsing.
 * Compatible with OpenAI SDK format (fetch-based, no extra deps).
 * 
 * Environment variable: DEEPSEEK_API_KEY (set via Freebuff Keys UI)
 * API endpoint: https://api.deepseek.com/v1/chat/completions
 * Model: deepseek-chat (aka deepseek-v4-flash)
 */

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

function getApiKey(): string {
  if (typeof window !== "undefined" && (window as any).__DEEPSEEK_API_KEY) {
    return (window as any).__DEEPSEEK_API_KEY;
  }
  if (typeof process !== "undefined" && process.env.DEEPSEEK_API_KEY) {
    return process.env.DEEPSEEK_API_KEY;
  }
  // Try to read from a global injected by env
  return import.meta.env.VITE_DEEPSEEK_API_KEY || "";
}

// ─── Parsed Intent Types ───

export interface ParsedNote {
  title: string;
  content: string;
}

export interface ParsedTask {
  title: string;
  priority: "high" | "medium" | "low";
  due_date: string | null;
  status: "todo" | "in_progress";
}

export interface ParsedTransaction {
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
}

export interface ParsedIntent {
  note: ParsedNote | null;
  task: ParsedTask | null;
  transaction: ParsedTransaction | null;
  summary: string;
}

// ─── DeepSeek Chat Completion ───

async function deepseekChat(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("DeepSeek API key not found. Set DEEPSEEK_API_KEY in your environment variables.");
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`DeepSeek API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── Natural Language Parser ───

const SYSTEM_PROMPT = `Kamu adalah asisten produktivitas AI yang cerdas. Tugasmu adalah memparse input pengguna dalam bahasa alami (Indonesia atau Inggris) dan menentukan apa yang perlu dibuat: tugas (task), catatan (note), transaksi keuangan (transaction), atau kombinasi.

Aturan parsing:
1. **Tanggal**: Deteksi semua tanggal, deadline, tenggat waktu. Konversi ke format YYYY-MM-DD. Pahami "besok", "lusa", "hari ini", "minggu depan", "bulan depan", nama hari ("senin", "selasa", dll), dan format tanggal ("10 jul 2026", "10/07/26", "July 10, 2026").
2. **Prioritas**: Deteksi prioritas dari kata seperti "high/tinggi/penting/urgent" → high, "medium/sedang" → medium, "low/rendah/nanti/santai" → low. Default medium.
3. **Transaksi Keuangan**: Jika ada angka nominal uang (Rp, $, IDR, ribu, juta), kategori (gaji, makan, transport, dll), dan jenis (pemasukan/pengeluaran/income/expense), buat transaksi.
4. **Catatan**: Jika input terdengar seperti ide, catatan, informasi, atau renungan tanpa deadline/prioritas, buat note.
5. **Tugas**: Jika ada tindakan, deadline, prioritas, atau sesuatu yang perlu dikerjakan, buat task.
6. **Kombinasi**: Bisa buat note + task + transaction sekaligus jika input mengandung ketiganya.

Keluaran HARUS berupa JSON murni (tanpa markdown, tanpa backticks) dengan format:
{
  "note": { "title": "judul", "content": "isi catatan" } | null,
  "task": { "title": "judul", "priority": "high|medium|low", "due_date": "YYYY-MM-DD" | null, "status": "todo|in_progress" } | null,
  "transaction": { "type": "income|expense", "amount": number, "category": "string", "description": "string" } | null,
  "summary": "Penjelasan singkat bahasa Indonesia apa yang akan dibuat"
}

Contoh:
Input: "pertemuan meeting dan pembuatan aplikasi tanggal 10 jul 2026, high"
Output: {"note":{"title":"Pertemuan Meeting dan Pembuatan Aplikasi","content":"Meeting untuk membahas pembuatan aplikasi."},"task":{"title":"Pertemuan Meeting dan Pembuatan Aplikasi","priority":"high","due_date":"2026-07-10","status":"todo"},"transaction":null,"summary":"Membuat catatan dan tugas dengan prioritas tinggi untuk pertemuan tanggal 10 Juli 2026"}

Input: "gaji bulan ini 15 juta"
Output: {"note":null,"task":null,"transaction":{"type":"income","amount":15000000,"category":"Salary","description":"Gaji bulan ini"},"summary":"Mencatat pemasukan gaji sebesar Rp 15.000.000"}

Input: "beli makan siang 45rb"
Output: {"note":null,"task":null,"transaction":{"type":"expense","amount":45000,"category":"Food","description":"Makan siang"},"summary":"Mencatat pengeluaran makan siang sebesar Rp 45.000"}

Input: "ide aplikasi absensi online"
Output: {"note":{"title":"Ide Aplikasi Absensi Online","content":"Ide untuk membuat aplikasi absensi online."},"task":null,"transaction":null,"summary":"Membuat catatan baru tentang ide aplikasi absensi online"}`;

export async function parseNaturalInput(input: string): Promise<ParsedIntent> {
  try {
    const text = await deepseekChat(SYSTEM_PROMPT, `Input: "${input}"`);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        note: parsed.note || null,
        task: parsed.task || null,
        transaction: parsed.transaction || null,
        summary: parsed.summary || "Berhasil diproses",
      };
    }
  } catch (err) {
    console.warn("DeepSeek parse failed, using fallback:", err);
  }
  return fallbackParse(input);
}

// ─── Fallback Rule-Based Parser ───

function fallbackParse(input: string): ParsedIntent {
  const lower = input.toLowerCase();
  const today = new Date();

  // Date detection
  const parsedDate = tryParseDate(lower);

  // Priority detection
  const priority: "high" | "medium" | "low" =
    lower.includes("high") || lower.includes("tinggi") || lower.includes("urgent") || lower.includes("penting")
      ? "high"
      : lower.includes("low") || lower.includes("rendah") || lower.includes("nanti") || lower.includes("santai")
        ? "low"
        : "medium";

  // Transaction detection — look for money amounts
  const moneyMatch = lower.match(/(\d+[\d.,]*)\s*(rb|ribu|jt|juta|k|ribu|ratus\s*ribu)?/i);
  let amount = 0;
  if (moneyMatch) {
    let val = parseFloat(moneyMatch[1].replace(/[,.]/g, ""));
    const multiplier = moneyMatch[2]?.toLowerCase() || "";
    if (multiplier === "rb" || multiplier === "ribu" || multiplier === "k") val *= 1000;
    else if (multiplier === "jt" || multiplier === "juta") val *= 1000000;
    else if (multiplier === "ratus ribu") val *= 100000;
    amount = val;
  }

  const hasMoney = amount > 0;
  const incomeWords = ["gaji", "salary", "pemasukan", "income", "bonus", "honor", "fee", "pendapatan", "transfer masuk"];
  const expenseWords = ["beli", "bayar", "makan", "pengeluaran", "expense", "cost", "biaya", "ongkos", "sewa", "tagihan", "bill"];
  const isIncome = incomeWords.some(w => lower.includes(w));
  const isExpense = expenseWords.some(w => lower.includes(w)) || (!isIncome && hasMoney);

  // Determine what to create
  const hasTaskIndicators = parsedDate || lower.includes("deadline") || lower.includes("selesai") || lower.includes("kerjakan") || lower.includes("buat") || lower.includes("do ");
  const hasTransaction = hasMoney && (isIncome || isExpense);
  const isSimpleNote = !hasTaskIndicators && !hasTransaction;

  const result: ParsedIntent = {
    note: null,
    task: null,
    transaction: null,
    summary: "",
  };

  if (hasTransaction) {
    const category = suggestCategory(lower);
    result.transaction = {
      type: isIncome ? "income" : "expense",
      amount: amount,
      category,
      description: input.trim(),
    };
    result.summary = `${isIncome ? "Pemasukan" : "Pengeluaran"} ${category}: Rp ${amount.toLocaleString("id-ID")}`;
  }

  if (isSimpleNote) {
    result.note = {
      title: input.trim().length > 60 ? input.trim().slice(0, 60) + "..." : input.trim(),
      content: `Dari input: ${input.trim()}`,
    };
    result.summary = `Membuat catatan: "${input.trim().slice(0, 40)}${input.length > 40 ? "..." : ""}"`;
  }

  if (hasTaskIndicators || (result.transaction && !result.note)) {
    result.task = {
      title: input.trim(),
      priority,
      due_date: parsedDate,
      status: "todo",
    };
    const dateStr = parsedDate ? ` (tenggat ${parsedDate})` : "";
    result.summary = `Membuat tugas${result.note ? " dan catatan" : ""}: "${input.trim().slice(0, 40)}..."${dateStr} prioritas ${priority}`;
  }

  // If nothing was detected, create both
  if (!result.note && !result.task && !result.transaction) {
    result.note = { title: input.trim(), content: `Dari input: ${input.trim()}` };
    result.task = { title: input.trim(), priority: "medium", due_date: null, status: "todo" };
    result.summary = `Membuat catatan dan tugas: "${input.trim().slice(0, 40)}..."`;
  }

  return result;
}

// ─── Date Parser ───

function tryParseDate(text: string): string | null {
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
    juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
  };

  const dayMap: Record<string, number> = {
    senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6, minggu: 0,
    monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0,
  };

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // "hari ini"
  if (text.includes("hari ini")) return todayStr;

  // "besok" = tomorrow
  if (text.includes("besok") || text.includes("tomorrow")) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }

  // "lusa" = day after tomorrow
  if (text.includes("lusa")) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  }

  // "minggu depan" = next week
  if (text.includes("minggu depan") || text.includes("next week")) {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }

  // Day names: "senin", "selasa", etc.
  for (const [dayName, dayIndex] of Object.entries(dayMap)) {
    if (text.includes(dayName)) {
      const d = new Date(today);
      const currentDay = d.getDay();
      let diff = dayIndex - currentDay;
      if (diff <= 0) diff += 7; // Next occurrence
      d.setDate(d.getDate() + diff);
      return d.toISOString().split("T")[0];
    }
  }

  // Pattern: "dd month yyyy" or "dd month"
  const dateMatch = text.match(
    /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s*(\d{4})?/i
  );
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const month = monthMap[dateMatch[2].toLowerCase()];
    const year = dateMatch[3] ? parseInt(dateMatch[3]) : today.getFullYear();
    if (month !== undefined && day >= 1 && day <= 31) {
      return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // Pattern: "month dd, yyyy" or "month dd"
  const usDateMatch = text.match(
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\,?\s*(\d{4})?/i
  );
  if (usDateMatch) {
    const month = monthMap[usDateMatch[1].toLowerCase().slice(0, 3)];
    const day = parseInt(usDateMatch[2]);
    const year = usDateMatch[3] ? parseInt(usDateMatch[3]) : today.getFullYear();
    if (month !== undefined && day >= 1 && day <= 31) {
      return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return null;
}

// ─── Category Detection ───

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Salary: ["salary", "gaji", "payroll", "monthly income"],
  Freelance: ["freelance", "project", "client", "gig", "design"],
  Investment: ["investment", "dividen", "saham", "stock", "crypto", "profit"],
  Food: ["makan", "restaurant", "cafe", "lunch", "dinner", "groceries", "grocery", "mart", "supermarket", "minum"],
  Transport: ["transport", "gas", "bensin", "fuel", "grab", "gojek", "taxi", "parkir", "parking", "bensin", "ojek"],
  Entertainment: ["netflix", "spotify", "entertainment", "game", "movie", "music", "ticket", "film", "nonton"],
  Shopping: ["shopping", "belanja", "clothes", "baju", "sepatu", "shoes", "bag"],
  Bills: ["bill", "tagihan", "electricity", "listrik", "water", "air", "phone", "internet", "pdam", "pln"],
  Health: ["health", "kesehatan", "doctor", "dokter", "obat", "medicine", "hospital", "klinik"],
  Education: ["education", "course", "kursus", "buku", "book", "tutorial", "class", "kuliah"],
};

function suggestCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return "Other";
}

// ─── Image/File Analysis (for future use) ───

export async function analyzeImage(
  base64Image: string,
  mimeType: string,
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) return "DeepSeek API key not configured";

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image. If it contains text, notes, receipts, or documents, extract the key information and suggest what task, note, or transaction to create.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) return "Failed to analyze image";
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No analysis available";
  } catch {
    return "Image analysis failed — using text-only fallback";
  }
}
