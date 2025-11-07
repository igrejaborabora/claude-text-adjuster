'use client';

import React, { useState } from 'react';
import { Copy, Download, RefreshCw, CheckCircle, AlertCircle, Info, FileText, Globe } from 'lucide-react';
import InternationalPricingDashboard from '@/components/InternationalPricingDashboard';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'text-adjuster' | 'international-pricing'>('text-adjuster');
  
  // Text adjuster state
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

  // Converte para texto contínuo (sem quebras de linha). Não colapsa espaços e não trim para manter contagem fiel.
  const toContinuous = (s: string): string => {
    const n = normalizeForCount(s);
    return n.replace(/\n+/g, ' ');
  };

  // Hard cap "inteligente": corta no máximo 'max' e tenta finalizar em limite natural (pontuação/espaço)
  const hardCapToMax = (s: string, max: number): string => {
    const n = toContinuous(s);
    if (n.length <= max) return n;
    let slice = n.slice(0, max);
    const windowStart = Math.max(0, max - 40);
    const win = slice.slice(windowStart);
    const candidates = [
      win.lastIndexOf('.'),
      win.lastIndexOf('!'),
      win.lastIndexOf('?'),
      win.lastIndexOf(';'),
      win.lastIndexOf(':'),
      win.lastIndexOf(','),
      win.lastIndexOf('—'),
      win.lastIndexOf('-'),
      win.lastIndexOf(' ')
    ];
    const idx = Math.max(...candidates);
    if (idx !== -1) {
      return slice.slice(0, windowStart + idx + 1);
    }
    // Fallback: procurar último espaço em todo o slice
    const lastSpace = slice.lastIndexOf(' ');
    if (lastSpace !== -1) return slice.slice(0, lastSpace + 1);
    return slice;
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
        maxTokens: 4000,
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
      const lowerBound = Math.round(targetChars * 0.90); // Aumentado para 90%
      const upperBound = targetChars; // Limite estrito
      
      const systemPrompt = `És um editor profissional de excelência. Ajusta o texto para ficar EXATAMENTE com ${targetChars} caracteres, com tolerância MÍNIMA de ${lowerBound}-${targetChars}.

**REGRA CRÍTICA: NUNCA EXCEDER ${targetChars} CARACTERES**
- Se exceder ${targetChars}: resultado é INACEITÁVEL
- Se ficar abaixo de ${lowerBound}: resultado é POBRE
- Ideal: ${targetChars - 5} a ${targetChars} caracteres

MÉTODO DE CONTAGEM PRECISA:
- LETRAS (A-Z, a-z, com acentos): cada uma = 1 caractere
- ESPAÇOS: CADA espaço = 1 caractere
- PONTUAÇÃO (. , ; : ! ?): cada uma = 1 caractere
- NÚMEROS (0-9): cada um = 1 caractere
- QUEBRAS DE LINHA (\n): cada uma = 1 caractere

**ESTRATÉGIA SEM CORTAR PALAVRAS:**
1. Se precisar REDUZIR: reescreve frases para serem mais concisas
2. Se precisar EXPANDIR: adiciona detalhes relevantes
3. NUNCA cortar palavras no meio
4. NUNCA truncar texto brutalmente

**FORMATO OBRIGATÓRIO:**
- TEXTO CONTÍNUO (sem quebras de linha)
- APENAS o texto final (sem "Gemini" ou assinaturas)
- Contagem exata: ${targetChars} caracteres

**VALIDAÇÃO FINAL:**
Antes de responder, conta os caracteres:
1. Se exceder ${targetChars}: volta e reduz mais
2. Se estiver abaixo de ${lowerBound}: volta e expande
3. Só responde quando estiver na faixa ${lowerBound}-${targetChars}`;

      const userPrompt = `TEXTO ORIGINAL (${originalCount} caracteres):
${originalNorm}

**TAREFA ESPECÍFICA:**
- Alvo EXATO: ${targetChars} caracteres
- Faixa MÍNIMA aceitável: ${lowerBound}-${targetChars}
- **NUNCA EXCEDER ${targetChars}** (resultado inválido se exceder)

**INSTRUÇÕES CRÍTICAS:**
1. Conta caracteres CUIDADOSAMENTE antes de responder
2. Se exceder ${targetChars}: volta e reduz sem cortar palavras
3. Se estiver abaixo de ${lowerBound}: volta e expande com detalhes
4. Responde APENAS quando estiver na faixa ${lowerBound}-${targetChars}

**MÉTODO:**
${originalCount > targetChars ? 
  `✅ REDUZIR: Reescreve frases para serem mais concisas, mantendo essencial.
   - Remove redundâncias por reescrita (não por corte)
   - Condensa ideias sem perder significado
   - Para quando ficar entre ${lowerBound}-${targetChars}` :
  `✅ EXPANDIR: Adiciona detalhes concretos e relevantes.
   - Exemplos, dados, benefícios, contextos
   - Expande ideias existentes sem repetir
   - Para quando ficar entre ${lowerBound}-${targetChars}`
}

**OUTPUT:**
- Apenas o texto ajustado (contínuo, sem \\n)
- Exatamente ${targetChars} caracteres (ou na faixa ${lowerBound}-${targetChars})
- Sem assinaturas ou "Gemini"`;

      let result = await callAdjustAPI(systemPrompt, userPrompt);
      setIterations(1);

      // Loop de ajuste fino - mais iterações para convergir melhor
      for (let i = 2; i <= 8; i++) {
        const resultNorm = normalizeForCount(result);
        const resultCount = charCount(resultNorm);
        const diff = resultCount - targetChars;
        const percentDiff = (diff / targetChars) * 100;
        
        // VALIDAÇÃO CRÍTICA: Se excedeu o limite, aplicar HARD CAP imediatamente
        if (diff > 0) {
          console.log(`🚨 API excedeu limite em ${diff} chars. Aplicando hard cap...`);
          result = hardCapToMax(resultNorm, targetChars);
          setIterations(i);
          
          // Verificar se o hard cap funcionou
          const afterCapCount = charCount(result);
          if (afterCapCount <= targetChars) {
            console.log(`✅ Hard cap funcionou: ${afterCapCount} chars`);
            break; // Sair do loop se estiver dentro do limite
          }
          continue;
        }
        // Se excedeu o limite após hard cap (raro), tentar reescrever
        if (diff > 0) {
          const fineSystem = `AJUSTE FINO – TEXTO ACIMA DO LIMITE (SEM TRUNCAR PALAVRAS)

Situação: ${resultCount} > ${targetChars} (excedeu em ${diff} = ${Math.abs(percentDiff).toFixed(1)}%)
Objetivo: Reescrever/condensar até ficar ENTRE ${lowerBound} e ${targetChars}
Método: Reescreve frases para serem mais concisas. Não cortar palavras.
Formato: Texto contínuo, profissional, coerente.

**CRÍTICO: NUNCA EXCEDER ${targetChars} CARACTERES**`;

          const fineUser = `TEXTO ACIMA DO LIMITE (${resultCount} chars):
${resultNorm}

**TAREFA CRÍTICA:**
- Reduzir para ${targetChars} caracteres OU MENOS
- **NUNCA EXCEDER ${targetChars}**
- Reescrever frases (não cortar palavras)
- Manter informação essencial
- Resultado: texto contínuo`;

          const fineResponse = await fetch('/api/adjust', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              model: 'gemini-2.0-flash-exp',
              maxTokens: 4000,
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

        // Parar se dentro da tolerância [-10%, 0%] (aumentada)
        if (percentDiff >= -10 && diff <= 0) break;

        // Se estiver curto além da tolerância (< -10%), expandir até a faixa superior sem exceder
        if (percentDiff < -10) {
          const targetHigh = targetChars - 1; // preferir topo da faixa sem exceder
          const targetLow = lowerBound;
          const desired = Math.max(targetLow, targetHigh);
          const charsNeeded = desired - resultCount;
          if (charsNeeded <= 0) break;

          const fineSystem = `AJUSTE FINO – TEXTO ABAIXO DA FAIXA (EXPANSÃO URGENTE)

Texto atual: ${resultCount} caracteres (${(resultCount / targetChars * 100).toFixed(1)}% do alvo)
FALTAM: ${charsNeeded} caracteres para atingir ${desired}

**AÇÃO CRÍTICA:** ADICIONAR EXATAMENTE ${charsNeeded} caracteres
- Expande o ÚLTIMO parágrafo com detalhes CONCRETOS e ESPECÍFICOS
- Adiciona: exemplos, dados, benefícios, contextos, impactos
- Se ainda faltar, expande o penúltimo parágrafo
- Mantém coerência e fluxo lógico
- Evita repetições e clichês
- Formato contínuo (sem \\n)
- **OBRIGATÓRIO: Não exceder ${targetChars - 1}**

**EXEMPLOS DE CONTEÚDO PARA ADICIONAR:**
- Dados quantificáveis (números, percentagens)
- Benefícios específicos e mensuráveis
- Exemplos práticos e casos de uso
- Contexto de mercado ou setor
- Impactos esperados ou resultados
- Detalhes técnicos ou metodológicos`;

          const fineUser = `TEXTO ABAIXO DA FAIXA (${resultCount} caracteres):
${resultNorm}

**TAREFA URGENTE:**
- ADICIONAR EXATAMENTE: ${charsNeeded} caracteres (tolerância ±5)
- ALVO MÍNIMO: ${desired} caracteres
- **NUNCA EXCEDER ${targetChars} caracteres**

**CONTEÚDO PARA ADICIONAR:**
- Dados concretos e específicos
- Exemplos práticos e detalhados
- Benefícios mensuráveis
- Contexto de mercado/sector
- Impactos quantificáveis
- Detalhes técnicos/metodológicos

**REGRAS:**
- Expande parágrafos existentes (não cria novos)
- Mantém coerência e fluxo lógico
- Evita repetições e generalidades
- Texto contínuo (sem quebras de linha)
- **Resultado: texto expandido dentro da faixa ${lowerBound}-${targetChars}**`;

          const fineResponse = await fetch('/api/adjust', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              model: 'gemini-2.0-flash-exp',
              maxTokens: 3000, // Aumentado para expansão
              temperature: 0.4, // Aumentado para mais criatividade
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

      // VALIDAÇÃO FINAL: Garantir que nunca excede o limite
      let finalResult = hardCapToMax(result, targetChars);
      const finalCount = charCount(finalResult);
      
      // Se ainda estiver excedendo (muito raro), cortar brutalmente
      if (finalCount > targetChars) {
        console.log(`🚨 EMERGÊNCIA: Cortando ${finalCount - targetChars} caracteres excedentes`);
        finalResult = finalResult.slice(0, targetChars);
      }
      
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
    if (percentDiff >= -10 && diff < 0) return { type: 'excellent', text: '✅ Aceitável', color: 'text-blue-600' };
    if (percentDiff >= -15 && diff < -10) return { type: 'good', text: '⚠️ Um pouco curto', color: 'text-yellow-600' };
    if (diff > 0) return { type: 'warning', text: '🚨 Excedeu limite', color: 'text-red-600' };
    return { type: 'warning', text: '❌ Muito curto', color: 'text-red-600' };
  };

  const status = getStatus();

  const tabs = [
    { id: 'text-adjuster', label: 'Text Adjuster', icon: FileText },
    { id: 'international-pricing', label: 'International Pricing', icon: Globe },
  ];

  const renderTextAdjuster = () => (
    <div>
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
            className="w-full h-64 p-4 border-2 border-gray-200 rounded-lg resize-none focus:border-blue-500 focus:outline-none"
            placeholder="Cole ou digite seu texto aqui..."
          />

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Alvo de caracteres:
              </label>
              <input
                type="number"
                value={targetChars}
                onChange={(e) => setTargetChars(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                min="1"
                max="10000"
              />
            </div>

            <button
              onClick={adjustText}
              disabled={!originalText.trim() || isProcessing}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Ajustando...
                </>
              ) : (
                'Ajustar Texto'
              )}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Output Section */}
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
              <strong>Tolerância:</strong> -10% a 0% (aceitável: {Math.round(targetChars * 0.90)}-{targetChars} chars)
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
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            PX Software Suite
          </h1>
          <p className="text-gray-600 text-lg">
            Text Adjustment & International Pricing Management
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`group inline-flex items-center py-4 px-6 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="mr-2 h-5 w-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'text-adjuster' ? renderTextAdjuster() : <InternationalPricingDashboard />}
      </div>
    </div>
  );
}
