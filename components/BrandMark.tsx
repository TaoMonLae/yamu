"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function BrandMark({
  logoUrl,
  className = "h-10 w-10",
}: {
  logoUrl: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [logoUrl]);

  return (
    <span className={`flex shrink-0 items-center justify-center bg-[var(--index-accent)] p-1 ${className}`}>
      {logoUrl && !failed ? (
        <Image
          src={logoUrl}
          alt=""
          width={40}
          height={40}
          unoptimized
          priority
          onError={() => setFailed(true)}
          className="h-full w-full bg-white object-contain"
        />
      ) : (
        <span lang="mnw" className="font-script text-xl font-bold text-white">ယ</span>
      )}
    </span>
  );
}
