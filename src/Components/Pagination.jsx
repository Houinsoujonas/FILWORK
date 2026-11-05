import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function Pagination({ page, totalPages, total, onChange }) {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  return (
    <nav className="ui-pagination" aria-label="Pagination">
      <button
        type="button"
        className="ui-button ui-button--ghost ui-button--small"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        <FiChevronLeft aria-hidden="true" /> Précédent
      </button>

      <span className="ui-small ui-muted">
        Page {page} sur {totalPages}
        {typeof total === "number" ? ` · ${total} résultat(s)` : ""}
      </span>

      <button
        type="button"
        className="ui-button ui-button--ghost ui-button--small"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Suivant <FiChevronRight aria-hidden="true" />
      </button>
    </nav>
  );
}
