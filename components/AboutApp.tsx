"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { DepthCard } from "@/components/reactbits/DepthCard";
import type { UiLanguage } from "@/lib/types";

const CREDITS = [
  {
    number: "01",
    name: "Oung Seik",
    role: "Idea catalyst / fellow builder",
    note: "For believing, as I do, that Mon and Burmese names need a reliable cross-script reference, and for helping me return to an idea I had set aside.",
    href: "https://github.com/Oungseik",
    linkLabel: "GitHub profile",
  },
  {
    number: "02",
    name: "AhHtet Coon Mon",
    role: "Doctor / Mon artist / contributor",
    note: "For contributing names in Mon and English, and for sharing the cultural knowledge behind them.",
    href: "https://www.facebook.com/ahhtet93",
    linkLabel: "Facebook profile",
  },
] as const;

export function AboutApp() {
  const [lang, setLang] = useState<UiLanguage>("english");

  useEffect(() => {
    const stored = window.localStorage.getItem("ui-lang");
    if (stored === "mon" || stored === "burmese" || stored === "english") {
      setLang(stored);
    }
  }, []);

  function changeLang(next: UiLanguage) {
    setLang(next);
    window.localStorage.setItem("ui-lang", next);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader lang={lang} onLang={changeLang} about />

      <main className="index-shell pb-20 pt-10 md:pt-14">
        <section aria-labelledby="about-heading">
          <p className="micro-label flex items-center gap-3 text-ash">
            <span className="h-px w-12 bg-ink" aria-hidden="true" />
            About / Maintainer&apos;s note
          </p>

          <div className="mt-8 grid gap-10 border-b border-ink pb-10 lg:grid-cols-[minmax(0,1.18fr)_minmax(360px,.72fr)] lg:items-end lg:gap-12">
            <div className="lg:self-center lg:pb-1">
              <p lang="mnw" className="font-script-display text-[clamp(42px,6vw,76px)] font-bold text-accent">
                ယၟု
              </p>
              <h1
                id="about-heading"
                className="mt-3 max-w-[12ch] text-balance text-[clamp(48px,6.2vw,88px)] font-semibold leading-[0.9] tracking-[-0.055em] text-ink"
              >
                A name should keep its roots, wherever it travels.
              </h1>
            </div>

            <aside aria-label="Developer profile" className="self-end">
              <DepthCard className="group mx-auto w-full max-w-[520px] lg:max-w-none">
                <figure className="border border-ink bg-ink">
                  <div className="relative aspect-[4/3] overflow-hidden lg:aspect-[5/6]">
                    <Image
                      src="/IMG_3292.jpg"
                      alt="Tao Mon Lae speaking during a technology presentation"
                      fill
                      priority
                      sizes="(max-width: 1023px) calc(100vw - 24px), 430px"
                      className="object-cover object-[62%_center] transition-[filter] duration-300 group-hover:brightness-90"
                    />
                    <span className="absolute left-0 top-0 bg-accent px-3 py-2 font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-on-accent">
                      Portrait / 001
                    </span>
                  </div>
                  <figcaption className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-ink bg-canvas px-4 py-3 text-ink">
                    <span className="font-display text-[16px] font-semibold uppercase tracking-[-0.01em]">Tao Mon Lae</span>
                    <span className="micro-label text-ash">Speaking / Technology</span>
                  </figcaption>
                </figure>
              </DepthCard>

              <dl className="border-x border-b border-pewter bg-paper text-[13px]">
                <div className="grid grid-cols-[92px_1fr] border-b border-pewter py-3">
                  <dt className="micro-label pl-4 text-ash">Practice</dt>
                  <dd className="pr-4 text-ink">Teacher / computer graduate</dd>
                </div>
                <div className="grid grid-cols-[92px_1fr] border-b border-pewter py-3">
                  <dt className="micro-label pl-4 text-ash">Based</dt>
                  <dd className="pr-4 text-ink">Kuala Lumpur, Malaysia</dd>
                </div>
                <div className="grid grid-cols-[92px_1fr] py-3">
                  <dt className="micro-label pl-4 text-ash">Focus</dt>
                  <dd className="pr-4 text-ink">Mon language technology</dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>

        <section className="grid border-b border-pewter lg:grid-cols-[220px_minmax(0,1fr)]" aria-labelledby="story-heading">
          <div className="border-b border-pewter py-8 lg:border-b-0 lg:border-r lg:py-12">
            <p className="font-display text-[42px] font-semibold leading-none tracking-[-0.04em]">01</p>
            <p className="micro-label mt-3 text-ash">Origin / The person behind Yamu</p>
          </div>
          <div className="py-8 lg:px-14 lg:py-12">
            <h2 id="story-heading" className="max-w-[17ch] text-balance text-[clamp(36px,5vw,64px)] font-semibold leading-[0.96] tracking-[-0.045em]">
              I teach for a living. I still build things.
            </h2>
            <div className="mt-10 grid gap-8 text-pretty text-[16px] leading-8 text-ash md:grid-cols-2 md:gap-x-12">
              <div className="space-y-7">
                <p>
                  Hi, I&apos;m Tao Mon Lae. I studied computing, but I work as a teacher. I still code for fun, though I no longer call myself a programmer or developer. Software used to be my main passion. In 2018, teaching pulled me away from building it regularly.
                </p>
                <p>
                  My interest in Mon language technology never went away. I care about localization, keyboards, and tools that make it easier to use Mon on modern devices. I now live in Kuala Lumpur, where I&apos;m also exploring Mon subtitles for films.
                </p>
              </div>
              <div className="space-y-7 md:border-l md:border-pewter md:pl-12">
                <p>
                  Yamu began with something I kept seeing in schools: many junior teachers were unsure how to write Mon and Burmese names in English. I wanted to help, but the project sat unfinished while I worked on other private projects.
                </p>
                <p>
                  Years later, I met Oung Seik and learned that he had been thinking about the same problem. Our conversation gave me the push I needed to pick up Yamu again and finish what I had started.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12" aria-labelledby="credits-heading">
          <div className="grid gap-8 border-b border-ink pb-8 md:grid-cols-[1fr_1fr] md:items-end">
            <div>
              <p className="micro-label text-ash">02 / Honorable mentions</p>
              <h2 id="credits-heading" className="mt-5 text-[clamp(44px,6vw,78px)] font-semibold leading-[0.92] tracking-[-0.05em]">
                Thanks to the people who helped.
              </h2>
            </div>
            <p className="max-w-[50ch] text-pretty text-[15px] leading-7 text-ash md:justify-self-end">
              Yamu would not be here without people who understood why it mattered and were willing to help.
            </p>
          </div>

          <div>
            {CREDITS.map((credit) => (
              <article key={credit.number} className="group grid border-b border-pewter py-7 md:grid-cols-[72px_1fr_1.4fr_auto] md:items-start md:gap-8">
                <p className="font-display text-[30px] font-semibold leading-none text-ash">{credit.number}</p>
                <div className="mt-4 md:mt-0">
                  <h3 className="text-[24px] font-semibold leading-tight tracking-[-0.025em]">{credit.name}</h3>
                  <p className="micro-label mt-2 text-ash">{credit.role}</p>
                </div>
                <p className="mt-4 max-w-[54ch] text-pretty text-[14px] leading-7 text-ash md:mt-0">{credit.note}</p>
                <a
                  href={credit.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-3 border-b border-ink pb-1 font-display text-[12px] font-semibold uppercase tracking-[0.06em] text-ink no-underline transition-colors hover:border-accent hover:text-accent md:mt-0"
                >
                  {credit.linkLabel}
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">↗</span>
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="grid border border-ink bg-paper md:grid-cols-[220px_1fr_auto]" aria-labelledby="invitation-heading">
          <div className="flex min-h-36 items-center border-b border-ink bg-ink px-6 text-canvas md:border-b-0 md:border-r">
            <p className="font-display text-[48px] font-semibold leading-none">03</p>
          </div>
          <div className="px-6 py-8 md:px-10">
            <p className="micro-label text-ash">An open invitation</p>
            <h2 id="invitation-heading" className="mt-4 max-w-[22ch] text-balance text-[30px] font-semibold leading-tight tracking-[-0.035em]">
              Fork the code. Correct a spelling. Add a name. Keep the index useful.
            </h2>
            <p className="mt-4 max-w-[66ch] text-[14px] leading-7 text-ash">
              Yamu is still growing. If it helps even one teacher, student, or family feel more confident about a name&apos;s spelling, the work is worthwhile.
            </p>
          </div>
          <Link href="/" className="flex min-h-20 items-center justify-between gap-8 border-t border-ink bg-accent px-6 font-display text-[13px] font-semibold uppercase tracking-[0.06em] text-on-accent no-underline transition-colors hover:bg-[var(--index-accent-dark)] md:min-h-full md:border-l md:border-t-0">
            Search Yamu
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
    </div>
  );
}
