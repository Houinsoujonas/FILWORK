import { Link } from "react-router-dom";
import { FiArrowUpRight, FiInstagram, FiMapPin } from "react-icons/fi";

import { formatMoney, label } from "../lib/format";

export default function CreatorCard({ creator, to }) {
  const target = to || `/annuaire-createurs/${creator.id}`;

  return (
    <Link className="public-card public-card--link" to={target}>
      <div className="public-card__top">
        <span className="public-card__company">
          {creator.profileImageUrl ? (
            <img src={creator.profileImageUrl} alt="" />
          ) : (
            <span className="ui-avatar">
              {String(creator.displayName || "C")[0]}
            </span>
          )}
          {creator.niche || "Créateur"}
        </span>
        <FiArrowUpRight aria-hidden="true" />
      </div>

      <h3>{creator.displayName}</h3>
      <p className="public-card__excerpt">{creator.bio || "Profil créateur FILWORK."}</p>

      <div className="public-card__meta">
        {creator.location && (
          <span className="ui-row">
            <FiMapPin aria-hidden="true" /> {creator.location}
          </span>
        )}
        {creator.startingRate && (
          <span>
            À partir de {formatMoney(creator.startingRate, creator.rateCurrency)}
          </span>
        )}
        {creator.creatorSocials?.length > 0 && (
          <span className="ui-row">
            <FiInstagram aria-hidden="true" /> {creator.creatorSocials.length}{" "}
            réseau{creator.creatorSocials.length > 1 ? "x" : ""}
          </span>
        )}
        <span>{label(creator.availabilityStatus)}</span>
      </div>
    </Link>
  );
}
