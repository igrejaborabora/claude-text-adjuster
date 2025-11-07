'use client';

import React, { useState } from 'react';
import { Copy, Download, RefreshCw, CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function GeminiTextAdjuster() {
  const [originalText, setOriginalText] = useState('');
  const [targetChars, setTargetChars] = useState(100);
  const [adjustedText, setAdjustedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [iterations, setIterations] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Normalização para contagem (NFC + \n)
  const normalizeForCount = (s: string): string => {
    let t = s.normalize("NFC");
    t = t.replace(/\r\n/g, "\n");
    return t;
  };

  // Contagem precisa de caracteres
  const charCount = (s: string): number => {
    return normalizeForCount(s).length;
  };

  // Estimativa de tokens (chars/4 ≈ tokens)
  const estimateTokens = (s: string): number => {
    return Math.ceil(charCount(s) / 4);
  };

  // Hard cap determinístico: garante que o texto nunca excede 'max' caracteres
  const hardCapToMax = (s: string, max: number): string => {
    const n = normalizeForCount(s);
    if (n.length <= max) return n;
    return n.slice(0, max);
  };

  // Copiar para clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(adjustedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Exportar como .txt
  const exportToTxt = () => {
    const blob = new Blob([adjustedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adjusted_text_${targetChars}chars.txt`;
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
        temperature: 0.3,
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
    setIterations(0);

    try {
      // Prompts otimizados para máxima precisão com Gemini
      const originalNorm = normalizeForCount(originalText);
      const originalCount = charCount(originalNorm);
      const diffNeeded = targetChars - originalCount;
      
      const systemPrompt = `És um editor profissional de excelência. Ajusta o texto para ${Math.round(targetChars * 0.98)} caracteres.

⚠️ LIMITE ABSOLUTO CRÍTICO: ${targetChars} caracteres (NUNCA EXCEDER)
✅ ALVO OBRIGATÓRIO: ${Math.round(targetChars * 0.98)} caracteres (98% do limite)

MÉTODO DE CONTAGEM (COMO NO WORD):
- LETRAS: A-Z, a-z, com acentos, ç, ñ, etc.
- ESPAÇOS: CADA espaço entre palavras = 1 caractere
- PONTUAÇÃO: . , ; : ! ? - cada uma = 1 caractere
- ASPAS: " " ' ' - cada uma = 1 caractere
- PARÊNTESES: ( ) [ ] { } - cada uma = 1 caractere
- TRAVESSÕES: — - - espaço ANTES e DEPOIS conta
- QUEBRAS DE LINHA: Cada \\n = 1 caractere
- NÚMEROS: 0-9 = 1 caractere cada
- SÍMBOLOS: @ # $ % & * + = / \\ < > ~ ^ \` | = 1 caractere

FAIXAS DE RESULTADO:
1. ✅✅✅ PERFEITO: ${Math.round(targetChars * 0.97)} a ${Math.round(targetChars * 0.98)} caracteres (97%-98%)
2. ✅✅ MUITO BOM: ${Math.round(targetChars * 0.95)} a ${Math.round(targetChars * 0.96)} caracteres (95%-96%)
3. ✅ BOM: ${Math.round(targetChars * 0.92)} a ${Math.round(targetChars * 0.94)} caracteres (92%-94%)
4. ⚠️ ACEITÁVEL: ${Math.round(targetChars * 0.90)} a ${Math.round(targetChars * 0.91)} caracteres (90%-91%)
5. ❌ MUITO CURTO: Menos de ${Math.round(targetChars * 0.85)} caracteres (<85%)
6. ❌ PROIBIDO: ${targetChars} ou mais caracteres (NUNCA!)

ESTRATÉGIA:
- ALVO PRINCIPAL: ${Math.round(targetChars * 0.98)} caracteres (98%)
- Se o texto original é MAIOR que ${targetChars}: REDUZ para ${Math.round(targetChars * 0.98)}
- Se o texto original é MENOR que ${targetChars}: EXPANDE para ${Math.round(targetChars * 0.98)}
- NUNCA tenta chegar a ${targetChars} - deixa buffer de segurança de 2% (${Math.round(targetChars * 0.02)} chars)
- IMPORTANTE: Conta os caracteres DURANTE a edição - objetivo é ${Math.round(targetChars * 0.98)}!
- MAXIMIZA INFORMAÇÃO: Usa o máximo de espaço disponível (98%), não sejas conservador!

QUALIDADE E FORMATO:
1. Mantém informações ESSENCIAIS
2. Preserva estrutura lógica
3. Evita repetições
4. Linguagem profissional
5. TEXTO CONTÍNUO: Sem parágrafos, sem quebras de linha
6. Sem "Gemini 2.5 Flash: preciso e rápido"
7. Output: APENAS o texto final

VALIDAÇÃO: Está entre ${Math.round(targetChars * 0.95)} e ${Math.round(targetChars * 0.98)} caracteres?`;

      const userPrompt = `TEXTO ORIGINAL (${originalCount} caracteres):
${originalNorm}

📊 CÁLCULO EXATO:
- Original: ${originalCount} caracteres
- Limite máximo: ${targetChars} caracteres  
- Alvo obrigatório: ${Math.round(targetChars * 0.98)} caracteres (98%)
- ${originalCount > targetChars ? 
    `Cortar APENAS: ${originalCount - Math.round(targetChars * 0.98)} caracteres (não ${originalCount - Math.round(targetChars * 0.60)}!)` : 
    `Adicionar: ${Math.round(targetChars * 0.98) - originalCount} caracteres`}

⚠️ ATENÇÃO CRÍTICA: ${originalCount > targetChars ? 
  `NÃO CORTES DEMAIS! Corta apenas ${originalCount - Math.round(targetChars * 0.98)} caracteres!
  - Se cortares ${originalCount - Math.round(targetChars * 0.60)} = ERRO! Muito curto!
  - Resultado OBRIGATÓRIO: ${Math.round(targetChars * 0.98)} caracteres (não ${Math.round(targetChars * 0.60)}!)` :
  `Adiciona ${Math.round(targetChars * 0.98) - originalCount} caracteres até ${Math.round(targetChars * 0.98)}!`}

ESTRATÉGIA ESPECÍFICA:
${originalCount > targetChars ? 
  `✅ REDUZIR de ${originalCount} para ${Math.round(targetChars * 0.98)} caracteres:
  
  PASSO 1: Identifica O QUE CORTAR (total: ${originalCount - Math.round(targetChars * 0.98)} caracteres):
  - Frases secundárias menos importantes (~${Math.round((originalCount - Math.round(targetChars * 0.98)) * 0.5)} chars)
  - Detalhes redundantes (~${Math.round((originalCount - Math.round(targetChars * 0.98)) * 0.3)} chars)
  - Exemplos menos críticos (~${Math.round((originalCount - Math.round(targetChars * 0.98)) * 0.2)} chars)
  
  PASSO 2: O QUE MANTER (${Math.round(targetChars * 0.98)} caracteres = 98%):
  - TODA a informação principal e essencial
  - Estrutura e lógica do texto
  - Conceitos e dados críticos
  - 98% do conteúdo, não 60%!
  
  ⚠️ VALIDAÇÃO: Depois de cortar, CONTA os caracteres:
  - Deve ter ${Math.round(targetChars * 0.98)} caracteres
  - Se tiver ${Math.round(targetChars * 0.60)}: ERRO! Cortaste demais!
  - Se tiver ${targetChars + 1}: ERRO! Excedeu limite!` : 
  `✅ EXPANDIR de ${originalCount} para ${Math.round(targetChars * 0.98)} caracteres:
  - Adiciona ${Math.round(targetChars * 0.98) - originalCount} caracteres de detalhes relevantes
  - Para ao atingir ${Math.round(targetChars * 0.98)} - não exagera!`
}

FORMATO FINAL:
1. TEXTO CONTÍNUO: Sem quebras de linha
2. Linguagem profissional
3. Mantém estrutura lógica
4. NUNCA adiciona "Gemini 2.5 Flash"
5. Output: APENAS o texto editado

OBJETIVO OBRIGATÓRIO: ${Math.round(targetChars * 0.98)} caracteres (98%), NUNCA ${targetChars}+ nem ${Math.round(targetChars * 0.60)}-!`;

      let result = await callAdjustAPI(systemPrompt, userPrompt);
      setIterations(1);

      // Loop de ajuste fino - corta agressivamente se exceder
      for (let i = 2; i <= 4; i++) {
        const resultNorm = normalizeForCount(result);
        const resultCount = charCount(resultNorm);
        const diff = resultCount - targetChars;
        const percentDiff = (diff / targetChars) * 100;
        
        // Se excedeu o limite: CORTAR IMEDIATAMENTE
        if (diff > 0) {
          const fineSystem = `EMERGÊNCIA - TEXTO EXCEDEU O LIMITE

❌❌❌ PROBLEMA CRÍTICO: Texto tem ${resultCount} caracteres mas limite é ${targetChars}!
❌ EXCEDEU EM: ${diff} caracteres (${Math.abs(percentDiff).toFixed(1)}% acima)

AÇÃO IMEDIATA OBRIGATÓRIA:
- CORTAR APENAS ${resultCount - Math.round(targetChars * 0.98)} caracteres para chegar a ${Math.round(targetChars * 0.98)}
- Alvo de corte: ${Math.round(targetChars * 0.98)} caracteres (98% - margem de 2%)
- Remove frases finais, detalhes secundários, exemplos menos importantes
- NUNCA pode ficar com mais de ${targetChars - 1} caracteres

MÉTODO DE CORTE:
1. Identifica frases/palavras menos essenciais no final
2. Remove APENAS ${resultCount - Math.round(targetChars * 0.98)} caracteres
3. Resultado: ${Math.round(targetChars * 0.98)} caracteres
4. TEXTO CONTÍNUO sem quebras
5. Verifica: está em ${Math.round(targetChars * 0.98)} caracteres?`;

          const fineUser = `TEXTO QUE EXCEDEU (${resultCount} chars):
${resultNorm}

❌ EXCEDEU EM: ${diff} caracteres
❌ LIMITE: ${targetChars} caracteres
✅ ALVO DE CORTE: ${Math.round(targetChars * 0.98)} caracteres (98%)

CORTA APENAS ${resultCount - Math.round(targetChars * 0.98)} caracteres até ficar com ${Math.round(targetChars * 0.98)}:
- Frases finais menos importantes
- Detalhes secundários
- Exemplos redundantes
- Mantém informação essencial

DEVOLVE texto com ${Math.round(targetChars * 0.98)} caracteres (não ${Math.round(targetChars * 0.60)}!)!`;

          const fineResponse = await fetch('/api/adjust', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              model: 'gemini-2.0-flash-exp',
              maxTokens: 1800,
              temperature: 0.3,
              systemPrompt: fineSystem,
              userPrompt: fineUser
            })
          });

          if (!fineResponse.ok) break;
          const fineData = await fineResponse.json();
          result = normalizeForCount(fineData.text || result);
          setIterations(i);
          continue;
        }

        // Se estiver dentro da tolerância [-3%, -1%] (97%-99%) aceitar
        if (percentDiff >= -3 && percentDiff <= -1) break;

        // Se estiver muito curto (< -3%), expandir até 98%
        if (percentDiff < -3) {
          const target98 = Math.round(targetChars * 0.98);
          const charsNeeded = target98 - resultCount;
          if (charsNeeded <= 0) break;

          const fineSystem = `EMERGÊNCIA - TEXTO MUITO CURTO

Texto atual: ${resultCount} caracteres (${(resultCount / targetChars * 100).toFixed(1)}% do limite)
FALTAM: ${charsNeeded} caracteres para atingir ${target98} (98%)

AÇÃO IMEDIATA:
- ADICIONAR ${charsNeeded} caracteres RELEVANTES agora
- Objetivo final obrigatório: ${target98} caracteres (98%)
- NUNCA ultrapassar ${targetChars - 1}

COMO EXPANDIR:
1. Reintroduz detalhes essenciais removidos
2. Acrescenta contexto, benefícios, métricas, exemplos concretos
3. Mantém coerência e fluxo lógico
4. Evita repetições e encheção
5. Texto contínuo, sem quebras de linha
6. Após expandir, confere: ficou entre ${Math.round(targetChars * 0.97)} e ${target98}?`;

          const fineUser = `TEXTO MUITO CURTO (${resultCount} caracteres):
${resultNorm}

PRECISA ADICIONAR: ${charsNeeded} caracteres
ALVO FINAL: ${target98} caracteres (98%)

ADICIONA informação relevante:
- Detalhes estratégicos
- Resultados esperados
- Benefícios, impactos, métricas
- Contexto adicional e conclusões

DEVOLVE texto com ${target98} caracteres (aceitável: ${Math.round(targetChars * 0.97)}-${target98}), SEM ultrapassar ${targetChars - 1}.`;

          const fineResponse = await fetch('/api/adjust', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              model: 'gemini-2.0-flash-exp',
              maxTokens: 1800,
              temperature: 0.3,
              systemPrompt: fineSystem,
              userPrompt: fineUser
            })
          });

          if (!fineResponse.ok) break;
          const fineData = await fineResponse.json();
          result = normalizeForCount(fineData.text || result);
          setIterations(i);
          continue;
        }

        // Caso contrário, interrompe para evitar loops infinitos
        break;
      }

      let finalResult = normalizeForCount(result);
      finalResult = hardCapToMax(finalResult, targetChars);
      setAdjustedText(finalResult);

    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao processar o texto');
    } finally {
      setIsProcessing(false);
    }
  };

  // Status de precisão (tolerância -5% a 0%)
  const getStatus = () => {
    if (!adjustedText) return null;
    const actual = charCount(adjustedText);
    const diff = actual - targetChars;
    const percentDiff = (diff / targetChars) * 100;
    
    if (diff === 0) return { type: 'perfect', text: '🎯 EXATO', color: 'text-green-600' };
    if (percentDiff >= -5 && diff < 0) return { type: 'excellent', text: '✅ Aceitável', color: 'text-blue-600' };
    if (percentDiff >= -10 && diff < -5) return { type: 'good', text: '⚠️ Um pouco curto', color: 'text-yellow-600' };
    if (diff > 0) return { type: 'warning', text: '🚨 Excedeu limite', color: 'text-red-600' };
    return { type: 'warning', text: '❌ Muito curto', color: 'text-red-600' };
  };

  const status = getStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Gemini Text Adjuster
          </h1>
          <p className="text-gray-600 text-lg">
            Ajuste preciso de caracteres com Google Gemini
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Texto Original</h2>
              <div className="text-sm text-gray-500">
                {charCount(originalText)} caracteres
              </div>
            </div>
            
            <textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              className="w-full h-64 p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Cole ou digite seu texto aqui..."
            />

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alvo de caracteres
                </label>
                <input
                  type="number"
                  value={targetChars}
                  onChange={(e) => setTargetChars(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  min="10"
                  max="10000"
                />
              </div>

              <button
                onClick={adjustText}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Ajustando... ({iterations}/4)
                  </>
                ) : (
                  'Ajustar Texto'
                )}
              </button>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Result Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Texto Ajustado</h2>
              <div className="flex items-center gap-3">
                {status && (
                  <div className={`flex items-center gap-1 text-sm font-medium ${status.color}`}>
                    {status.type === 'perfect' && <CheckCircle className="w-4 h-4" />}
                    {status.type === 'excellent' && <CheckCircle className="w-4 h-4" />}
                    {status.type === 'good' && <Info className="w-4 h-4" />}
                    {status.type === 'warning' && <AlertCircle className="w-4 h-4" />}
                    {status.text}
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  {adjustedText ? charCount(adjustedText) : 0} caracteres
                </div>
              </div>
            </div>

            <textarea
              value={adjustedText}
              readOnly
              className="w-full h-64 p-4 border-2 border-gray-200 rounded-lg bg-gray-50 resize-none"
              placeholder="O texto ajustado aparecerá aqui..."
            />

            {adjustedText && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
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
                  onClick={exportToTxt}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar .txt
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Como Funciona</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <strong>Contagem Word:</strong> TUDO conta (letras, espaços, pontuação, quebras)
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <strong>Tolerância:</strong> -5% a 0% (aceitável: {Math.round(targetChars * 0.95)}-{targetChars} chars)
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <strong>Validação:</strong> Como no Word "caracteres (incl. espaços)"
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
