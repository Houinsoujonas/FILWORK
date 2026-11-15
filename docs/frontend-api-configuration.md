# Configuration de l’API frontend

Le frontend utilise `VITE_API_URL` comme seule adresse publique de l’API. Cette
variable contient l’origine du backend, avec ou sans le suffixe `/api`.

En développement, le navigateur appelle `/api` sur Vite, qui relaie la requête
vers l’origine configurée. Sans fichier local, Vite utilise le backend de
développement sur `http://localhost:5000`. Pour changer cette cible, copiez
`.env.example` en `.env.local` et modifiez `VITE_API_URL`.

Pour Preview et la production, définissez `VITE_API_URL` au moment du build avec
l’URL HTTPS du backend, par exemple `https://api.exemple.com/api`. Vite intègre
cette valeur au bundle. Une URL HTTP n’est pas acceptée par le client en build
de production.

Le frontend ne doit recevoir que cette URL publique. Les identifiants de base
de données, clés JWT, paramètres SMTP, secrets SasPay et jetons de stockage
restent exclusivement dans l’environnement backend.

En production, ajoutez l’origine HTTPS exacte du frontend à `CORS_ORIGINS` côté
backend. `FRONTEND_URL` ne remplace pas cette liste dans le middleware CORS.
L’API utilise des jetons Bearer et n’active pas les cookies inter-origines.
