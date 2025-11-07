'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Download, Loader2, Target, TrendingUp } from 'lucide-react';

// Funções de utilidade para contagem e normalização
function normalizeForCount(s: string): string {
  let t = s.normalize("NFC");
  t = t.replace(/\r\n/g, "\n");
  return t;
}

function charCount(s: string): number {
  return normalizeForCount(s).length;
}

function estimateTokens(s: string): number {
  return Math.ceil(charCount(s) / 4);
}

export default function GeminiTextAdjuster() {
  const [originalText, setOriginalText] = useState('');
  const [targetChars, setTargetChars] = useState(500);
  const [adjustedText, setAdjustedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentCount, setCurrentCount] = useState(0);
  const [adjustedCount, setAdjustedCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'perfect' | 'excellent' | 'good' | 'warning'>('idle');
  const [iterations, setIterations] = useState(0);
  const [error, setError] = useState('');

  // Atualizar contagem do texto original
  useEffect(() => {
    setCurrentCount(charCount(originalText));
  }, [originalText]);

  // Atualizar contagem do texto ajustado
  useEffect(() => {
    setAdjustedCount(charCount(adjustedText));
  }, [adjustedText]);

  // Determinar status baseado na precisão
  useEffect(() => {
    if (adjustedText) {
      const diff = Math.abs(targetChars - adjustedCount);
      if (diff <= 2) setStatus('perfect');
      else if (diff <= 5) setStatus('excellent');
      else if (diff <= 10) setStatus('good');
      else setStatus('warning');
    }
  }, [adjustedCount, targetChars, adjustedText]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(adjustedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadAsTxt = () => {
    const blob = new Blob([adjustedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adjusted-text-${targetChars}chars.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const callAdjustAPI = async (systemPrompt: string, userPrompt: string): Promise<string> => {
    const response = await fetch('/api/adjust', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.0-flash-exp',
        maxTokens: 1800,
        temperature: 0.1,
        systemPrompt,
        userPrompt
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro na API');
    }

    const data = await response.json();
    return data.text || '';
  };

  const adjustText = async () => {
    if (!originalText.trim()) {
      setError('Por favor, insira um texto para ajustar');
      return;
    }

    if (targetChars < 10 || targetChars > 10000) {
      setError('O alvo deve estar entre 10 e 10000 caracteres');
      return;
    }

    setIsProcessing(true);
    setError('');
    setStatus('processing');
    setIterations(0);

    try {
      // Prompt inicial otimizado para Gemini 2.5 Flash
      const systemPrompt = `
Você é um editor extremamente preciso. Reescreva o texto para ter EXATAMENTE ${targetChars} caracteres, contado como em JavaScript após normalização NFC e com '\\n' como quebra de linha. Não adicione cabeçalhos, aspas, nem comentários. Não altere o significado.
Conta: cada letra/espaço/pontuação/quebra de linha = 1.
Não use caracteres invisíveis/zero-width para ajustar.
Se não conseguir ficar EXATO, fique entre −2 e +2 caracteres e otimize na próxima iteração.
Seja conciso e direto. Gemini 2.5 Flash é rápido e preciso.
`;

      const userPrompt = `
TEXTO ORIGINAL:
${normalizeForCount(originalText)}

REGRAS:
- Mantenha o sentido essencial
- Evite redundâncias (se condensar)
- Use exemplos/expansões leves (se expandir)
- Não introduza "...", "###", nem aspas
- Seja direto ao ponto

ALVO: ${targetChars} caracteres.
Devolve APENAS o texto final ajustado.
`;

      let result = await callAdjustAPI(systemPrompt, userPrompt);
      setIterations(1);

      // Loop de ajuste fino otimizado para Gemini
      for (let i = 0; i < 4; i++) {
        const diffNow = targetChars - charCount(result);
        
        if (Math.abs(diffNow) <= 2) break;

        const fineSystem = `
Ajuste o texto para ${targetChars} caracteres (NFC + \\n).
Diferença atual: ${diffNow > 0 ? `ADICIONAR ${diffNow}` : `REMOVER ${Math.abs(diffNow)}`}.
Não altere o sentido. Não use caracteres invisíveis. Devolva apenas o texto ajustado.
Gemini 2.5 Flash: preciso e rápido.
`;

        const fineUser = result;

        const fineResponse = await fetch('/api/adjust', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            model: 'gemini-2.0-flash-exp',
            maxTokens: 1800,
            temperature: 0.1,
            systemPrompt: fineSystem,
            userPrompt: fineUser
          })
        });

        if (!fineResponse.ok) break;

        const fineData = await fineResponse.json();
        result = normalizeForCount(fineData.text || result);
        setIterations((prev: number) => prev + 1);
      }

      setAdjustedText(result);

    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao processar o texto');
      setStatus('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'perfect': return 'text-green-600 bg-green-50 border-green-200';
      case 'excellent': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'good': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'warning': return 'text-red-600 bg-red-50 border-red-200';
      case 'processing': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'perfect': return '🎯 Perfeito';
      case 'excellent': return '✅ Excelente';
      case 'good': return '👍 Bom';
      case 'warning': return '⚠️ Precisa ajuste';
      case 'processing': return '🔄 Processando...';
      default: return '';
    }
  };

  const getDiffColor = () => {
    const diff = targetChars - adjustedCount;
    if (Math.abs(diff) <= 2) return 'text-green-600';
    if (Math.abs(diff) <= 5) return 'text-blue-600';
    if (Math.abs(diff) <= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gemini Text Adjuster
          </h1>
          <p className="text-gray-600">
            Ajuste preciso de caracteres com Google Gemini 2.5 Flash API - Grátis e Rápido
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Painel Esquerdo - Input */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Texto Original
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Caracteres atuais: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{currentCount}</span>
              </label>
              <div className="flex items-center gap-4 mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Alvo:
                </label>
                <input
                  type="number"
                  min="10"
                  max="10000"
                  value={targetChars}
                  onChange={(e) => setTargetChars(parseInt(e.target.value) || 500)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Target className="w-5 h-5 text-gray-400" />
              </div>
            </div>

            <textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              placeholder="Cole seu texto aqui..."
              className="w-full h-64 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
            />

            <button
              onClick={adjustText}
              disabled={isProcessing || !originalText.trim()}
              className="w-full mt-4 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando...
                </>
              ) : (
                'AJUSTAR TEXTO'
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Painel Direito - Output */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Texto Ajustado
              </h2>
              {status !== 'idle' && (
                <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </div>
              )}
            </div>

            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Caracteres finais:
                </label>
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {adjustedCount}
                </span>
              </div>
              
              {adjustedText && (
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Diferença:
                  </label>
                  <span className={`font-mono px-2 py-1 rounded ${getDiffColor()}`}>
                    {targetChars - adjustedCount > 0 ? '+' : ''}{targetChars - adjustedCount}
                  </span>
                </div>
              )}

              {iterations > 0 && (
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Iterações:
                  </label>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                    {iterations}
                  </span>
                </div>
              )}
            </div>

            <textarea
              value={adjustedText}
              readOnly
              placeholder="O texto ajustado aparecerá aqui..."
              className="w-full h-64 p-3 border border-gray-300 rounded-md bg-gray-50 resize-none font-mono text-sm"
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={copyToClipboard}
                disabled={!adjustedText}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar
                  </>
                )}
              </button>
              
              <button
                onClick={downloadAsTxt}
                disabled={!adjustedText}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Informações de Processamento
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-50 p-3 rounded">
              <div className="font-medium text-gray-700">Tokens estimados</div>
              <div className="text-lg font-mono">
                {estimateTokens(originalText + adjustedText)}
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded">
              <div className="font-medium text-gray-700">Precisão</div>
              <div className="text-lg font-mono">
                {adjustedText ? `${Math.abs(targetChars - adjustedCount)} chars` : '-'}
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded">
              <div className="font-medium text-gray-700">Modelo</div>
              <div className="text-lg font-mono">Gemini 2.5 Flash</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}