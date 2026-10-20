import { Routes, Route } from "react-router-dom";

import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";

import Accueil from "./Pages/Accueil";

function App() {
  return (
    <>
      {" "}
      <Navbar />
      
      <main>
        <Routes>
          <Route path="/" element={<Accueil />} />




          
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default App;
