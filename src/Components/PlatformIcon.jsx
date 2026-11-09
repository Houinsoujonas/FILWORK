import {
  FiFacebook,
  FiGlobe,
  FiInstagram,
  FiLinkedin,
  FiTwitch,
  FiYoutube,
} from "react-icons/fi";
import { FaTiktok } from "react-icons/fa";

const ICONS = {
  INSTAGRAM: FiInstagram,
  TIKTOK: FaTiktok,
  YOUTUBE: FiYoutube,
  LINKEDIN: FiLinkedin,
  FACEBOOK: FiFacebook,
  TWITCH: FiTwitch,
};

export default function PlatformIcon({ platform, ...props }) {
  const Icon = ICONS[platform] || FiGlobe;

  return <Icon aria-hidden="true" {...props} />;
}
