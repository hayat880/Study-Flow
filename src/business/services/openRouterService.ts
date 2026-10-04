import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Free Gemini models, tried in order. If one is overloaded (503) or rate-limited (429),
// we automatically fall back to the next one.
const GEMINI_MODELS = [
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Calls Google Gemini (free tier) directly using the key from .env.local
async function callGemini(messages: { role: string; content: string }[], jsonMode = false): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is missing in .env.local');

  const systemParts = messages.filter(m => m.role === 'system').map(m => ({ text: m.content }));
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

  const payload: Record<string, unknown> = { contents };
  if (systemParts.length) payload.systemInstruction = { parts: systemParts };
  if (jsonMode) payload.generationConfig = { responseMimeType: 'application/json' };

  let lastError = 'Unknown error';
  for (const model of GEMINI_MODELS) {
    // up to 2 attempts per model, with a short backoff
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Response;
      try {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify(payload),
          }
        );
      } catch (e: any) {
        lastError = `Network error: ${e?.message ?? e}`;
        await sleep(800 * (attempt + 1));
        continue;
      }

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
        if (text) return text;
        lastError = `Empty response from ${model}`;
        break; // try next model
      }

      lastError = `Gemini API error ${res.status} (${model}): ${await res.text()}`;
      if (res.status === 404) break; // model unavailable -> next model
      if (!RETRYABLE.has(res.status)) throw new Error(lastError); // e.g. bad key
      await sleep(800 * (attempt + 1));
    }
  }
  throw new Error(`AI is busy right now, please try again in a moment. (${lastError})`);
}

export const openRouterService = {
  // Uses the AI to judge free-text answers (meaning matters, not exact wording)
  gradeShortAnswers: async (items: { q: string; a: string; user: string }[]): Promise<boolean[]> => {
    if (!items.length) return [];
    const prompt = `Grade each student answer against the correct answer. Accept answers that have the same meaning, even if worded differently or with minor spelling mistakes. Empty answers are wrong.
Return ONLY a JSON array of booleans, one per item, in the same order.

${JSON.stringify(items.map((it, i) => ({ id: i + 1, question: it.q, correct: it.a, student: it.user })))}`;
    const text = await callGemini([{ role: 'user', content: prompt }], true);
    try {
      const arr = JSON.parse(text);
      return items.map((_, i) => Boolean(arr[i]));
    } catch {
      throw new Error('AI returned an invalid grading result.');
    }
  },
  extractTextFromPdf: async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      return fullText;
    } catch (e) {
      console.error("Error extracting PDF text:", e);
      return "Could not extract text from PDF.";
    }
  },

  askQuestion: async (
    chatHistory: {role: 'u'|'a', text: string}[],
    question: string, 
    sourceType: 'text' | 'link' | 'pdf' | null, 
    sourceText: string, 
    sourceFile: File | null
  ) => {
    const messages = [];

    // System instruction or context
    let contextStr = '';
    if (sourceType === 'text' && sourceText.trim()) {
      contextStr = `Source Material:\n${sourceText}\n\n`;
    } else if (sourceType === 'link' && sourceText.trim()) {
      contextStr = `Source Material URL: ${sourceText}\n\n`;
    } else if (sourceType === 'pdf' && sourceFile) {
      const extracted = await openRouterService.extractTextFromPdf(sourceFile);
      contextStr = `Source Material (Extracted from PDF):\n${extracted.substring(0, 10000)}\n\n`; // truncate if too long
    }

    if (contextStr) {
      messages.push({ role: 'system', content: `You are an AI assistant. Use the following context to answer the user's questions:\n${contextStr}` });
    }

    // Add history
    for (const msg of chatHistory) {
      messages.push({ role: msg.role === 'u' ? 'user' : 'assistant', content: msg.text });
    }

    // Add current question
    messages.push({ role: 'user', content: question });

    return await callGemini(messages);
  },

  generateQuiz: async (
    numQs: number,
    difficulty: string,
    type: string,
    sourceType: 'text' | 'link' | 'pdf' | null, 
    sourceText: string, 
    sourceFile: File | null
  ) => {
    const prompt = `
Generate a quiz based on the provided source material.
- Number of questions: ${numQs}
- Difficulty: ${difficulty}
- Question type: ${type} (e.g. MCQ, Fill in the blanks, Short answer)

IMPORTANT: You MUST return ONLY a raw JSON array of objects. Do NOT include markdown formatting like \`\`\`json.
Each object must have the exact following structure:
{
  "q": "The question text here",
  "opts": ["Option A", "Option B", "Option C", "Option D"], // ONLY if MCQ, otherwise empty array []
  "a": "The correct answer here"
}
    `;

    const messages = [];

    let contextStr = '';
    if (sourceType === 'text' && sourceText.trim()) {
      contextStr = `Source Material:\n${sourceText}\n\n`;
    } else if (sourceType === 'link' && sourceText.trim()) {
      contextStr = `Source Material URL: ${sourceText}\n\n`;
    } else if (sourceType === 'pdf' && sourceFile) {
      const extracted = await openRouterService.extractTextFromPdf(sourceFile);
      contextStr = `Source Material (Extracted from PDF):\n${extracted.substring(0, 10000)}\n\n`;
    }

    if (contextStr) {
      messages.push({ role: 'system', content: `You are an AI assistant. Context:\n${contextStr}` });
    }
    messages.push({ role: 'user', content: prompt });

    let text = (await callGemini(messages, true)).trim();
    if (text.startsWith('```json')) text = text.substring(7);
    if (text.startsWith('```')) text = text.substring(3);
    if (text.endsWith('```')) text = text.substring(0, text.length - 3);
    
    try {
      return JSON.parse(text.trim());
    } catch (e) {
      console.error("Failed to parse quiz JSON:", text);
      throw new Error("AI returned invalid quiz format.");
    }
  }
};
