import "./FrontendPages.css";

export default function NotFound() {
  return <main className="public-page not-found"><span className="section-label">ERREUR 404</span><h1>Cette page est introuvable.</h1><p>Vérifiez l’adresse ou retournez à l’accueil de FILWORK.</p><a className="public-button" href="/">Retour à l’accueil</a></main>;
}
