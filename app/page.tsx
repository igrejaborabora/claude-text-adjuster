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
      
      const systemPrompt = `És um editor profissional de excelência. Ajusta o texto para O MAIS PERTO POSSÍVEL de ${targetChars} caracteres.

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

OBJETIVO PRIORITÁRIO - MAXIMIZAR CARACTERES:
1. ALVO IDEAL: ${targetChars} caracteres (100% do objetivo)
2. MÍNIMO ACEITÁVEL: ${Math.round(targetChars * 0.95)} caracteres (95% - só se inevitável)
3. NUNCA exceder ${targetChars} caracteres (limite máximo absoluto)
4. PRIORIDADE: Chegar O MAIS PERTO POSSÍVEL de ${targetChars} (ideal: ${targetChars - 5} a ${targetChars})

ESTRATÉGIA PARA ATINGIR O ALVO:
- Se faltar caracteres: Adiciona detalhes relevantes, contexto, exemplos, dados complementares
- Se sobrar muito: Remove apenas redundâncias óbvias, mantém máximo de informação
- Prefere SEMPRE estar entre ${targetChars - 10} e ${targetChars} caracteres
- Evita ser muito conservador - usa todo o espaço disponível

QUALIDADE E FORMATO:
1. Mantém 100% do sentido e informações ESSENCIAIS
2. Preserva a estrutura lógica e fluxo narrativo
3. Evita repetições e redundâncias
4. Linguagem profissional e clara
5. TEXTO CONTÍNUO: Sem parágrafos, sem quebras de linha, tudo em um único bloco
6. Sem trim(), sem "...", sem "###", sem aspas, sem "Gemini 2.5 Flash: preciso e rápido"
7. Output: APENAS o texto final contínuo, sem explicações

VALIDAÇÃO: Depois de escrever, conta MANUALMENTE: está entre ${Math.round(targetChars * 0.95)} e ${targetChars} caracteres? Prioriza estar próximo de ${targetChars}!`;

      const userPrompt = `TEXTO ORIGINAL (${originalCount} caracteres):
${originalNorm}

ANÁLISE DA CONTAGEM ATUAL:
- Letras: ${originalNorm.replace(/[^a-zA-Zà-ÿ]/g, '').length}
- Espaços: ${originalNorm.split(' ').length - 1}
- Quebras de linha: ${originalNorm.split('\n').length - 1}
- Outros: ${originalCount - originalNorm.replace(/[^a-zA-Zà-ÿ]/g, '').length - (originalNorm.split(' ').length - 1) - (originalNorm.split('\n').length - 1)}

AJUSTE NECESSÁRIO: ${diffNeeded > 0 ? '+' : ''}${diffNeeded} caracteres
ALVO IDEAL: ${targetChars} caracteres (100%)
FAIXA PREFERENCIAL: ${targetChars - 10} a ${targetChars} caracteres (99%-100%)
MÍNIMO ACEITÁVEL: ${Math.round(targetChars * 0.95)} caracteres (95%)
LIMITE MÁXIMO: ${targetChars} caracteres (NUNCA EXCEDER)

EDIT PROFISSIONAL - MAXIMIZAR CARACTERES:
${diffNeeded > 0 ? 
  `✅ PRECISA EXPANDIR: Adicionar ${diffNeeded} caracteres (${Math.abs(diffNeeded / targetChars * 100).toFixed(1)}%)
  - Adiciona detalhes relevantes, contexto, exemplos concretos
  - Expande conceitos importantes com informações complementares
  - Usa todo o espaço disponível sem ser repetitivo
  - OBJETIVO: Chegar o mais perto possível de ${targetChars} caracteres` : 
  diffNeeded < -Math.round(targetChars * 0.05) ?
    `✅ PRECISA REDUZIR: Remover ${Math.abs(diffNeeded)} caracteres (texto muito curto)
    - Remove apenas redundâncias óbvias
    - Mantém máximo de informação possível
    - OBJETIVO: Ficar entre ${Math.round(targetChars * 0.95)} e ${targetChars} caracteres` :
    `✅ DENTRO DA TOLERÂNCIA: Texto está em faixa aceitável
    - Ajuste fino para aproximar de ${targetChars} caracteres
    - Maximiza uso do espaço disponível`
}

MÉTODO DE EDIÇÃO - PRIORIDADE MÁXIMA:
1. Preservar INFORMAÇÕES ESSENCIAIS e dados críticos
2. Manter estrutura lógica e fluxo narrativo
3. Evitar repetições e frases redundantes
4. Linguagem profissional e coerente
5. Contar TUDO: letras, espaços, pontuação, quebras, símbolos
6. NUNCA exceder ${targetChars} caracteres
7. TEXTO CONTÍNUO OBRIGATÓRIO: Remover todas as quebras de linha, juntar tudo em um único parágrafo
8. NUNCA adicionar "Gemini 2.5 Flash: preciso e rápido" ou qualquer texto extra
9. MAXIMIZAR: Usar todo o espaço disponível - objetivo é ${targetChars}, não ${Math.round(targetChars * 0.95)}!
10. Verificar: está entre ${targetChars - 10} e ${targetChars} caracteres? (faixa ideal)

Devolve APENAS o texto editado contínuo (sem quebras de linha) O MAIS PRÓXIMO POSSÍVEL de ${targetChars} caracteres com qualidade profissional.`;

      let result = await callAdjustAPI(systemPrompt, userPrompt);
      setIterations(1);

      // Loop de ajuste fino com tolerância -5% a 0%
      for (let i = 2; i <= 4; i++) {
        const resultNorm = normalizeForCount(result);
        const resultCount = charCount(resultNorm);
        const diff = resultCount - targetChars;
        const percentDiff = (diff / targetChars) * 100;
        
        // Parar se estiver dentro da tolerância [-5%, 0%]
        if (percentDiff >= -5 && percentDiff <= 0) break;

        const fineSystem = `AJUSTE FINO - MAXIMIZAR CARACTERES

SITUAÇÃO ATUAL: Texto tem ${resultCount} caracteres (${(resultCount / targetChars * 100).toFixed(1)}% do alvo)
ALVO: ${targetChars} caracteres (100%)
FAIXA IDEAL: ${targetChars - 10} a ${targetChars} caracteres (99%-100%)
DIFERENÇA: ${diff > 0 ? `EXCEDEU em ${diff}` : `FALTAM ${Math.abs(diff)}`}

OBJETIVO PRIORITÁRIO:
- IDEAL: ${targetChars} caracteres (100% do objetivo)
- MUITO BOM: ${targetChars - 5} a ${targetChars} caracteres (99.5%-100%)
- ACEITÁVEL: ${Math.round(targetChars * 0.95)} a ${targetChars - 6} caracteres (95%-99.4%)
- EVITAR: Menos de ${Math.round(targetChars * 0.95)} caracteres (<95%)

EDIÇÃO DE QUALIDADE - MAXIMIZAÇÃO:
- Preservar INFORMAÇÕES ESSENCIAIS e dados críticos
- Manter estrutura lógica e fluxo narrativo 
- Evitar repetições e frases redundantes
- Linguagem profissional e coerente
- Contar TUDO: letras, espaços, pontuação, quebras, símbolos
- TEXTO CONTÍNUO OBRIGATÓRIO: Sem parágrafos, sem quebras de linha
- NUNCA adicionar "Gemini 2.5 Flash: preciso e rápido"
- USA TODO O ESPAÇO DISPONÍVEL - não sejas conservador!

CORREÇÃO NECESSÁRIA:
${diff > 0 ? 
  `❌ REDUZIR ${diff} caracteres: texto excedeu o limite máximo - corta palavras extras` : 
  percentDiff < -5 ? 
    `⚠️ AUMENTAR ${Math.abs(diff)} caracteres: texto está em ${(resultCount / targetChars * 100).toFixed(1)}%
    - Adiciona detalhes, contexto, exemplos relevantes
    - Expande informações importantes
    - USA TODO O ESPAÇO até ${targetChars} caracteres
    - Objetivo: ${targetChars} caracteres (100%), não ${Math.round(targetChars * 0.95)} (95%)` :
    diff < -10 ?
      `✅ PRÓXIMO: Faltam apenas ${Math.abs(diff)} caracteres para ${targetChars}
      - Adiciona detalhes finais para maximizar
      - Objetivo: ${targetChars} caracteres exatos` :
      `✅ EXCELENTE: Está em ${(resultCount / targetChars * 100).toFixed(1)}% do alvo
      - Ajuste mínimo se necessário
      - Mantém perto de ${targetChars} caracteres`
}

OBJETIVO: Chegar O MAIS PRÓXIMO POSSÍVEL de ${targetChars} caracteres (ideal: ${targetChars - 5} a ${targetChars}).`;

        const fineUser = `TEXTO ATUAL (PRECISA MAXIMIZAR):
${resultNorm}

ANÁLISE ATUAL:
- CONTAGEM: ${resultCount} caracteres (${(resultCount / targetChars * 100).toFixed(1)}% do alvo)
- ALVO: ${targetChars} caracteres (100%)
- FALTAM: ${Math.abs(diff)} caracteres para atingir o alvo
- SITUAÇÃO: ${diff > 0 ? `⚠️ EXCEDEU limite em ${diff} caracteres - PRECISA REDUZIR` : 
           percentDiff < -10 ? `⚠️ MUITO ABAIXO: Está em ${(resultCount / targetChars * 100).toFixed(1)}% - PRECISA MAXIMIZAR` :
           percentDiff < -5 ? `⚠️ ABAIXO: Está em ${(resultCount / targetChars * 100).toFixed(1)}% - ADICIONA MAIS ${Math.abs(diff)} CARACTERES` :
           diff < -5 ? `✅ PRÓXIMO: Faltam ${Math.abs(diff)} caracteres para perfeição` :
           `✅ EXCELENTE: Está em ${(resultCount / targetChars * 100).toFixed(1)}% do alvo`}

AÇÃO NECESSÁRIA:
${diff > 0 ? 
  `❌ REDUZIR ${diff} caracteres: Corta palavras extras sem perder sentido` : 
  percentDiff < -10 ?
    `⚠️ AUMENTAR ${Math.abs(diff)} caracteres: MAXIMIZA O TEXTO
    - Adiciona contexto, detalhes, exemplos concretos
    - Expande conceitos importantes
    - USA TODO O ESPAÇO até ${targetChars} caracteres
    - NÃO SEJAS CONSERVADOR - o objetivo é ${targetChars}, não ${Math.round(targetChars * 0.95)}!` :
    percentDiff < -5 ?
      `⚠️ AUMENTAR ${Math.abs(diff)} caracteres para atingir ${targetChars}
      - Adiciona detalhes relevantes e informações complementares
      - Objetivo: Aproximar de 100% (${targetChars} caracteres)` :
      `✅ AJUSTE FINO: Adiciona ${Math.abs(diff)} caracteres finais para maximizar`
}

INSTRUÇÕES FINAIS:
- Preserva informações essenciais e dados críticos
- Mantém estrutura lógica e fluxo narrativo
- Evita repetições e frases redundantes
- Linguagem profissional e coerente
- TEXTO CONTÍNUO: Sem quebras de linha
- NUNCA adiciona "Gemini 2.5 Flash: preciso e rápido"
- MAXIMIZA: Objetivo é ${targetChars} caracteres, não menos!

OBJETIVO: Ajustar para O MAIS PRÓXIMO POSSÍVEL de ${targetChars} caracteres (ideal: ${targetChars - 5} a ${targetChars}).`;

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
      }

      const finalResult = normalizeForCount(result);
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
