
export default function NotFound() {
<<<<<<< Updated upstream
  return <main className="public-page not-found"><span className="section-label">ERREUR 404</span><h1>Cette page est introuvable.</h1><p>Vérifiez l’adresse ou retournez à l’accueil de FILWORK.</p><a className="public-button" href="/">Retour à l’accueil</a></main>;
=======
  return (
    <main className="public-page not-found">
      <span className="section-label">ERREUR 404</span>
      <h1>Cette page est introuvable.</h1>
      <p>Vérifiez l’adresse ou retournez à l’accueil de FILWORK.</p>
      <Link className="public-button" to="/">
        Retour à l’accueil
      </Link>
    </main>
  );
>>>>>>> Stashed changes
}
