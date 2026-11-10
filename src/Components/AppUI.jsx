import { Link } from "react-router-dom";
import {
  FiAlertCircle,
  FiArrowRight,
  FiArrowUpRight,
  FiCheckCircle,
  FiInfo,
  FiLoader,
} from "react-icons/fi";

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
    <div
      className={`ui-alert ui-alert--${type}`}
      role={type === "error" ? "alert" : "status"}
    >
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

export function Stat({
  label: statLabel,
  value,
  hint,
  icon: Icon,
  to,
  attention = false,
}) {
  const className = `ui-stat${attention ? " ui-stat--attention" : ""}`;
  const content = (
    <>
      {(Icon || to) && (
        <span className="ui-stat__top">
          {Icon ? (
            <span className="ui-stat__icon" aria-hidden="true">
              <Icon />
            </span>
          ) : (
            <span />
          )}
          {to && <FiArrowUpRight className="ui-stat__arrow" aria-hidden="true" />}
        </span>
      )}
      <span className="ui-stat__label">{statLabel}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </>
  );

  if (to) {
    return (
      <Link className={className} to={to}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

export function Shortcut({ to, icon: Icon, title, description }) {
  return (
    <Link className="ui-shortcut" to={to}>
      {Icon && (
        <span className="ui-shortcut__icon" aria-hidden="true">
          <Icon />
        </span>
      )}
      <span className="ui-shortcut__text">
        <strong>{title}</strong>
        {description && <small>{description}</small>}
      </span>
      <FiArrowRight aria-hidden="true" />
    </Link>
  );
}

export function Progress({ label: progressLabel, value, max = 100 }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="ui-progress">
      <div className="ui-progress__head">
        <span>{progressLabel}</span>
        <strong>{percent} %</strong>
      </div>
      <div
        className="ui-progress__track"
        role="progressbar"
        aria-label={progressLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span className="ui-progress__bar" style={{ width: `${percent}%` }} />
      </div>
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
    return <img className="ui-avatar" src={src} alt="" loading="lazy" decoding="async" />;
  }

  return <span className="ui-avatar">{text || "F"}</span>;
}
