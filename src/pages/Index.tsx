import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Shield, 
  Users, 
  Calendar, 
  Award, 
  ChevronRight,
  Compass,
  Heart,
  TreePine
} from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Member Management',
    description: 'Complete member database with role-based access control',
  },
  {
    icon: Calendar,
    title: 'Activity Scheduling',
    description: 'Calendar-based activity planning and registration system',
  },
  {
    icon: Award,
    title: 'Certificate Generation',
    description: 'Automated certificate creation for achievements and events',
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'Enterprise-grade security with role-based permissions',
  },
];

const values = [
  { icon: Compass, text: 'Leadership' },
  { icon: Heart, text: 'Service' },
  { icon: TreePine, text: 'Conservation' },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold font-display">BSG</span>
            </div>
            <span className="font-semibold text-foreground hidden sm:block">
              Bharat Scouts & Guides
            </span>
          </div>
          <Button onClick={() => navigate('/login')}>
            Sign In
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 -z-10">
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v6h6v-6h-6zm0-10v6h6v-6h-6zm10 10v6h6v-6h-6zm0-10v6h6v-6h-6zm-20 20v6h6v-6h-6zm0-10v6h6v-6h-6zm-10 10v6h6v-6h-6zm0-10v6h6v-6h-6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
            <Shield className="h-4 w-4" />
            Silver Oak University Chapter
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display text-foreground mb-6 animate-slide-up">
            The Bharat Scouts
            <span className="block text-primary">&amp; Guides</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '100ms' }}>
            Administration Portal for managing members, activities, and resources.
            Built for discipline, service, and excellence.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <Button variant="hero" size="xl" onClick={() => navigate('/login')}>
              Access Portal
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
            <Button variant="outline" size="xl">
              Learn More
            </Button>
          </div>

          {/* Values */}
          <div className="flex items-center justify-center gap-8 mt-16 animate-fade-in" style={{ animationDelay: '400ms' }}>
            {values.map((value) => (
              <div key={value.text} className="flex items-center gap-2 text-muted-foreground">
                <value.icon className="h-5 w-5 text-secondary" />
                <span className="font-medium">{value.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
              Complete Management Solution
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything you need to manage your Scout & Guide unit efficiently
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                variant="stat"
                className="animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <Card className="overflow-hidden">
            <div 
              className="p-8 md:p-12 text-center"
              style={{ background: 'var(--gradient-hero)' }}
            >
              <blockquote className="text-xl md:text-2xl text-white/90 italic max-w-3xl mx-auto mb-6 leading-relaxed">
                "The Scout Motto is: BE PREPARED, which means you are always in a state 
                of readiness in mind and body to do your duty."
              </blockquote>
              <cite className="text-white/60 not-italic">
                — Lord Robert Baden-Powell, Founder
              </cite>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm font-display">BSG</span>
            </div>
            <span className="text-sm text-muted-foreground">
              The Bharat Scouts & Guides, Silver Oak University
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
