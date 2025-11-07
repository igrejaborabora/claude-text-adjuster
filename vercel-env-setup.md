# Configurar GEMINI_API_KEY no Vercel

## Passo 1: Acessar Dashboard
- Dashboard aberto: https://vercel.com/dashboard

## Passo 2: Encontrar Projeto
1. Procure pelo projeto: `claude-text-adjuster`
2. Clique no projeto para abrir as configurações

## Passo 3: Configurar Environment Variables
1. Na página do projeto, clique na aba **"Settings"**
2. No menu lateral, clique em **"Environment Variables"**
3. Clique no botão **"Add New"**
4. Preencha:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: [Sua chave da API Gemini]
   - **Environments**: Selecione **Production**, **Preview**, **Development**
5. Clique em **"Save"**

## Passo 4: Redeploy
1. Volte para a aba **"Deployments"**
2. Clique nos três pontos (...) do deployment mais recente
3. Selecione **"Redeploy"**
4. Confirme clicando em **"Redeploy"**

## Passo 5: Verificar
Após o redeploy, acesse a URL do projeto e teste:
1. Cole um texto
2. Defina um alvo de caracteres
3. Clique em "Ajustar Texto"
4. Deve funcionar sem erros

## Sua Chave Gemini
A chave deve estar no formato:
```
AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Debug
Se continuar dando erro, verifique:
1. Nome exato: `GEMINI_API_KEY` (maiúsculas)
2. Valor correto: sem espaços extras
3. Ambientes selecionados: Production, Preview, Development
4. Redeploy feito após configurar
