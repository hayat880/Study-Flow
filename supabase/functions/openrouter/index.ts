// @ts-nocheck
// Supabase Edge Function (Deno runtime) - proxies chat requests to Google Gemini (free tier).
// The function name stays "openrouter" so the frontend does not need to change.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MODEL = 'gemini-2.0-flash'

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages } = await req.json()

    const geminiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY')
    if (!geminiKey) {
      throw new Error('GEMINI_API_KEY is not configured on the server.')
    }

    // Convert OpenAI-style messages to Gemini format
    const systemParts: { text: string }[] = []
    const contents: { role: string; parts: { text: string }[] }[] = []

    for (const msg of messages ?? []) {
      if (msg.role === 'system') {
        systemParts.push({ text: msg.content })
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })
      }
    }

    const payload: Record<string, unknown> = { contents }
    if (systemParts.length) payload.systemInstruction = { parts: systemParts }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey,
        },
        body: JSON.stringify(payload),
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${await response.text()}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? ''

    // Return OpenAI-like shape expected by openRouterService.ts
    return new Response(
      JSON.stringify({ choices: [{ message: { role: 'assistant', content: text } }] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
