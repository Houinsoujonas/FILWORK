import BusinessSection from "../Components/BusinessSection";
import CreatorCategories from "../Components/CreatorCategories";
import CreatorSection from "../Components/CreatorSection";
import CTASection from "../Components/CTASection";
import FAQ from "../Components/FAQ";
import FeaturedCampaigns from "../Components/FeaturedCampaigns";
import Hero from "../Components/Hero";
import HowItWorks from "../Components/HowItWorks";




function Accueil() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <FeaturedCampaigns />
      <CreatorCategories />
      <CreatorSection />
      <BusinessSection />
      <FAQ />
      <CTASection />
      
     </>
  );
}

export default Accueil;