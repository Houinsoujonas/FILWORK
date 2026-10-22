import { Component, lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";

import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";
import DashboardLayout from "./Components/DashboardLayout";
const Accueil = lazy(() => import("./Pages/Accueil"));
const Createurs = lazy(() => import("./Pages/Createurs"));
const Connexion = lazy(() => import("./Pages/Connexion"));
const Inscription = lazy(() => import("./Pages/Inscription"));
const MotDePasseOublie = lazy(() => import("./Pages/MotDePasseOublie"));
const APropos = lazy(() => import("./Pages/APropos"));
const Campagnes = lazy(() => import("./Pages/Campagnes"));
const AnnuaireCreateurs = lazy(() => import("./Pages/AnnuaireCreateurs"));
const CreateurProfil = lazy(() => import("./Pages/CreateurProfil"));
const CampagneDetail = lazy(() => import("./Pages/CampagneDetail"));
const Contact = lazy(() => import("./Pages/Contact"));
const InformationsLegales = lazy(() => import("./Pages/InformationsLegales"));
const DashboardCreateur = lazy(() => import("./Pages/DashboardCreateur"));
const DashboardEntreprise = lazy(() => import("./Pages/DashboardEntreprise"));
const DashboardAdmin = lazy(() => import("./Pages/DashboardAdmin"));
const NotFound = lazy(() => import("./Pages/NotFound"));

function SiteLayout({ children }) {
  const { pathname } = useLocation();
  const isDashboard = pathname.startsWith("/espace/") || pathname.startsWith("/administration");

  return (
    <>
      {isDashboard ? null : <Navbar />}
      {children}
      {isDashboard ? null : <Footer />}
    </>
  );
}

class RouteErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="route-error" role="alert">
          <h1>Cette page est momentanément indisponible</h1>
          <p>Un problème est survenu pendant son affichage. Rechargez la page pour réessayer.</p>
          <button type="button" onClick={() => window.location.reload()}>Recharger la page</button>
        </main>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <SiteLayout>
      <RouteErrorBoundary>
      <Suspense fallback={<main className="route-loading" role="status">Chargement de la page…</main>}>
      <Routes>
        <Route path="/" element={<main><Accueil /></main>} />
        <Route path="/a-propos" element={<APropos />} />
        <Route path="/campagnes" element={<Campagnes />} />
        <Route path="/campagnes/:campaignId" element={<CampagneDetail />} />
        <Route path="/createurs" element={<Createurs />} />
        <Route path="/annuaire-createurs" element={<AnnuaireCreateurs />} />
        <Route path="/annuaire-createurs/:creatorId" element={<CreateurProfil />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/conditions" element={<InformationsLegales type="conditions" />} />
        <Route path="/confidentialite" element={<InformationsLegales type="confidentialite" />} />
        <Route path="/espace/createur/*" element={<DashboardLayout role="creator"><DashboardCreateur /></DashboardLayout>} />
        <Route path="/espace/entreprise/*" element={<DashboardLayout role="business"><DashboardEntreprise /></DashboardLayout>} />
        <Route path="/administration/*" element={<DashboardLayout role="admin"><DashboardAdmin /></DashboardLayout>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      </RouteErrorBoundary>
    </SiteLayout>
  );
}

export default App;
