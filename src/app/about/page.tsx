import type { Metadata } from "next";
import AboutPage from "@/components/about/AboutPage";

export const metadata: Metadata = {
  title: "About | One Prime Studio",
  description:
    "One Prime Studio is a design and development studio in Hyderabad, founded by M. Nagaruthwik and A. Vinith. We give businesses a sharper identity, the leads that follow it, and the systems that run it, for clients all over the world.",
};

export default function About() {
  return <AboutPage />;
}
