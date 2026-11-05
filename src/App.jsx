import { Component, lazy, Suspense } from "react";
import { Outlet, Route, Routes } from "react-router-dom";

import Footer from "./Components/Footer";
import Navbar from "./Components/Navbar";
import DashboardLayout from "./Components/DashboardLayout";
import ProtectedRoute from "./Components/ProtectedRoute";

const Accueil = lazy(() => import("./Pages/Accueil"));
const Createurs = lazy(() => import("./Pages/Createurs"));
const Connexion = lazy(() => import("./Pages/Connexion"));
const Inscription = lazy(() => import("./Pages/Inscription"));
const MotDePasseOublie = lazy(() => import("./Pages/MotDePasseOublie"));
const ResetPassword = lazy(() => import("./Pages/ResetPassword"));
const APropos = lazy(() => import("./Pages/APropos"));
const Campagnes = lazy(() => import("./Pages/Campagnes"));
const AnnuaireCreateurs = lazy(() => import("./Pages/AnnuaireCreateurs"));
const CreateurProfil = lazy(() => import("./Pages/CreateurProfil"));
const CampagneDetail = lazy(() => import("./Pages/CampagneDetail"));
const Contact = lazy(() => import("./Pages/Contact"));
const InformationsLegales = lazy(() => import("./Pages/InformationsLegales"));
const NotFound = lazy(() => import("./Pages/NotFound"));

const DashboardCreateur = lazy(() => import("./Pages/DashboardCreateur"));
const CreatorProfilePage = lazy(() => import("./Pages/CreatorProfilePage"));
const CreatorOpportunities = lazy(() => import("./Pages/CreatorOpportunities"));
const CreatorApplications = lazy(() => import("./Pages/CreatorApplications"));
const CreatorInvitations = lazy(() => import("./Pages/CreatorInvitations"));
const CollaborationList = lazy(() => import("./Pages/CollaborationList"));
const CollaborationDetail = lazy(() => import("./Pages/CollaborationDetail"));
const Notifications = lazy(() => import("./Pages/Notifications"));

const DashboardEntreprise = lazy(() => import("./Pages/DashboardEntreprise"));
const CompanyProfilePage = lazy(() => import("./Pages/CompanyProfilePage"));
const CompanyCampaigns = lazy(() => import("./Pages/CompanyCampaigns"));
const CampaignEditor = lazy(() => import("./Pages/CampaignEditor"));
const CompanyCampaignDetail = lazy(() => import("./Pages/CompanyCampaignDetail"));
const CompanyCreators = lazy(() => import("./Pages/CompanyCreators"));
const CompanyInvitations = lazy(() => import("./Pages/CompanyInvitations"));

const DashboardAdmin = lazy(() => import("./Pages/DashboardAdmin"));
const AdminUsers = lazy(() => import("./Pages/AdminUsers"));
const AdminCampaigns = lazy(() => import("./Pages/AdminCampaigns"));
const AdminCollaborations = lazy(() => import("./Pages/AdminCollaborations"));
const AdminDeliverables = lazy(() => import("./Pages/AdminDeliverables"));
const AdminPayments = lazy(() => import("./Pages/AdminPayments"));

function PublicLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
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
          <p>
            Un problème est survenu pendant son affichage. Rechargez la page
            pour réessayer.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Recharger la page
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <RouteErrorBoundary>
      <Suspense
        fallback={
          <main className="route-loading" role="status">
            Chargement de la page…
          </main>
        }
      >
        <Routes>
          <Route element={<PublicLayout />}>
            <Route
              path="/"
              element={
                <main>
                  <Accueil />
                </main>
              }
            />
            <Route path="/a-propos" element={<APropos />} />
            <Route path="/campagnes" element={<Campagnes />} />
            <Route path="/campagnes/:campaignId" element={<CampagneDetail />} />
            <Route path="/createurs" element={<Createurs />} />
            <Route path="/annuaire-createurs" element={<AnnuaireCreateurs />} />
            <Route
              path="/annuaire-createurs/:creatorId"
              element={<CreateurProfil />}
            />
            <Route path="/connexion" element={<Connexion />} />
            <Route path="/inscription" element={<Inscription />} />
            <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/contact" element={<Contact />} />
            <Route
              path="/conditions"
              element={<InformationsLegales type="conditions" />}
            />
            <Route
              path="/confidentialite"
              element={<InformationsLegales type="confidentialite" />}
            />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route
            path="/espace/createur"
            element={
              <ProtectedRoute roles={["CREATOR"]}>
                <DashboardLayout role="creator" />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardCreateur />} />
            <Route path="profil" element={<CreatorProfilePage />} />
            <Route path="campagnes" element={<CreatorOpportunities />} />
            <Route path="candidatures" element={<CreatorApplications />} />
            <Route path="invitations" element={<CreatorInvitations />} />
            <Route path="collaborations" element={<CollaborationList />} />
            <Route path="collaborations/:id" element={<CollaborationDetail />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

          <Route
            path="/espace/entreprise"
            element={
              <ProtectedRoute roles={["COMPANY"]}>
                <DashboardLayout role="business" />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardEntreprise />} />
            <Route path="organisation" element={<CompanyProfilePage />} />
            <Route path="campagnes" element={<CompanyCampaigns />} />
            <Route path="campagnes/nouvelle" element={<CampaignEditor />} />
            <Route path="campagnes/:id/modifier" element={<CampaignEditor />} />
            <Route path="campagnes/:id" element={<CompanyCampaignDetail />} />
            <Route path="createurs" element={<CompanyCreators />} />
            <Route path="invitations" element={<CompanyInvitations />} />
            <Route path="collaborations" element={<CollaborationList />} />
            <Route path="collaborations/:id" element={<CollaborationDetail />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

          <Route
            path="/administration"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <DashboardLayout role="admin" />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardAdmin />} />
            <Route path="comptes" element={<AdminUsers />} />
            <Route path="campagnes" element={<AdminCampaigns />} />
            <Route path="collaborations" element={<AdminCollaborations />} />
            <Route path="livrables" element={<AdminDeliverables />} />
            <Route path="paiements" element={<AdminPayments />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}

export default App;
