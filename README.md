# Gemini Text Adjuster

Ferramenta de ajuste preciso de caracteres usando Google Gemini 2.5 Flash API - Grátis, rápida e poderosa.

## 🎯 Características

- ✅ **API Gratuita**: Google Gemini 2.5 Flash sem custos
- ✅ **Backend seguro**: Proxy API para evitar exposição de chaves
- ✅ **Normalização Unicode**: NFC + quebras de linha padronizadas
- ✅ **Contagem precisa**: Sem trim() ou alterações que afetem contagem
- ✅ **Loop de ajuste fino**: Até 4 iterações sem pontos de enchimento
- ✅ **Validação de tokens**: Prevenção de limites excedidos
- ✅ **Tratamento de erros**: Rate limit, CORS, validações
- ✅ **Interface moderna**: React + TypeScript + Tailwind CSS
- ✅ **Velocidade**: Gemini 2.5 Flash é extremamente rápido

## 🚀 Deploy no Vercel

1. **Fork ou criar repositório GitHub**
2. **Conectar ao Vercel**
3. **Configurar variáveis de ambiente**:
   ```
   GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```
4. **Deploy automático**

## 🛠️ Desenvolvimento Local

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Instalação
```bash
# Clonar repositório
git clone https://github.com/igrejaborabora/claude-text-adjuster.git
cd claude-text-adjuster

# Instalar dependências (resolve todos os erros de lint)
npm install

# Configurar ambiente
cp .env.local.example .env.local
# Editar .env.local com sua chave GEMINI_API_KEY
```

### Executar
```bash
npm run dev
```
Acesse `http://localhost:3000`

### 🔧 Resolução de Erros de Lint

Os erros de lint que você pode ver no IDE são esperados e desaparecem após instalar as dependências:

```bash
npm install
```

**Erros comuns e suas soluções:**
- `Cannot find module 'next'` → `npm install` instala Next.js
- `Cannot find module 'react'` → `npm install` instala React
- `Cannot find module 'lucide-react'` → `npm install` instala ícones
- `Unknown at rule @tailwind` → `npm install` instala Tailwind CSS
- `Cannot find name 'process'` → `npm install` instala @types/node

## 🔑 Configurar Google Gemini API (Grátis)

### 1. Obter sua chave Gemini:
1. Acesse: https://makersuite.google.com/app/apikey
2. Faça login com conta Google
3. Clique "Create API Key"
4. Copie a chave (começa com `AIzaSy`)

### 2. Configurar localmente:
```bash
# Editar .env.local
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 3. Configurar no Vercel:
- Vá para Settings → Environment Variables
- Adicione: `GEMINI_API_KEY`
- Value: Sua chave copiada

## 📁 Estrutura do Projeto

```
claude-text-adjuster/
├── app/
│   ├── api/
│   │   └── adjust/
│   │       └── route.ts          # Backend proxy Gemini
│   ├── globals.css               # Estilos Tailwind
│   ├── layout.tsx                # Layout principal
│   └── page.tsx                  # Componente principal
├── .env.local.example            # Template variáveis ambiente
├── next.config.js                # Config Next.js
├── package.json                  # Dependências
├── postcss.config.js             # Config PostCSS
├── tailwind.config.js            # Config Tailwind
├── tsconfig.json                 # Config TypeScript
└── README.md                     # Documentação
```

## 🔧 Correções Técnicas Implementadas

### 1. Backend Proxy (/api/adjust)
- ✅ Chamada segura à Google Gemini API
- ✅ Headers corretos: API key na URL
- ✅ Content em formato Gemini: `contents[0].parts[0].text`
- ✅ Tratamento CORS com OPTIONS
- ✅ Rate limit (429) com backoff
- ✅ Validação de tokens prévia
- ✅ Safety settings configurados

### 2. Frontend Otimizado
- ✅ Normalização NFC: `s.normalize("NFC")`
- ✅ Quebras de linha: `\r\n → \n`
- ✅ Contagem sem trim(): `charCount(normalizeForCount(s))`
- ✅ Loop ajuste fino sem pontos de enchimento
- ✅ Precisão aceitável: ±2 caracteres = "Perfeito"
- ✅ Interface com status visual
- ✅ TypeScript estrito com tipos explícitos
- ✅ Prompts otimizados para Gemini 2.5 Flash

### 3. Segurança
- ✅ Chave API apenas no backend
- ✅ Sem exposição no frontend
- ✅ Variáveis ambiente Vercel
- ✅ Validação inputs

## 📊 Como Funciona

1. **Input**: Usuário insere texto e alvo de caracteres
2. **Validação**: Verificação de limites e tokens
3. **API Call**: Backend faz proxy para Gemini
4. **Loop Ajuste**: Até 4 iterações para precisão
5. **Resultado**: Texto ajustado com status de precisão

## 🎨 Status de Precisão

- 🎯 **Perfeito**: 0-2 caracteres de diferença
- ✅ **Excelente**: 3-5 caracteres de diferença  
- 👍 **Bom**: 6-10 caracteres de diferença
- ⚠️ **Precisa ajuste**: +10 caracteres de diferença

## 🌍 Deploy Instructions

### GitHub + Vercel
1. Push para GitHub
2. Import projeto no Vercel
3. Configurar `GEMINI_API_KEY` em Environment Variables
4. Deploy

### Variáveis de Ambiente Necessárias
```
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## 🔒 Segurança

- ✅ Chave API nunca exposta no frontend
- ✅ Backend como proxy seguro
- ✅ Rate limit handling
- ✅ Input validation
- ✅ CORS configurado

## 🚀 Vantagens Gemini vs Anthropic

| Característica | Gemini 2.5 Flash | Anthropic Claude |
|----------------|-------------------|------------------|
| **Custo** | ✅ Grátis | 💰 Pago |
| **Velocidade** | ⚡ Extremamente rápido | 🐢 Mais lento |
| **Precisão** | 🎯 Excelente | 🎯 Excelente |
| **Limites** | 📊 Generosos | 📊 Restritivos |
| **Setup** | ✅ Simples | ⚙️ Complexo |

## 📝 Licença

MIT License - uso livre para desenvolvimento

---

**Desenvolvido com Next.js 15, TypeScript, Tailwind CSS e Google Gemini 2.5 Flash API**