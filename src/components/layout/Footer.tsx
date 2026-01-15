import { Link } from 'react-router-dom';
import { Hammer, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="section-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                <Hammer className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">
                Artisan<span className="text-primary">Hub</span>
              </span>
            </Link>
            <p className="text-secondary-foreground/70 max-w-md">
              Connecting clients with verified, skilled artisans across Nigeria. 
              Quality craftsmanship, trusted service.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/find-artisan" className="text-secondary-foreground/70 hover:text-primary transition-colors">
                  Find an Artisan
                </Link>
              </li>
              <li>
                <Link to="/become-artisan" className="text-secondary-foreground/70 hover:text-primary transition-colors">
                  Become an Artisan
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-secondary-foreground/70">
                <Mail className="h-4 w-4 text-primary" />
                <span>info@artisanhub.ng</span>
              </li>
              <li className="flex items-center gap-2 text-secondary-foreground/70">
                <Phone className="h-4 w-4 text-primary" />
                <span>+234 800 123 4567</span>
              </li>
              <li className="flex items-center gap-2 text-secondary-foreground/70">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Lagos, Nigeria</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-secondary-foreground/10 mt-8 pt-8 text-center text-secondary-foreground/50 text-sm">
          <p>&copy; {new Date().getFullYear()} ArtisanHub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
