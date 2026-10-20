import BusinessSection from "../Components/BusinessSection";
import CreatorSection from "../Components/CreatorSection";
import CTASection from "../Components/CTASection";
import FeaturedCampaigns from "../Components/FeaturedCampaigns";
import Hero from "../Components/Hero";
import HowItWorks from "../Components/HowItWorks";




function Accueil() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <FeaturedCampaigns />
      <CreatorSection />
      <BusinessSection />
      <CTASection />
      
     </>
  );
}

export default Accueil;