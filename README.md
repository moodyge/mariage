# Place Parfaite

Application privée de gestion et de génération du plan de table du mariage.

## Développement local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Variables requises :

- `DATABASE_URL` : chaîne de connexion Neon
- `APP_PASSWORD` : mot de passe partagé
- `AUTH_SECRET` : secret de signature du cookie

Les données nominatives sont stockées dans Neon et ne sont pas versionnées.
