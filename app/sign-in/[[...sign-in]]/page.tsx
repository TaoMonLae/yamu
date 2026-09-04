import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { getBrandSettings } from "@/lib/branding";

export default function SignInPage() {
  const branding = getBrandSettings();
  return (
    <main className="grid min-h-screen bg-[#fafaf8] lg:grid-cols-[minmax(0,0.9fr)_minmax(540px,1.1fr)]">
      <section className="relative hidden overflow-hidden bg-[#141415] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
        <Link href="/" className="relative flex items-center gap-3 text-white no-underline"><BrandMark logoUrl={branding.logoUrl} /><span><span className="block text-[14px] font-semibold">{branding.siteName}</span><span className="block font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">Catalog operations</span></span></Link>
        <div className="relative max-w-xl"><p lang="mnw" className="font-script text-[72px] font-bold leading-none text-[var(--index-accent)]">ယၟု</p><h1 className="mt-6 text-[clamp(44px,5vw,74px)] font-semibold leading-[0.92] tracking-[-0.055em]">One catalog.<br />Three scripts.</h1><p className="mt-7 max-w-[48ch] text-[13px] leading-6 text-white/58">Secure access for editors, managers, and administrators maintaining verified Mon, Burmese, and English name forms.</p></div>
        <div className="relative grid grid-cols-3 border-l border-t border-white/15">{["Clerk secured", "Role enforced", "Audit ready"].map((item, index) => <div key={item} className="border-b border-r border-white/15 p-4"><p className="font-mono text-[9px] text-white/35">0{index + 1}</p><p className="mt-2 text-[11px] text-white/70">{item}</p></div>)}</div>
      </section>
      <section className="flex min-h-screen flex-col bg-[#fafaf8] p-5 sm:p-8">
        <div className="flex items-center justify-between"><Link href="/" className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#656661] no-underline">← Public catalog</Link><span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#777873]">Invite only</span></div>
        <div className="flex flex-1 items-center justify-center py-10"><div className="w-full max-w-[430px]"><p className="mb-5 font-mono text-[10px] uppercase tracking-[0.13em] text-[#777873]">Restricted workspace / sign in</p><SignIn routing="path" path="/sign-in" fallbackRedirectUrl="/admin" appearance={{ elements: { footerAction: "hidden" } }} /></div></div>
      </section>
    </main>
  );
}
