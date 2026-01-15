import { PublicLayout } from '@/components/layout/PublicLayout';
import { Hero } from '@/components/home/Hero';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { HowItWorks } from '@/components/home/HowItWorks';
import { CTASection } from '@/components/home/CTASection';

const Index = () => {
  return (
    <PublicLayout>
      <Hero />
      <CategoryGrid />
      <HowItWorks />
      <CTASection />
    </PublicLayout>
  );
};

export default Index;
