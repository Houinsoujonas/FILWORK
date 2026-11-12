import { Link } from "react-router-dom";
import { FiArrowUpRight, FiCalendar, FiMapPin, FiUsers } from "react-icons/fi";

import { formatDate, formatMoney, label } from "../lib/format";

export default function CampaignCard({ campaign, to }) {
  const target = to || `/campagnes/${campaign.id}`;

  return (
    <Link className="public-card public-card--link" to={target}>
      <div className="public-card__top">
        <span className="public-card__company">
          {campaign.companyProfile?.logoUrl ? (
            <img src={campaign.companyProfile.logoUrl} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className="ui-avatar">
              {String(campaign.companyProfile?.companyName || "F")[0]}
            </span>
          )}
          {campaign.companyProfile?.companyName || "Entreprise FILWORK"}
        </span>
        <FiArrowUpRight aria-hidden="true" />
      </div>

      <h3>{campaign.title}</h3>
      <p className="public-card__excerpt">{campaign.description}</p>

      <div className="public-card__meta">
        <span>{formatMoney(campaign.budget, campaign.currency)}</span>
        {campaign.location && (
          <span className="ui-row">
            <FiMapPin aria-hidden="true" /> {campaign.location}
          </span>
        )}
        {campaign.platforms?.length > 0 && (
          <span className="ui-row">
            <FiUsers aria-hidden="true" />{" "}
            {campaign.platforms.map((platform) => label(platform)).join(", ")}
          </span>
        )}
        {campaign.publishedAt && (
          <span className="ui-row">
            <FiCalendar aria-hidden="true" /> {formatDate(campaign.publishedAt)}
          </span>
        )}
      </div>
    </Link>
  );
}
