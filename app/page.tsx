'use client';

import { useState } from 'react';
import { Play, RotateCcw, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Paragraph {
  id: number;
  text: string;
  original: string;
  selected: boolean;
  chars: number;
  history: string[]; // Histórico de versões (index 0 = mais antiga)
  currentVersionIndex: number; // Índice da versão atual no histórico
}

export default function Home() {
  const [originalText, setOriginalText] = useState('');
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [finalText, setFinalText] = useState('');
  const [targetChars, setTargetChars] = useState('1000');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Utilitários
  const normalizeForCount = (s: string): string => {
    let t = s.normalize("NFC");
    t = t.replace(/\r\n/g, "\n");
    return t;
  };

  const charCount = (s: string): number => {
    return normalizeForCount(s).length;
  };

  // Fase 1: Rephrase inicial e divisão em parágrafos
  const handleInitialRephrase = async () => {
    if (!originalText.trim()) {
      setError('Por favor, insira um texto');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Fazer rephrase inicial completo (sem limite)
      const systemPrompt = `És um editor profissional. Faz um REPHRASE COMPLETO deste texto:
- Mantém TODAS as informações (nomes, números, datas, valores)
- Usa vocabulário mais direto e conciso
- Elimina apenas redundâncias naturais
- NÃO é um resumo - é uma reformulação
- Resultado: texto mais claro mas com 100% da informação`;

      const userPrompt = `TEXTO ORIGINAL:\n${originalText}\n\nREPHRASE completo mantendo todas as informações:`;

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
      const rephrasedText = data.text || '';

      // Dividir em parágrafos
      const paragraphTexts = rephrasedText
        .split(/\n\n+/)
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 0);

      const newParagraphs: Paragraph[] = paragraphTexts.map((text: string, index: number) => ({
        id: index,
        text: text,
        original: text,
        selected: false,
        chars: charCount(text),
        history: [text], // Versão inicial no histórico
        currentVersionIndex: 0
      }));

      setParagraphs(newParagraphs);
      
      // Texto final CORRIDO (sem parágrafos)
      const corrido = newParagraphs.map(p => p.text).join(' ');
      setFinalText(corrido);
      
      setIsProcessing(false);

    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Erro ao processar');
      setIsProcessing(false);
    }
  };

  // Alternar seleção de parágrafo
  const toggleParagraph = (id: number) => {
    setParagraphs(prev =>
      prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p)
    );
  };

  // Iterar um parágrafo individualmente
  const iterateSingleParagraph = async (id: number) => {
    const para = paragraphs.find(p => p.id === id);
    if (!para) return;

    setIsProcessing(true);
    setError('');

    try {
      const currentLength = charCount(para.text);
      const targetLength = Math.max(Math.round(currentLength * 0.85), 50);

      const systemPrompt = `Reescreve este parágrafo de forma mais concisa:
- Meta: aproximadamente ${targetLength} caracteres
- Mantém TODAS as informações essenciais
- Usa frases mais diretas
- NUNCA exceder o texto original em tamanho`;

      const userPrompt = `PARÁGRAFO ORIGINAL (${currentLength} chars):\n${para.text}\n\nVersão mais concisa (~${targetLength} chars):`;

      const response = await fetch('/api/adjust', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.0-flash-exp',
          maxTokens: 2000,
          temperature: 0.3,
          systemPrompt,
          userPrompt
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newText = data.text || para.text;
        
        setParagraphs(prev => {
          const updated = prev.map(p => {
            if (p.id === id) {
              const newHistory = [...p.history, newText];
              return {
                ...p,
                text: newText,
                chars: charCount(newText),
                history: newHistory,
                currentVersionIndex: newHistory.length - 1
              };
            }
            return p;
          });
          
          // Atualizar texto final imediatamente (CORRIDO)
          const newFinalText = updated.map((p: Paragraph) => p.text).join(' ');
          setFinalText(newFinalText);
          
          return updated;
        });
      }

      setIsProcessing(false);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Erro ao iterar');
      setIsProcessing(false);
    }
  };

  // Reverter parágrafo para versão anterior
  const revertParagraph = (id: number) => {
    setParagraphs(prev => {
      const updated = prev.map(p => {
        if (p.id === id && p.currentVersionIndex > 0) {
          const newIndex = p.currentVersionIndex - 1;
          const prevText = p.history[newIndex];
          return {
            ...p,
            text: prevText,
            chars: charCount(prevText),
            currentVersionIndex: newIndex
          };
        }
        return p;
      });
      
      // Atualizar texto final imediatamente
      const newFinalText = updated.map((p: Paragraph) => p.text).join(' ');
      setFinalText(newFinalText);
      
      return updated;
    });
  };

  // Iterar parágrafos selecionados
  const handleIterateParagraphs = async () => {
    const selectedParagraphs = paragraphs.filter(p => p.selected);
    
    if (selectedParagraphs.length === 0) {
      setError('Selecione pelo menos um parágrafo');
      return;
    }

    const target = parseInt(targetChars);
    if (isNaN(target) || target < 10) {
      setError('Alvo de caracteres inválido');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      let updatedParagraphs = [...paragraphs];

      // Processar cada parágrafo selecionado
      for (const para of selectedParagraphs) {
        const currentLength = charCount(para.text);
        const reductionNeeded = Math.max(Math.round(currentLength * 0.85), 50); // Reduzir ~15%

        const systemPrompt = `Reescreve este parágrafo de forma mais concisa:
- Meta: aproximadamente ${reductionNeeded} caracteres
- Mantém TODAS as informações essenciais
- Usa frases mais diretas
- NUNCA exceder o texto original em tamanho`;

        const userPrompt = `PARÁGRAFO ORIGINAL (${currentLength} chars):\n${para.text}\n\nVersão mais concisa (~${reductionNeeded} chars):`;

        const response = await fetch('/api/adjust', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            model: 'gemini-2.0-flash-exp',
            maxTokens: 2000,
            temperature: 0.3,
            systemPrompt,
            userPrompt
          })
        });

        if (response.ok) {
          const data = await response.json();
          const newText = data.text || para.text;
          
          updatedParagraphs = updatedParagraphs.map(p => {
            if (p.id === para.id) {
              const newHistory = [...p.history, newText];
              return {
                ...p,
                text: newText,
                chars: charCount(newText),
                history: newHistory,
                currentVersionIndex: newHistory.length - 1
              };
            }
            return p;
          });
        }
      }

      setParagraphs(updatedParagraphs);
      
      // Atualizar texto final (CORRIDO)
      const newFinalText = updatedParagraphs.map((p: Paragraph) => p.text).join(' ');
      setFinalText(newFinalText);
      
      setIsProcessing(false);

    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Erro ao iterar');
      setIsProcessing(false);
    }
  };

  // Reset
  const handleReset = () => {
    setOriginalText('');
    setParagraphs([]);
    setFinalText('');
    setError('');
  };

  // Exportar
  const handleExport = () => {
    const blob = new Blob([finalText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `texto-ajustado-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calcular totais
  const totalChars = paragraphs.reduce((sum, p) => sum + p.chars, 0);
  const targetNum = parseInt(targetChars) || 0;
  const diff = totalChars - targetNum;
  const selectedCount = paragraphs.filter(p => p.selected).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Text Adjuster - Iterativo
          </h1>
          <p className="text-slate-600">
            Rephrase inteligente com controle parágrafo a parágrafo
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CAIXA 1: Introdução */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
                  1
                </span>
                Texto Original
              </CardTitle>
              <CardDescription>
                {charCount(originalText)} caracteres
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                placeholder="Cole seu texto aqui..."
                className="min-h-[300px] resize-none font-mono text-sm"
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">Alvo de caracteres:</label>
                <Input
                  type="text"
                  value={targetChars}
                  onChange={(e) => setTargetChars(e.target.value)}
                  placeholder="Ex: 1000"
                  className="font-mono"
                />
              </div>

              <Button
                onClick={handleInitialRephrase}
                disabled={!originalText.trim() || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Iniciar Rephrase
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* CAIXA 2: Resultado Iterativo */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 text-sm font-bold">
                  2
                </span>
                Iteração por Parágrafos
              </CardTitle>
              <CardDescription>
                {totalChars} caracteres | Alvo: {targetChars} | 
                Diff: <span className={diff > 0 ? 'text-red-600' : 'text-green-600'}>
                  {diff > 0 ? '+' : ''}{diff}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {paragraphs.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <p>Faça o rephrase inicial primeiro</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {paragraphs.map((para) => (
                      <div
                        key={para.id}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          para.selected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div 
                              onClick={() => toggleParagraph(para.id)}
                              className={`flex-shrink-0 w-5 h-5 rounded border-2 cursor-pointer ${
                                para.selected
                                  ? 'bg-purple-500 border-purple-500'
                                  : 'border-slate-300 hover:border-slate-400'
                              } flex items-center justify-center`}>
                              {para.selected && <CheckCircle className="w-4 h-4 text-white" />}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {para.chars} chars
                            </Badge>
                            {para.history.length > 1 && (
                              <Badge variant="secondary" className="text-xs">
                                v{para.currentVersionIndex + 1}/{para.history.length}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                revertParagraph(para.id);
                              }}
                              disabled={para.currentVersionIndex === 0 || isProcessing}
                              className="h-7 px-2 text-xs"
                              title="Reverter para versão anterior"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                iterateSingleParagraph(para.id);
                              }}
                              disabled={isProcessing}
                              className="h-7 px-2 text-xs"
                              title="Iterar (reduzir mais)"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 line-clamp-3">
                          {para.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      {selectedCount} parágrafo(s) selecionado(s)
                    </span>
                  </div>

                  <Button
                    onClick={handleIterateParagraphs}
                    disabled={selectedCount === 0 || isProcessing}
                    className="w-full"
                    variant="secondary"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Iterar Selecionados
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* CAIXA 3: Resultado Final */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 text-sm font-bold">
                  3
                </span>
                Resultado Final
              </CardTitle>
              <CardDescription>
                {charCount(finalText)} caracteres
                {finalText && (
                  <span className={`ml-2 ${
                    charCount(finalText) <= targetNum ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {charCount(finalText) <= targetNum ? '✅ Dentro do alvo' : '⚠️ Acima do alvo'}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={finalText}
                readOnly
                className="min-h-[300px] resize-none font-mono text-sm bg-slate-50"
                placeholder="O resultado aparecerá aqui..."
              />

              {finalText && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleExport}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Recomeçar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Como Funciona</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <div>
                  <p className="font-medium">Rephrase Inicial</p>
                  <p className="text-slate-600">Reformula todo o texto mantendo 100% das informações</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <div>
                  <p className="font-medium">Iteração Seletiva</p>
                  <p className="text-slate-600">Escolha parágrafos específicos para condensar ainda mais</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <div>
                  <p className="font-medium">Resultado Final</p>
                  <p className="text-slate-600">Texto otimizado com controle total do processo</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
