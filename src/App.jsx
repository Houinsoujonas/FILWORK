import { Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";

import Accueil from "./Pages/Accueil";
import Connexion from "./Pages/Connexion";
import Inscription from "./Pages/Inscription";

function App() {
  const { pathname } = useLocation();
  const isAuthPage = ["/connexion", "/inscription"].includes(
    pathname.replace(/\/$/, ""),
  );

  return (
    <>
      {!isAuthPage && <Navbar />}
      <Routes>
        <Route
          path="/"
          element={
            <main>
              <Accueil />
            </main>
          }
        />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/inscription" element={<Inscription />} />
      </Routes>
      {!isAuthPage && <Footer />}
    </>
  );
}

export default App;
