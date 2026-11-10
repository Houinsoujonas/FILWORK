import { Link } from "react-router-dom";
import { FiArrowRight, FiMapPin } from "react-icons/fi";

import { Badge } from "./AppUI";
import PlatformIcon from "./PlatformIcon";
import { compactNumber, creatorAudience, creatorPlace } from "../lib/creator";
import { formatMoney, initials } from "../lib/format";

export default function CreatorCard({ creator, to }) {
  const target = to || `/annuaire-createurs/${creator.id}`;
  const socials = creator.creatorSocials || [];
  const audience = creatorAudience(creator);
  const place = creatorPlace(creator);

  return (
<<<<<<< HEAD
    <Link className="public-card public-card--link" to={target}>
      <div className="public-card__top">
        <span className="public-card__company">
          {creator.profileImageUrl ? (
            <img src={creator.profileImageUrl} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className="ui-avatar">
              {String(creator.displayName || "C")[0]}
            </span>
          )}
          {creator.niche || "Créateur"}
=======
    <Link className="creator-card" to={target}>
      <div className="creator-card__head">
        {creator.profileImageUrl ? (
          <img className="creator-card__avatar" src={creator.profileImageUrl} alt="" />
        ) : (
          <span className="creator-card__avatar" aria-hidden="true">
            {initials(creator.displayName)}
          </span>
        )}
        <span className="creator-card__identity">
          <strong>{creator.displayName}</strong>
          <small>{creator.niche || "Créateur de contenu"}</small>
>>>>>>> 79d98d87328d46967b35c400b98945f8bc408d3b
        </span>
        <Badge value={creator.availabilityStatus} />
      </div>

      {creator.bio ? (
        <p className="creator-card__bio">{creator.bio}</p>
      ) : (
        <p className="creator-card__bio creator-card__bio--empty">
          Présentation à venir.
        </p>
      )}

      <dl className="creator-card__facts">
        <div>
          <dt>Audience</dt>
          <dd>{audience > 0 ? compactNumber(audience) : "-"}</dd>
        </div>
        <div>
          <dt>Tarif de départ</dt>
          <dd>
            {creator.startingRate
              ? formatMoney(creator.startingRate, creator.rateCurrency)
              : "Sur demande"}
          </dd>
        </div>
      </dl>

      <div className="creator-card__foot">
        <span className="creator-card__socials" aria-label={`${socials.length} réseau(x)`}>
          {socials.slice(0, 4).map((social) => (
            <PlatformIcon key={social.id || social.platform} platform={social.platform} />
          ))}
          {place && (
            <span className="creator-card__place">
              <FiMapPin aria-hidden="true" /> {place}
            </span>
          )}
        </span>
        <span className="creator-card__cta">
          Voir le profil <FiArrowRight aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
