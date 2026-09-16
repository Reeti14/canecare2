export const runtime = 'nodejs';
export const maxDuration = 60;

import { GoogleGenAI } from '@google/genai';

const SYSTEM_INSTRUCTION = `You are CANECARE AI Coach — a friendly, knowledgeable agricultural expert specializing in sugarcane farming.

Your expertise covers:
- Sugarcane diseases: Mosaic virus, Red Rot, Rust, Yellow leaf disease, and more
- Disease identification, symptoms, causes, and severity assessment
- Treatment recommendations: fungicides, insecticides, cultural practices
- Prevention strategies and best farming practices
- Soil health, irrigation, fertilization for sugarcane
- Crop management and yield optimization

Guidelines:
- Give practical, actionable advice that farmers can follow immediately
- When discussing treatments, mention specific products/chemicals when possible
- If a question is outside sugarcane/agriculture, politely redirect
- Use simple language accessible to farmers
- If asked in Hindi, respond in Hindi. Otherwise respond in the same language as the question.
- Be encouraging and supportive — farming is hard work!
- Keep responses concise but thorough (aim for 2-4 paragraphs max)`;

// ── Configuration ────────────────────────────────────────────

const PRIMARY_MODEL = 'gemini-3.6-flash';
const FALLBACK_MODEL = 'gemini-3.5-flash';
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000; // 1s, 2s

// ── Error Logging & Helpers ──────────────────────────────────

function logErrorDetails(context: string, err: any) {
  const status = err?.status || err?.statusCode || err?.response?.status || 'NO_HTTP_STATUS';
  const message = err?.message || String(err);
  let cause = 'none';
  try {
    cause = err?.cause ? JSON.stringify(err.cause) : 'none';
  } catch {
    cause = String(err?.cause);
  }
  console.error(`\n[AI Coach ERROR] ==============================================`);
  console.error(`[AI Coach ERROR] Context: ${context}`);
  console.error(`[AI Coach ERROR] HTTP Status: ${status}`);
  console.error(`[AI Coach ERROR] Message: ${message}`);
  console.error(`[AI Coach ERROR] Cause: ${cause}`);
  if (err?.stack) {
    console.error(`[AI Coach ERROR] Stack:\n${err.stack}`);
  }
  console.error(`[AI Coach ERROR] ==============================================\n`);
}

function isRetryable(err: any): boolean {
  const status = Number(err?.status || err?.statusCode || err?.response?.status);
  if (status === 503 || status === 429 || status === 504 || status === 502) {
    return true;
  }
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('overloaded') ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('high demand')
  );
}

function isAuthOrConfigError(err: any): boolean {
  const status = Number(err?.status || err?.statusCode || err?.response?.status);
  if (status === 401 || status === 403) return true;
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('permission_denied') ||
    msg.includes('unauthenticated') ||
    msg.includes('forbidden')
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Try to call generateContentStream, retrying on 503/429 with exponential backoff. */
async function callWithRetry(
  ai: InstanceType<typeof GoogleGenAI>,
  model: string,
  contents: any[],
  retries: number = MAX_RETRIES,
) {
  let lastError: any;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const config: any = {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        maxOutputTokens: 1024,
      };
      // Attach thinkingConfig to models that support thinkingBudget
      if (model.includes('3.6') || model.includes('3.7') || model.includes('2.5')) {
        config.thinkingConfig = { thinkingBudget: 0 };
      }

      const response = await ai.models.generateContentStream({
        model,
        contents,
        config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      logErrorDetails(`${model} (attempt ${attempt + 1}/${retries}) failed`, err);

      if (!isRetryable(err)) {
        // Non-retryable error (400, 401, 404, etc.) — throw immediately
        throw err;
      }

      if (attempt < retries - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.log(`[AI Coach] Retrying ${model} in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

// ── Route Handlers ───────────────────────────────────────────

export async function GET() {
  return Response.json({ status: 'ok', service: 'CANECARE AI Coach API' });
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.error('[AI Coach ERROR] GEMINI_API_KEY is missing or contains placeholder in .env.local');
      return Response.json(
        {
          category: 'auth_config',
          error: 'Configuration Issue: Gemini API key is not configured. Please add a valid GEMINI_API_KEY to .env.local',
        },
        { status: 500 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch (parseErr: any) {
      logErrorDetails('JSON Body Parse Error', parseErr);
      return Response.json(
        {
          category: 'invalid_request',
          error: 'Invalid Request: Request body must be valid JSON.',
        },
        { status: 400 }
      );
    }

    const { messages } = body || {};
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        {
          category: 'invalid_request',
          error: 'Invalid Request: No messages provided in request payload.',
        },
        { status: 400 }
      );
    }

    // Clean and validate messages for Gemini generateContent
    const sanitizedContents = messages
      .filter((msg: any) => msg && typeof msg.content === 'string' && msg.content.trim().length > 0)
      .map((msg: { role: string; content: string }) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content.trim() }],
      }));

    if (sanitizedContents.length === 0) {
      return Response.json(
        {
          category: 'invalid_request',
          error: 'Invalid Request: All message contents were empty or invalid.',
        },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Try primary model with retries, then fallback model
    let response: any;
    try {
      response = await callWithRetry(ai, PRIMARY_MODEL, sanitizedContents);
    } catch (primaryErr: any) {
      if (isRetryable(primaryErr)) {
        console.warn(`[AI Coach] Primary model ${PRIMARY_MODEL} exhausted retries. Attempting fallback ${FALLBACK_MODEL}...`);
        try {
          response = await callWithRetry(ai, FALLBACK_MODEL, sanitizedContents, 1);
        } catch (fallbackErr: any) {
          logErrorDetails(`Fallback model ${FALLBACK_MODEL} also failed`, fallbackErr);
          return Response.json(
            {
              category: 'temporary_server_issue',
              error: 'Temporary Server Issue: The AI service is currently experiencing high demand or rate limits. Please try again in a few moments.',
            },
            { status: 503 }
          );
        }
      } else if (isAuthOrConfigError(primaryErr)) {
        logErrorDetails('Authentication / Key Error on primary model', primaryErr);
        return Response.json(
          {
            category: 'auth_config',
            error: 'Authentication Issue: The provided Gemini API key is invalid or lacks necessary permissions. Please check your .env.local setup.',
          },
          { status: 401 }
        );
      } else {
        logErrorDetails(`Non-retryable error on ${PRIMARY_MODEL}`, primaryErr);
        const status = Number(primaryErr?.status || primaryErr?.statusCode || 500);
        return Response.json(
          {
            category: status === 400 ? 'invalid_request' : 'temporary_server_issue',
            error: status === 400
              ? `Invalid Request: ${primaryErr.message || 'Gemini API rejected the request format.'}`
              : `Server Issue: ${primaryErr.message || 'The AI service encountered an unexpected error.'}`,
          },
          { status: status >= 400 && status < 600 ? status : 500 }
        );
      }
    }

    // Stream the response back to the client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (err: any) {
          logErrorDetails('Streaming generation error', err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (unexpectedErr: any) {
    logErrorDetails('Unexpected unhandled error in POST handler', unexpectedErr);
    return Response.json(
      {
        category: 'temporary_server_issue',
        error: `Server Error: ${unexpectedErr.message || 'An unexpected error occurred. Please try again.'}`,
      },
      { status: 500 }
    );
  }
}
