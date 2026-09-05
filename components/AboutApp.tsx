"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { NameSearchHeader } from "@/components/NameSearchHeader";
import type { UiLanguage } from "@/lib/types";

const PEOPLE = [
  {
    id: "oung-seik", number: "01", name: "Oung Seik", role: "Software engineer · Idea catalyst",
    image: "/people/oung-seik.jpg", imageSource: "https://github.com/Oungseik", imageLabel: "GitHub",
    bio: "Oung Seik Nyan introduces himself as a back-end and full-stack developer. He studied mathematics at Mawlamyine University and shares an interest in computer science, systems programming, and Linux.",
    contribution: "Our conversation about the same cross-script naming problem gave me the push to return to YAMU and finish what I had started.",
    href: "https://github.com/Oungseik", linkLabel: "Explore his work",
    bioSource: "https://github.com/Oungseik", bioSourceLabel: "Profile / GitHub",
  },
  {
    id: "ahhtet-coonmon", number: "02", name: "AhHtet CoonMon", role: "Mon artist · Name contributor",
    image: "/people/ahhtet-coonmon.jpg", imageSource: "https://www.pinterest.com/ahhtet/", imageLabel: "Pinterest",
    bio: "AhHtet shares photography and illustration through his public creative profiles. He is the parent of Mi Panyun cartoon. He is a doctor by training with a Bachelor of Medicine, Bachelor of Surgery (M.B.B.S.) in Medical Science at the University of Medicine, Magway, Myanmar, from 2009 to 2015.",
    contribution: "Thank you for contributing names in Mon and English, and for sharing the cultural knowledge behind them.",
    href: "https://www.instagram.com/ahhtet93/", linkLabel: "Explore his work",
    bioSource: "https://www.linkedin.com/in/ahhtet-coonmon-35468a127/", bioSourceLabel: "Education / LinkedIn",
  },
] as const;

export function AboutApp() {
  const [lang, setLang] = useState<UiLanguage>("english");
  useEffect(() => {
    const stored = window.localStorage.getItem("ui-lang");
    if (stored === "mon" || stored === "burmese" || stored === "english") setLang(stored);
  }, []);
  function changeLang(next: UiLanguage) {
    setLang(next);
    window.localStorage.setItem("ui-lang", next);
  }

  return <div className="min-h-screen">
    <div className="hidden md:block"><SiteHeader lang={lang} onLang={changeLang} about /></div>
    <NameSearchHeader lang={lang} onLang={changeLang} />
    <main className="index-shell about-index">
      <nav className="about-path" aria-label="About page navigation">
        <Link href="/"><ArrowLeft size={16} aria-hidden />Name search</Link>
        <a href="#people">The people<ArrowRight size={16} aria-hidden /></a>
      </nav>
      <section className="about-intro" aria-labelledby="about-heading">
        <div>
          <p className="micro-label text-ash">YAMU / The story behind the index</p>
          <h1 id="about-heading">Names connect us.<br />People make it possible.</h1>
          <p className="about-lead">A reference for names across Mon, Burmese, and English — built from a teacher&apos;s everyday question, and made better by people who care.</p>
        </div>
        <div className="about-language-note" aria-label="Three scripts, one name">
          <span lang="mnw" className="font-script">ယၟု</span>
          <div><p>Mon / Burmese / English</p><p>Keep the roots. Find the spelling.</p></div>
        </div>
      </section>
      <section className="about-story" aria-labelledby="story-heading">
        <figure className="about-maintainer">
          <div className="about-maintainer-photo"><Image src="/IMG_3292.jpg" alt="Tao Mon Lae speaking during a technology presentation" fill priority sizes="(max-width: 767px) calc(100vw - 24px), 340px" className="object-cover object-[62%_center]" /></div>
          <figcaption><strong>Tao Mon Lae</strong><span>Teacher · Creator of YAMU</span></figcaption>
        </figure>
        <div className="about-story-copy">
          <p className="micro-label text-ash">01 / A note from the maintainer</p>
          <h2 id="story-heading">It started in a classroom.</h2>
          <p>I&apos;m Tao Mon Lae [တုမန်လဴ]. I am also known as Min Htet Min Aung. I studied computing and now work as a teacher and in refugee community in humanitarian fields. In schools, I kept seeing junior teachers unsure how to write Mon and Burmese names in English. YAMU - ယၟု began as a way to help.</p>
          <p>Teaching took me away from regular software work in 2018, but my interest in Mon language technology never went away. From Kuala Lumpur, I still explore localization, keyboards, and Mon subtitles — tools that help our language feel at home on modern devices.</p>
          <p>The name index sat unfinished until a conversation with Oung Seik brought me back to it. He had been thinking about the same problem. That shared concern became the reason to finish.</p>
          <p className="about-signature">A name should keep its roots, wherever it travels.</p>
        </div>
      </section>
      <section id="people" className="about-people" aria-labelledby="people-heading">
        <div className="about-section-heading"><div><p className="micro-label text-ash">02 / With thanks</p><h2 id="people-heading">People behind the names.</h2></div><p>Different skills. A shared care for the language.</p></div>
        <div className="about-people-grid">
          {PEOPLE.map(person => <article className="about-person" key={person.id} aria-labelledby={person.id + "-heading"}>
            <div className="about-person-identity">
              <div className="about-person-photo"><Image src={person.image} alt={person.name + " — public profile portrait"} width={160} height={160} sizes="(max-width: 767px) 88px, 160px" /></div>
              <div className="min-w-0"><span className="micro-label text-ash">Contributor / {person.number}</span><h3 id={person.id + "-heading"}>{person.name}</h3><p>{person.role}</p></div>
            </div>
            <p className="about-person-bio">{person.bio}</p>
            <a className="about-bio-source" href={person.bioSource} target="_blank" rel="noreferrer">{person.bioSourceLabel}<ArrowUpRight size={14} aria-hidden /></a>
            <div className="about-contribution"><p className="micro-label text-ash">Their part in YAMU</p><p>{person.contribution}</p></div>
            <div className="about-person-links"><a href={person.href} target="_blank" rel="noreferrer">{person.linkLabel}<ArrowUpRight size={17} aria-hidden /></a><a href={person.imageSource} target="_blank" rel="noreferrer" aria-label={person.name + " portrait source: " + person.imageLabel}>Photo: {person.imageLabel}</a></div>
          </article>)}
        </div>
      </section>
      <section className="about-invitation" aria-labelledby="invitation-heading">
        <div><p className="micro-label text-ash">03 / Keep it useful</p><h2 id="invitation-heading">One good spelling helps<br />the next person.</h2><p>Find a name. Suggest a correction. Or help improve the code.<br className="hidden md:block" /> This index is still growing.</p></div>
        <div className="about-actions"><Link href="/" className="about-search-link">Search names<ArrowRight size={20} aria-hidden /></Link><a href="https://github.com/TaoMonLae/yamu" target="_blank" rel="noreferrer">Contribute on GitHub<ArrowUpRight size={18} aria-hidden /></a></div>
      </section>
      <footer className="about-footer"><span>Built with care for Mon names.</span><Link href="/admin">Team access<ArrowUpRight size={14} aria-hidden /></Link></footer>
    </main>
  </div>;
}
