# React + Vite

This frontend is maintained by CHIPPA VASU (<2303a51618@sru.edu.in>).

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Environment variables

Create a `.env` file inside the `FRONTEND` folder (you can copy the included `.env.example`).

- `VITE_API_URL` — optional. Set to your backend URL (e.g. `http://localhost:5001`) so the frontend can call the API in development/production.

Example:

VITE_API_URL=http://localhost:5001

Remember: do NOT commit a `.env` file with secrets. Use `.env.example` as the template.
