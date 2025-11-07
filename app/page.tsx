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
      
      const systemPrompt = `És um editor profissional de excelência. Ajusta o texto para ${Math.round(targetChars * 0.97)} caracteres.

⚠️ LIMITE ABSOLUTO CRÍTICO: ${targetChars} caracteres
❌ SE PASSAR DE ${targetChars} = REJEITADO TOTALMENTE
✅ ALVO INTERNO SEGURO: ${Math.round(targetChars * 0.97)} caracteres (buffer de 3%)

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

FAIXAS DE SEGURANÇA:
1. ✅✅✅ IDEAL: ${Math.round(targetChars * 0.95)} a ${Math.round(targetChars * 0.97)} caracteres (95%-97%)
2. ✅✅ BOM: ${Math.round(targetChars * 0.93)} a ${Math.round(targetChars * 0.94)} caracteres (93%-94%)
3. ✅ ACEITÁVEL: ${Math.round(targetChars * 0.90)} a ${Math.round(targetChars * 0.92)} caracteres (90%-92%)
4. ⚠️ EVITAR: ${Math.round(targetChars * 0.98)} a ${targetChars - 1} caracteres (98%-99.9% - risco de ultrapassar)
5. ❌❌❌ PROIBIDO: ${targetChars} ou mais caracteres (NUNCA!)

ESTRATÉGIA CONSERVADORA:
- ALVO PRINCIPAL: ${Math.round(targetChars * 0.97)} caracteres (${targetChars} * 0.97)
- NUNCA tentes chegar a ${targetChars} - é perigoso
- Se estiver perto de ${Math.round(targetChars * 0.97)}: PARA de adicionar
- É MUITO MELHOR ter ${Math.round(targetChars * 0.95)} que arriscar passar de ${targetChars}
- Buffer de segurança de 3% para evitar ultrapassar

QUALIDADE E FORMATO:
1. Mantém informações ESSENCIAIS (mas não todas se necessário)
2. Preserva estrutura lógica
3. Evita repetições
4. Linguagem profissional
5. TEXTO CONTÍNUO: Sem parágrafos, sem quebras de linha
6. Sem "Gemini 2.5 Flash: preciso e rápido"
7. Output: APENAS o texto final

VALIDAÇÃO: Está entre ${Math.round(targetChars * 0.90)} e ${Math.round(targetChars * 0.97)} caracteres? NUNCA mais de ${targetChars - 1}!`;

      const userPrompt = `TEXTO ORIGINAL (${originalCount} caracteres):
${originalNorm}

❌ LIMITE ABSOLUTO: ${targetChars} caracteres (NUNCA EXCEDER)
✅ ALVO SEGURO: ${Math.round(targetChars * 0.97)} caracteres (97% do limite)
✅ FAIXA IDEAL: ${Math.round(targetChars * 0.95)} a ${Math.round(targetChars * 0.97)} caracteres

AJUSTE NECESSÁRIO: ${diffNeeded > 0 ? '+' : ''}${Math.round(diffNeeded * 0.97)} caracteres (para atingir 97%)
NUNCA adicionar até ${targetChars} - PERIGO de ultrapassar!

ESTRATÉGIA CONSERVADORA:
${diffNeeded > 0 ? 
  `✅ EXPANDIR COM CUIDADO: Adicionar até ${Math.round(targetChars * 0.97)} caracteres
  - NÃO tentes chegar a ${targetChars} - MUITO PERIGOSO
  - PARA ao atingir ${Math.round(targetChars * 0.97)} caracteres
  - É melhor ${Math.round(targetChars * 0.95)} que arriscar ultrapassar
  - Adiciona detalhes relevantes mas SEM EXAGERAR` : 
  diffNeeded < -Math.round(targetChars * 0.10) ?
    `✅ REDUZIR: Remover para ficar em ${Math.round(targetChars * 0.95)} caracteres
    - Remove redundâncias mantendo essencial` :
    `✅ AJUSTE MÍNIMO: Já está próximo da faixa ideal`
}

MÉTODO DE EDIÇÃO CONSERVADOR:
1. Preserva informações ESSENCIAIS (prioridade máxima)
2. Mantém estrutura lógica
3. Evita repetições
4. Linguagem profissional
5. TEXTO CONTÍNUO: Sem quebras de linha
6. NUNCA adiciona "Gemini 2.5 Flash"
7. PARA ao atingir ${Math.round(targetChars * 0.97)} - NÃO continua!

OBJETIVO: Texto com ${Math.round(targetChars * 0.97)} caracteres (97%), NUNCA mais de ${targetChars - 1}.`;

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
- CORTAR ${diff} caracteres AGORA
- Alvo de corte: ${Math.round(targetChars * 0.97)} caracteres (97% - margem segura)
- Remove frases finais, detalhes secundários, exemplos menos importantes
- NUNCA pode ficar com mais de ${targetChars - 1} caracteres

MÉTODO DE CORTE:
1. Identifica frases/palavras menos essenciais no final
2. Remove até atingir ${Math.round(targetChars * 0.97)} caracteres
3. Mantém coerência e sentido principal
4. TEXTO CONTÍNUO sem quebras
5. Verifica: está em ${Math.round(targetChars * 0.97)} caracteres?`;

          const fineUser = `TEXTO QUE EXCEDEU (${resultCount} chars):
${resultNorm}

❌ EXCEDEU EM: ${diff} caracteres
❌ LIMITE: ${targetChars} caracteres
✅ ALVO DE CORTE: ${Math.round(targetChars * 0.97)} caracteres

CORTA ${diff} caracteres removendo:
- Frases finais menos importantes
- Detalhes secundários
- Exemplos redundantes
- Mantém informação essencial

DEVOLVE texto cortado com ${Math.round(targetChars * 0.97)} caracteres!`;

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
        
        // Parar se estiver dentro da tolerância [-5%, -3%]
        if (percentDiff >= -5 && percentDiff <= -3) break;

        // Se está abaixo de -5%, não fazer mais nada (aceitar como está)
        break;
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
