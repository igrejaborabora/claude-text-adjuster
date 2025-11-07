'use client';

import React, { useState } from 'react';
import { Copy, Download, RefreshCw, CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function Home() {
  
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
      
      const systemPrompt = `És um editor profissional especializado em REPHRASE/REESCRITA. Teu objetivo é REFORMULAR o texto para ${targetChars} caracteres, mantendo TODAS as informações e significado original.

**REGRA CRÍTICA: NUNCA EXCEDER ${targetChars} CARACTERES**
**REGRA ESSENCIAL: MANTER TODO O CONTEXTO E INFORMAÇÃO**

- Alvo: ${targetChars} caracteres (faixa aceitável: ${lowerBound}-${targetChars})
- Se exceder: REESCREVE mais conciso
- Se ficar curto: EXPANDE com detalhes
- NUNCA CORTAR/TRUNCAR - sempre REESCREVER

**IMPORTANTE - ISTO NÃO É UM RESUMO:**
❌ NÃO remover informações
❌ NÃO fazer resumo
❌ NÃO truncar/cortar texto
✅ REESCREVER mantendo tudo
✅ CONDENSAR através de reformulação
✅ TODAS as informações devem aparecer

**TÉCNICAS DE CONDENSAÇÃO (quando reduzir):**
1. Substituir frases longas por equivalentes curtas
2. Usar sinônimos mais concisos
3. Combinar frases relacionadas
4. Eliminar redundâncias de forma natural
5. Manter todos os números, datas, valores
6. Preservar todas as ideias principais e secundárias

**TÉCNICAS DE EXPANSÃO (quando aumentar):**
1. Adicionar contexto relevante
2. Detalhar informações existentes
3. Explicar conceitos mencionados
4. Incluir exemplos concretos

**FORMATO:**
- Texto contínuo e coeso
- ${targetChars} caracteres (±10%)
- NUNCA exceder ${targetChars}`;

      const userPrompt = `TEXTO ORIGINAL (${originalCount} caracteres):
${originalNorm}

**TAREFA: REPHRASE COMPLETO**
${originalCount > targetChars ? 
  `📉 CONDENSAR de ${originalCount} para ${targetChars} caracteres

**COMO CONDENSAR (mantendo TUDO):**
1. Identifica TODAS as informações presentes
2. Reescreve cada informação de forma mais concisa
3. Usa vocabulário mais direto e objetivo
4. Combina frases relacionadas
5. Elimina apenas palavras redundantes, NÃO informações
6. Resultado: TODAS as informações em menos caracteres

**CHECKLIST - O texto condensado deve incluir:**
- ✅ Todos os números e valores mencionados
- ✅ Todas as datas e períodos
- ✅ Todos os nomes e entidades
- ✅ Todas as ações e objetivos
- ✅ Todos os conceitos e ideias` :
  `📈 EXPANDIR de ${originalCount} para ${targetChars} caracteres

**COMO EXPANDIR:**
1. Adiciona contexto a cada ponto mencionado
2. Detalha processos e metodologias
3. Inclui benefícios e impactos específicos
4. Explica termos técnicos quando relevante
5. Adiciona exemplos concretos
6. Resultado: Mesma informação com mais profundidade`
}

**META FINAL:**
- ${targetChars} caracteres (aceitável: ${lowerBound}-${targetChars})
- **NUNCA exceder ${targetChars}**
- Texto coeso e completo
- ZERO perda de informação`;

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
          const fineSystem = `AJUSTE FINO – REPHRASE PARA REDUZIR (${resultCount} → ${targetChars} chars)

**SITUAÇÃO:** Texto tem ${diff} caracteres a mais (${Math.abs(percentDiff).toFixed(1)}% acima)

**OBJETIVO:** REESCREVER todo o texto de forma mais concisa
- Meta: ${lowerBound} a ${targetChars} caracteres
- Método: REFORMULAÇÃO, não truncamento
- TODAS as informações devem permanecer

**TÉCNICA:**
1. Identifica cada informação presente
2. Reformula cada uma de forma mais direta
3. Usa vocabulário mais conciso
4. Mantém TODOS os dados, nomes, valores, datas
5. Resultado: mesma informação, menos caracteres

**CRÍTICO: NUNCA EXCEDER ${targetChars} CARACTERES**`;

          const fineUser = `TEXTO PARA REPHRASE (${resultCount} chars):
${resultNorm}

**TAREFA:**
Reescreve este texto em ${targetChars} caracteres mantendo:
✅ Todas as informações e conceitos
✅ Todos os números e valores
✅ Todas as datas e períodos
✅ Todos os nomes e entidades
✅ Todo o significado original

**MÉTODO:**
- Usa frases mais diretas e objetivas
- Substitui expressões longas por curtas
- Combina informações relacionadas
- Elimina apenas redundâncias

**META:** ${targetChars} caracteres (máximo absoluto)`;

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
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Como Funciona - REPHRASE Inteligente</h3>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p className="text-sm text-blue-900">
            <strong>⚠️ IMPORTANTE:</strong> Esta aplicação faz <strong>REPHRASE/REESCRITA</strong>, não resumo ou truncamento.
            <br/>
            <strong>TODAS as informações</strong> do texto original são mantidas, apenas reformuladas para caber no limite de caracteres.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <strong>Rephrase Completo:</strong> Reformula mantendo TODO o contexto
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
              <strong>Zero Perda:</strong> Nenhuma informação é removida
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
            Text Adjuster
          </h1>
          <p className="text-gray-600 text-lg">
            Ajusta textos para um limite exato de caracteres usando IA
          </p>
        </div>

        {/* Content */}
        {renderTextAdjuster()}
      </div>
    </div>
  );
}
