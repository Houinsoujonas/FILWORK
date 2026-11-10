<<<<<<< HEAD
import { createContext, useContext } from "react";

export const AuthContext = createContext(null);
=======
import { useContext } from "react";

import { AuthContext } from "./AuthContext.js";
>>>>>>> 79d98d87328d46967b35c400b98945f8bc408d3b

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider.");
  }

  return context;
}
