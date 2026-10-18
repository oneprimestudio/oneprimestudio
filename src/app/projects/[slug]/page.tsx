import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CasePage from "@/components/work/CasePage";
import { WORK } from "@/lib/work";

type Props = { params: Promise<{ slug: string }> };

// one page per project, prerendered; any other slug is a 404
export const dynamicParams = false;

export function generateStaticParams() {
  return WORK.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const work = WORK.find((w) => w.slug === slug);
  if (!work) return {};
  return {
    // not "<title> | One Prime Studio": one of the cases is the studio itself
    title: `Case study: ${work.title}`,
    // the copy's em dashes read as commas here: metadata carries none
    description: `${work.line} ${work.summary}`.replace(/\s*—\s*/g, ", "),
  };
}

export default async function Project({ params }: Props) {
  const { slug } = await params;
  if (!WORK.some((w) => w.slug === slug)) notFound();
  // keyed, so going from one case to the next mounts a fresh page (its reveals, splits and figures)
  return <CasePage key={slug} slug={slug} />;
}
