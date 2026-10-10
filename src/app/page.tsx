import Hero from "@/components/hero/Hero";
import Intro from "@/components/home/Intro";
import Principles from "@/components/home/Principles";
import PrimeSection from "@/components/PrimeSection";

export default function Home() {
  return (
    <main>
      <Hero />
      <Intro />
      <Principles />
      <PrimeSection />
    </main>
  );
}
