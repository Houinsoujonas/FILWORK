import { Routes, Route } from "react-router-dom";

import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";

import Accueil from "./Pages/Accueil";
import Connexion from "./Pages/Connexion";
import Inscription from "./Pages/Inscription";

function App() {
  return (
    <>
      {" "}
      <Navbar />
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
      <Footer />
    </>
  );
}

export default App;
