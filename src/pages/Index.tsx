import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import WhyDifferent from "@/components/landing/WhyDifferent";
import CTA from "@/components/landing/CTA";

const Index = () => {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <section id="problem">
          <Problem />
        </section>
        <section id="how-it-works">
          <HowItWorks />
        </section>
        <section id="features">
          <Features />
        </section>
        <section id="why-different">
          <WhyDifferent />
        </section>
        <CTA />
      </main>
    </div>
  );
};

export default Index;