import { FiInbox } from "react-icons/fi";

export default function EmptyState({ title, description, action }) {
  return (
    <section className="empty-state" aria-live="polite">
      <span className="empty-state__icon"><FiInbox aria-hidden="true" /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}
