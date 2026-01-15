import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Hammer, Users } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-20 bg-background">
      <div className="section-container">
        <div className="grid md:grid-cols-2 gap-8">
          {/* For Clients */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent p-8 lg:p-10 text-primary-foreground">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white/20 mb-6">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-display font-bold mb-4">
                Looking for an Artisan?
              </h3>
              <p className="text-primary-foreground/80 mb-6">
                Get connected with verified, skilled craftsmen who deliver quality work. 
                We handle the verification so you don't have to worry.
              </p>
              <Link to="/find-artisan">
                <Button size="lg" variant="secondary" className="group">
                  Find an Artisan
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>

          {/* For Artisans */}
          <div className="relative overflow-hidden rounded-2xl bg-secondary p-8 lg:p-10 text-secondary-foreground">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/20 mb-6">
                <Hammer className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-2xl font-display font-bold mb-4">
                Are You a Skilled Artisan?
              </h3>
              <p className="text-secondary-foreground/70 mb-6">
                Join our network of verified professionals and get connected with 
                clients looking for your expertise. Grow your business with us.
              </p>
              <Link to="/become-artisan">
                <Button size="lg" className="bg-primary hover:bg-primary/90 group">
                  Register Now
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
