import type { Metadata } from "next";
import WorkPage from "@/components/work/WorkPage";

export const metadata: Metadata = {
  title: "Work | One Prime Studio",
  description:
    "An index of the studio's work: a salon's whole system, our own identity, this site and the films that launched it, each designed and built end to end in one place.",
};

export default function Projects() {
  return <WorkPage />;
}
