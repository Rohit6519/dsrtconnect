'use client'

import Link from 'next/link'

function InfoPanel({
  title,
  text,
  linkText,
  linkHref,
}: {
  title: string
  text: string
  linkText: string
  linkHref: string
}) {
  return (
    <div className="p-5 border border-white/[0.04] rounded-xl bg-[#121215]">
      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-2.5">
        {title}
      </p>
      <p className="text-[12.5px] text-zinc-300 leading-relaxed mb-3.5">{text}</p>
      <Link
        href={linkHref}
        className="text-[12px] font-semibold text-white hover:underline inline-flex items-center gap-1"
      >
        {linkText}
      </Link>
    </div>
  )
}

function ServicesPanel() {
  return (
    <div className="p-5 border border-white/[0.04] rounded-xl bg-[#121215] space-y-3">
      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">
        DSRT CONNECT SERVICES
      </p>
      <p className="text-[12.5px] text-zinc-300 leading-relaxed">
        Use the wider DSRT ecosystem to build, ship and grow your projects.
      </p>

      <div className="space-y-2 pt-1">
        <Link href="/looking-for" className="block group">
          <p className="text-[12px] font-bold text-white group-hover:underline">Looking For</p>
          <p className="text-[11px] text-zinc-500">Find collaborators and contributors.</p>
        </Link>
        <Link href="/ventures" className="block group">
          <p className="text-[12px] font-bold text-white group-hover:underline">Ventures</p>
          <p className="text-[11px] text-zinc-500">Turn a strong project into a full venture.</p>
        </Link>
        <Link href="/inbox" className="block group">
          <p className="text-[12px] font-bold text-white group-hover:underline">DSRT Mail</p>
          <p className="text-[11px] text-zinc-500">Communicate with collaborators.</p>
        </Link>
        <Link href="/coco" className="block group">
          <p className="text-[12px] font-bold text-white group-hover:underline">COCO</p>
          <p className="text-[11px] text-zinc-500">Plan, research and work across your projects.</p>
        </Link>
      </div>

      <div className="pt-2 border-t border-white/[0.04]">
        <Link
          href="/community"
          className="text-[12px] font-semibold text-white hover:underline inline-flex items-center gap-1"
        >
          Explore communities →
        </Link>
      </div>
    </div>
  )
}

export function ProjectsInfoPanels() {
  return (
    <div className="space-y-4">
      <InfoPanel
        title="BUILD IN PUBLIC"
        text="Your project profile is a public record of what you're building, learning and shipping. Keep it specific, well-documented and current — people evaluating collaborators or hiring notice details quickly."
        linkText="Learn how to present your project →"
        linkHref="/resources"
      />

      <InfoPanel
        title="DISCOVERABILITY"
        text="A complete project profile can appear across DSRT Connect where relevant. Your project may be surfaced to people based on domains, technologies, stage and activity."
        linkText="Manage visibility →"
        linkHref="/settings"
      />

      <ServicesPanel />

      <InfoPanel
        title="COLLABORATION"
        text="Open your project to collaborators when you're ready. Post open roles from your project page directly to DSRT Looking For — one canonical opportunity system."
        linkText="Find collaborators →"
        linkHref="/looking-for"
      />

      <div className="p-5 border border-white/[0.04] rounded-xl bg-[#0d0d10]">
        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-2">
          BUILDER NOTE
        </p>
        <p className="text-[12.5px] text-zinc-400 leading-relaxed italic">
          "A strong project isn't about polish. It's about clarity — what you're building,
          why it matters, and what you're learning as you go."
        </p>
      </div>
    </div>
  )
}