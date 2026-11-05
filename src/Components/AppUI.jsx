import { FiAlertCircle, FiCheckCircle, FiInfo, FiLoader } from "react-icons/fi";

import { label } from "../lib/format";

export function Page({ eyebrow, title, description, actions, children }) {
  return (
    <div className="ui-page">
      <header className="ui-page__head">
        <div>
          {eyebrow && <span className="section-label">{eyebrow}</span>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="ui-page__actions">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function Alert({ type = "info", children }) {
  if (!children) {
    return null;
  }

  const Icon =
    type === "error"
      ? FiAlertCircle
      : type === "success"
        ? FiCheckCircle
        : FiInfo;

  return (
    <div className={`ui-alert ui-alert--${type}`} role="status">
      <Icon aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function Badge({ value, children }) {
  const tone = {
    PUBLISHED: "green",
    ACTIVE: "green",
    ACCEPTED: "green",
    APPROVED: "green",
    PAID: "green",
    AVAILABLE: "green",
    COMPLETED: "blue",
    SUBMITTED: "blue",
    PENDING: "gold",
    PLANNED: "gold",
    LIMITED: "gold",
    DRAFT: "gray",
    PAUSED: "gold",
    REVISION_REQUESTED: "gold",
    REJECTED: "red",
    CANCELLED: "red",
    FAILED: "red",
    UNAVAILABLE: "red",
    WITHDRAWN: "red",
    CLOSED: "gray",
  }[value];

  return (
    <span className={`ui-badge${tone ? ` ui-badge--${tone}` : ""}`}>
      {children ?? label(value)}
    </span>
  );
}

export function Panel({ title, description, actions, children, className = "" }) {
  return (
    <section className={`ui-panel ${className}`.trim()}>
      {(title || actions) && (
        <header className="ui-panel__head">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="ui-panel__actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label: statLabel, value, hint }) {
  return (
    <div className="ui-stat">
      <span>{statLabel}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function Loading({ label: text = "Chargement…" }) {
  return (
    <p className="ui-loading" role="status">
      <FiLoader aria-hidden="true" /> {text}
    </p>
  );
}

export function Field({ label: fieldLabel, hint, children, wide = false }) {
  return (
    <label className={`ui-field${wide ? " ui-field--wide" : ""}`}>
      <span>{fieldLabel}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Avatar({ name, src }) {
  const text = String(name || "FILWORK")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (src) {
    return <img className="ui-avatar" src={src} alt="" />;
  }

  return <span className="ui-avatar">{text || "F"}</span>;
}
