import { useEffect, useRef, useState } from "react";

import { errorMessage } from "./api";

/**
 * Charge une ressource distante et expose un état dérivé de la requête
 * courante. Le chargement est déduit de la clé de dépendances : aucun
 * setState n'est déclenché de façon synchrone au démarrage de l'effet.
 */
export function useApiQuery(loader, dependencies, initialData, options = {}) {
  const { enabled = true } = options;
  const requestKey = JSON.stringify(dependencies);
  const loaderRef = useRef(loader);
  const [snapshot, setSnapshot] = useState({
    key: null,
    data: undefined,
    error: "",
  });

  // Le loader est recréé à chaque rendu avec les filtres courants. On le
  // garde à jour sans le mettre en dépendance de la requête.
  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let active = true;

    loaderRef
      .current()
      .then((data) => {
        if (active) {
          setSnapshot({ key: requestKey, data, error: "" });
        }
      })
      .catch((requestError) => {
        if (active) {
          setSnapshot({
            key: requestKey,
            data: undefined,
            error: errorMessage(requestError),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [enabled, requestKey]);

  const isCurrent = snapshot.key === requestKey;
  const failed = isCurrent && Boolean(snapshot.error);

  return {
    data: !isCurrent || failed ? initialData : snapshot.data,
    error: isCurrent ? snapshot.error : "",
    loading: enabled && !isCurrent,
  };
}
