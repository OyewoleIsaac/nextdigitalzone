import { Search, FileCheck, Handshake } from 'lucide-react';

const steps = [
  {
    icon: Search,
    title: 'Select a Service',
    description: 'Browse our categories and choose the type of artisan you need for your project.',
  },
  {
    icon: FileCheck,
    title: 'Submit Your Request',
    description: 'Fill out a simple verification form. We verify your identity to protect both parties.',
  },
  {
    icon: Handshake,
    title: 'Get Connected',
    description: 'Our team matches you with a verified artisan and facilitates the connection.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 bg-muted/50">
      <div className="section-container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A simple, secure process to connect you with skilled professionals
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <div 
              key={step.title} 
              className="relative text-center animate-fade-in-up"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-14 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/30 to-primary/10" />
              )}
              
              {/* Step Number */}
              <div className="relative inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 mb-6">
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-lg">
                  {index + 1}
                </div>
                <step.icon className="h-12 w-12 text-primary" />
              </div>
              
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
