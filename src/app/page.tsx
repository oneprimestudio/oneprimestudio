import DitherSeam from "@/components/DitherSeam";
import Hero from "@/components/hero/Hero";
import Intro from "@/components/home/Intro";
import Brief from "@/components/home/Brief";
import Principles from "@/components/home/Principles";
import Projects from "@/components/home/Projects";
import Services from "@/components/home/Services";
import WorldSection from "@/components/world/WorldSection";

export default function Home() {
  return (
    <main>
      <Hero />
      <Intro />
      {/* the studio's chalk hands over to the services photograph's ground at its top */}
      <DitherSeam from="#f7f6f2" to="#171e17" />
      <Services />
      <Projects />
      <Principles />
      <WorldSection index="[005]" />
      <Brief />
    </main>
  );
}
