# Push para GitHub - Instruções

## 1. Criar Repositório no GitHub
1. A página já deve estar aberta: https://github.com/new
2. **Repository name**: `gemini-text-adjuster`
3. **Description**: `Gemini Text Adjuster - Ferramenta de ajuste preciso de caracteres com Google Gemini 2.5 Flash`
4. **Visibility**: Public ☑️
5. **Add README**: ❌ (já temos um)
6. **Add .gitignore**: ❌ (já temos um)
7. **Choose license**: ❌ (opcional)
8. Clique em **Create repository**

## 2. Fazer Push (após criar o repo)
Execute estes comandos no terminal:

```bash
cd "c:\0002_PX_Software\010_Summarize"
git push -u origin main
```

## 3. Verificar Deploy
Após o push, o repositório estará em:
https://github.com/igrejaborabora/gemini-text-adjuster

## 4. Deploy no Vercel
1. Acesse: https://vercel.com/new
2. **Import Git Repository**
3. Selecione `igrejaborabora/gemini-text-adjuster`
4. **Environment Variables**:
   - `GEMINI_API_KEY`: Sua chave da API Gemini
5. **Deploy**

## Status Atual do Projeto
✅ Commits prontos: 2 commits no branch main
✅ Código completo e testado
✅ Configuração Vercel pronta
✅ Documentação completa
✅ Funcionalidade de tolerância [-5%, 0%] implementada
