// Validação do rephrase corrigido - verificar se mantém TODAS as informações
async function validateRephrase() {
  console.log("🧪 VALIDAÇÃO DO REPHRASE CORRIGIDO");
  console.log("=" .repeat(70));
  
  const textoBubble = `A Bubble Creative Studio, microempresa do Porto e produtora exclusiva do programa "CNN Inovação", emitido na CNN Portugal, propõe o projeto "IA para a Produção e Gestão Audiovisual", que integra Inteligência Artificial em toda a cadeia de valor.
A operação divide-se em: (1) IA para Produtividade, com agentes aplicados aos programas "CNN Inovação" e "Compreender Saúde", este com apoio da Ordem dos Médicos; e (2) IA Aplicada ao Negócio, que complementa a anterior com o novo site, CRM e um agente comercial inteligentes.
Os agentes automatizam tarefas de pré e pós-produção, reduzindo o tempo de 5 para 2 dias, garantindo coerência narrativa e uniformidade editorial, e permitindo escalar a produção semanal dentro do mesmo formato. As soluções de IA aplicadas ao negócio reforçam a sustentabilidade da empresa, otimizando a gestão interna e a captação de novos clientes.
A executar entre março de 2026 e fevereiro de 2028, o projeto representa um investimento de 371 870,00 €, cofinanciado em 75 % pelo PRR, criando dois novos postos de trabalho e prevendo um aumento superior a 20 % no Valor Acrescentado Bruto por trabalhador.`;

  console.log(`\n📄 Texto original: ${textoBubble.length} caracteres`);
  console.log(`📝 Conteúdo: Bubble Creative Studio + CNN Inovação + IA + Dados financeiros\n`);

  // Informações críticas que DEVEM estar presentes
  const infoEssenciais = [
    "Bubble Creative Studio",
    "Porto",
    "CNN Inovação",
    "CNN Portugal",
    "IA para a Produção e Gestão Audiovisual",
    "Inteligência Artificial",
    "CNN Inovação",
    "Compreender Saúde",
    "Ordem dos Médicos",
    "IA Aplicada ao Negócio",
    "CRM",
    "5 para 2 dias",
    "março de 2026",
    "fevereiro de 2028",
    "371 870,00 €",
    "75 %",
    "PRR",
    "dois novos postos",
    "20 %",
    "Valor Acrescentado Bruto"
  ];

  // Testar diferentes alvos
  const targets = [800, 1000, 1200];
  
  for (const target of targets) {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`🎯 TESTE: Alvo ${target} caracteres`);
    console.log(`${"=".repeat(70)}`);
    
    try {
      const response = await fetch('http://localhost:3000/api/adjust', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.0-flash-exp',
          maxTokens: 4000,
          temperature: 0.3,
          systemPrompt: `És um editor profissional especializado em REPHRASE/REESCRITA. Teu objetivo é REFORMULAR o texto para ${target} caracteres, mantendo TODAS as informações e significado original.

**REGRA CRÍTICA: NUNCA EXCEDER ${target} CARACTERES**
**REGRA ESSENCIAL: MANTER TODO O CONTEXTO E INFORMAÇÃO**

- Alvo: ${target} caracteres (faixa aceitável: ${Math.round(target * 0.90)}-${target})
- Se exceder: REESCREVE mais conciso
- NUNCA CORTAR/TRUNCAR - sempre REESCREVER

**IMPORTANTE - ISTO NÃO É UM RESUMO:**
❌ NÃO remover informações
❌ NÃO fazer resumo
❌ NÃO truncar/cortar texto
✅ REESCREVER mantendo tudo
✅ CONDENSAR através de reformulação
✅ TODAS as informações devem aparecer

**TÉCNICAS DE CONDENSAÇÃO:**
1. Substituir frases longas por equivalentes curtas
2. Usar sinônimos mais concisos
3. Combinar frases relacionadas
4. Eliminar redundâncias de forma natural
5. Manter todos os números, datas, valores
6. Preservar todas as ideias principais e secundárias`,
          userPrompt: `TEXTO ORIGINAL (${textoBubble.length} caracteres):
${textoBubble}

**TAREFA: REPHRASE COMPLETO**
📉 CONDENSAR de ${textoBubble.length} para ${target} caracteres

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
- ✅ Todos os conceitos e ideias

**META FINAL:**
- ${target} caracteres (aceitável: ${Math.round(target * 0.90)}-${target})
- **NUNCA exceder ${target}**
- Texto coeso e completo
- ZERO perda de informação`
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log(`❌ Erro API: ${errorData.error}`);
        continue;
      }
      
      let result = (await response.json()).text || "";
      let resultCount = result.length;
      
      // Aplicar hard cap se necessário
      if (resultCount > target) {
        console.log(`⚠️  API excedeu (${resultCount} chars). Aplicando hard cap...`);
        const slice = result.slice(0, target);
        const lastSpace = slice.lastIndexOf(' ');
        result = lastSpace > target * 0.8 ? slice.slice(0, lastSpace + 1) : slice;
        resultCount = result.length;
      }
      
      const diff = resultCount - target;
      const percentDiff = (diff / target) * 100;
      
      console.log(`\n📊 RESULTADO:`);
      console.log(`   Caracteres: ${resultCount} (diff: ${diff > 0 ? '+' : ''}${diff}, ${percentDiff.toFixed(1)}%)`);
      
      // Verificar status
      let status = "";
      if (diff === 0) status = "🎯 EXATO";
      else if (percentDiff >= -10 && diff < 0) status = "✅ ACEITÁVEL";
      else if (percentDiff < -10) status = "⚠️  MUITO CURTO";
      else if (diff > 0) status = "🚨 EXCEDEU";
      
      console.log(`   Status: ${status}`);
      
      // VALIDAÇÃO CRÍTICA: Verificar se informações essenciais foram mantidas
      console.log(`\n🔍 VALIDAÇÃO DE INFORMAÇÕES:`);
      
      let infoPresentes = 0;
      let infoAusentes = [];
      
      for (const info of infoEssenciais) {
        const presente = result.toLowerCase().includes(info.toLowerCase());
        if (presente) {
          infoPresentes++;
        } else {
          infoAusentes.push(info);
        }
      }
      
      const percentualInfo = (infoPresentes / infoEssenciais.length) * 100;
      
      console.log(`   ✅ Informações presentes: ${infoPresentes}/${infoEssenciais.length} (${percentualInfo.toFixed(1)}%)`);
      
      if (infoAusentes.length > 0) {
        console.log(`   ❌ Informações AUSENTES:`);
        infoAusentes.forEach(info => console.log(`      - ${info}`));
      }
      
      // Veredito
      console.log(`\n🏁 VEREDITO:`);
      if (percentualInfo >= 90 && diff <= 0) {
        console.log(`   ✅ REPHRASE BEM-SUCEDIDO!`);
        console.log(`   ✅ Manteve ${percentualInfo.toFixed(0)}% das informações essenciais`);
        console.log(`   ✅ Respeitou limite de caracteres`);
      } else if (percentualInfo < 90) {
        console.log(`   ❌ FALHA: Perdeu informações importantes (${(100-percentualInfo).toFixed(0)}%)`);
        console.log(`   ⚠️  Comportamento de RESUMO detectado`);
      } else if (diff > 0) {
        console.log(`   ⚠️  PROBLEMA: Excedeu limite`);
      }
      
      // Mostrar texto resultante
      console.log(`\n📝 TEXTO FINAL:`);
      console.log(`   "${result}"`);
      
    } catch (error) {
      console.error(`❌ Erro: ${error.message}`);
    }
  }
  
  console.log(`\n\n${"=".repeat(70)}`);
  console.log("✨ VALIDAÇÃO CONCLUÍDA");
  console.log(`${"=".repeat(70)}`);
}

// Executar validação
validateRephrase().catch(err => {
  console.error("Erro fatal:", err);
});
