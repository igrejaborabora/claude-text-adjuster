import { NextRequest, NextResponse } from 'next/server';

// Função para normalizar texto (NFC + \n)
function normalizeForCount(s: string): string {
  let t = s.normalize("NFC");
  t = t.replace(/\r\n/g, "\n");
  return t;
}

// Função para contar caracteres
function charCount(s: string): number {
  return normalizeForCount(s).length;
}

// Estimativa simples de tokens (chars/4 ≈ tokens)
function estimateTokens(s: string): number {
  return Math.ceil(charCount(s) / 4);
}

export async function POST(request: NextRequest) {
  try {
    const { 
      systemPrompt, 
      userPrompt, 
      model = "gemini-2.0-flash-exp", 
      maxTokens = 2000, 
      temperature = 0.1 
    } = await request.json();

    // Validar environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada no servidor" },
        { status: 500 }
      );
    }

    // Estimar tokens antes de chamar API
    const totalText = `${systemPrompt}\n${userPrompt}`;
    const estimatedTokens = estimateTokens(totalText);
    
    if (estimatedTokens > 8000) {
      return NextResponse.json(
        { 
          error: "Texto muito longo. Estimativa de tokens excede o limite seguro.",
          estimatedTokens,
          maxRecommendedTokens: 8000
        },
        { status: 400 }
      );
    }

    // Combinar system e user prompt para Gemini (formato diferente)
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

    // Fazer chamada à Google Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          { 
            parts: [{ 
              text: combinedPrompt 
            }] 
          }
        ],
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: maxTokens,
          candidateCount: 1,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      
      // Tratar rate limit
      if (response.status === 429) {
        return NextResponse.json(
          { 
            error: "Rate limit excedido. Tente novamente em alguns segundos.",
            retryAfter: response.headers.get('retry-after') || '60'
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: `Erro na API Gemini: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Extrair texto da resposta Gemini
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Normalizar resultado
    const normalizedText = normalizeForCount(text);
    const finalCharCount = charCount(normalizedText);

    return NextResponse.json({ 
      text: normalizedText,
      charCount: finalCharCount,
      estimatedTokens,
      model,
      usage: data?.usageMetadata || {}
    });

  } catch (error) {
    const err = error as Error;
    console.error("Server error:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// Método OPTIONS para CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
