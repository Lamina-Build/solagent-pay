// api/execute.js
// Vercel Serverless Function — secure proxy for Claude API
// API key stays on the server, never exposed to the browser

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { agent_id, instruction } = req.body;

  if (!agent_id || !instruction) {
    return res.status(400).json({ error: 'Missing agent_id or instruction' });
  }

  const SYSTEM_PROMPTS = {
    research:  'You are a specialized research agent. Provide a structured research report with key points, relevant data and conclusions. Use markdown formatting with **bold** for key terms and bullet points. Be informative and concise. Max 400 words.',
    summary:   'You are a summary agent. Create a structured summary with the main points highlighted in **bold**. Use bullet points. Be concise. Max 300 words.',
    code:      'You are a code generation agent. Generate clean, well-commented and functional code. Briefly explain what the code does before showing it. Use proper code blocks with language tags. Max 400 words.',
    translate: 'You are a professional translation agent. Provide the requested translation with quality and context. If the target language is not specified, translate to English. Also provide a brief note on tone/style.',
    data:      'You are a data analysis agent. Analyze the provided information, identify patterns and provide actionable insights. Structure your response with: Summary, Key Findings, and Recommendations. Max 400 words.',
    creative:  'You are a creative writing agent. Produce original, engaging, high-quality content. Adapt the tone to the requested context. Max 400 words.',
  };

  const systemPrompt = SYSTEM_PROMPTS[agent_id];
  if (!systemPrompt) {
    return res.status(400).json({ error: `Unknown agent: ${agent_id}` });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: instruction }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Claude API error:', err);
      return res.status(502).json({ error: 'AI service unavailable', detail: err });
    }

    const data = await response.json();
    const result = data.content?.[0]?.text || 'Task completed successfully.';

    return res.status(200).json({
      result,
      agent_id,
      model: 'claude-sonnet-4-20250514',
      status: 'success',
    });

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
