import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Note, Task, Transaction } from "@/components/omnitask/data";

// The API key should be set in the environment
// For Convex actions, it would be process.env.GOOGLE_API_KEY
// For client-side, we'll use a mock/fallback approach
let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = (typeof window !== "undefined"
      ? (window as any).__GOOGLE_API_KEY
      : process.env.GOOGLE_API_KEY) || "demo";
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// ─── Task Suggestions from Notes ───

export interface TaskSuggestion {
  title: string;
  priority: "low" | "medium" | "high";
  reason: string;
}

export async function suggestTasksFromNotes(notes: Note[]): Promise<TaskSuggestion[]> {
  // Demo/mock mode — return sample suggestions
  if (!notes.length) return [];

  try {
    const model = getClient().getGenerativeModel({ model: "gemini-2.0-flash" });
    const content = notes.map((n) => `- ${n.title}: ${n.content}`).join("\n");

    const prompt = `Based on these notes, suggest 2-5 actionable tasks I should create. 
For each task, provide:
- title: a clear task title
- priority: "high", "medium", or "low"
- reason: why this task matters

Notes:
${content}

Format response as JSON array: [{"title": "...", "priority": "...", "reason": "..."}]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as TaskSuggestion[];
    }
    return fallbackSuggestions(notes);
  } catch {
    return fallbackSuggestions(notes);
  }
}

function fallbackSuggestions(notes: Note[]): TaskSuggestion[] {
  const suggestions: TaskSuggestion[] = [];
  const allText = notes.map((n) => `${n.title} ${n.content}`).join(" ").toLowerCase();

  if (allText.includes("meeting") || allText.includes("review")) {
    suggestions.push({ title: "Follow up on meeting items", priority: "medium", reason: "From meeting notes" });
  }
  if (allText.includes("idea") || allText.includes("project")) {
    suggestions.push({ title: "Research the new idea further", priority: "high", reason: "Interesting concept to explore" });
  }
  if (allText.includes("buy") || allText.includes("shop") || allText.includes("list")) {
    suggestions.push({ title: "Complete the shopping list", priority: "low", reason: "Items from note" });
  }
  if (allText.includes("deadline") || allText.includes("urgent")) {
    suggestions.push({ title: "Address urgent items ASAP", priority: "high", reason: "Has deadline mentioned" });
  }
  return suggestions;
}

// ─── Smart Transaction Categorization ───

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Salary: ["salary", "gaji", "payroll", "monthly income", "transfer"],
  Freelance: ["freelance", "project", "client", "gig", "logo design"],
  Investment: ["investment", "dividen", "saham", "stock", "crypto", "profit"],
  Food: ["food", "makan", "restaurant", "cafe", "lunch", "dinner", "groceries", "grocery", "mart", "supermarket"],
  Transport: ["transport", "gas", "bensin", "fuel", "grab", "gojek", "taxi", "parkir", "parking"],
  Entertainment: ["netflix", "spotify", "entertainment", "game", "movie", "music", "ticket"],
  Shopping: ["shopping", "belanja", "clothes", "baju", "sepatu", "shoes", "bag", "tas"],
  Bills: ["bill", "tagihan", "electricity", "listrik", "water", "air", "phone", "internet"],
  Health: ["health", "kesehatan", "doctor", "dokter", "obat", "medicine", "hospital", "rs", "clinic"],
  Education: ["education", "course", "kursus", "buku", "book", "tutorial", "class"],
};

export function suggestCategory(description: string): string {
  const desc = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => desc.includes(kw))) {
      return category;
    }
  }
  return "Other";
}

// ─── Writing Assistant for Notes ───

export async function expandNoteContent(title: string, content: string): Promise<string> {
  try {
    const model = getClient().getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `I have a note titled "${title}" with this content: "${content}"
Expand this into a well-structured set of bullet points, keeping it concise and practical.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return content;
  }
}

export async function summarizeNote(content: string): Promise<string> {
  try {
    const model = getClient().getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Summarize this in 1-2 sentences: "${content}"`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return content.slice(0, 100) + "...";
  }
}

// ─── Priority Prediction ───

export function predictPriority(title: string): "low" | "medium" | "high" {
  const t = title.toLowerCase();
  const highWords = ["urgent", "critical", "important", "deadline", "asap", "segera", "penting", "crash", "bug"];
  const lowWords = ["maybe", "someday", "later", "nanti", "optional", "nice to have", "research"];

  if (highWords.some((w) => t.includes(w))) return "high";
  if (lowWords.some((w) => t.includes(w))) return "low";
  return "medium";
}
