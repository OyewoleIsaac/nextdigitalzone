import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import ndzLogo from '@/assets/ndz-logo.png';

export function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="section-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={ndzLogo} alt="NDZ Services 360" className="h-10 w-auto object-contain" />
...
          <p>&copy; {new Date().getFullYear()} NDZ Services 360. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
