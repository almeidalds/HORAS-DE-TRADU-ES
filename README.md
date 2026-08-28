<div align="center">
<img width="1200" height="475" alt="A IGREJA DE JESUS CRISTO DOS SANTOS DOS ÚLTIMOS DIAS" src="https://files.mormonsud.net/wp-content/uploads/2021/10/nome-da-igreja.jpg" />
</div>

# TranslationTracker (Vite + Firebase Hosting)

WebApp para registro e acompanhamento de traduções/horas (MVP).  
Este projeto foi preparado para rodar como **SPA (Single Page Application)** e fazer **deploy no Firebase Hosting** sem quebrar rotas internas (erro 404 ao recarregar páginas).

---

## ✅ Principais recursos

- Rodar localmente com Vite (`npm run dev`)
- Build para produção (`npm run build`)
- Deploy no Firebase Hosting (`firebase deploy --only hosting`)
- Configuração de SPA (`firebase.json` com rewrite para `/index.html`)
- Estrutura pronta para evoluir com rotas (React Router) e páginas internas

---

## 🧰 Tecnologias

- **Vite** (build/dev server)
- **React**
- **Firebase Hosting** (deploy do front-end)

> Observação: Este repositório está preparado para Hosting. Caso você queira incluir Firestore/Auth, você pode adicionar depois.

---

## 📦 Pré-requisitos

Antes de começar, tenha instalado:

- **Node.js** (recomendado LTS)
- **npm** (vem junto com Node)
- Conta no **Firebase** e um **Projeto criado** no Firebase Console
- (Opcional) **Firebase CLI** instalado globalmente
