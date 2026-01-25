<div align="center">
<img width="1200" height="475" alt="A IGREJA DE JESUS CRISTO DOS SANTOS DOS ÚLTIMOS DIAS" src="https://files.mormonsud.net/wp-content/uploads/2021/10/nome-da-igreja.jpg" />
</div>

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Deploy no Firebase Hosting

1) Instale o Firebase CLI (uma vez):
   `npm i -g firebase-tools`

2) Faça login:
   `firebase login`

3) Inicialize o Hosting na pasta do projeto (se ainda não tiver):
   `firebase init hosting`
   - **Public directory:** `dist`
   - **Configure as a single-page app:** `Yes`
   - **Set up automatic builds and deploys with GitHub:** `No` (por enquanto)

4) Build + deploy:
   `npm run build`
   `firebase deploy --only hosting`

Dica: se você já tiver um projeto Firebase criado, conecte com:
`firebase use --add`
