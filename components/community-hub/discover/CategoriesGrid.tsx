'use client'

import Link from 'next/link'
import { 
  Globe, Monitor, Cpu, Microscope, Briefcase, CircleDollarSign, 
  ShoppingCart, HeartPulse, Dna, GraduationCap, Scale, Landmark, 
  Shield, Crosshair, Tractor, Zap, Factory, Wrench, HardHat, 
  Pickaxe, Car, Plane, Truck, Antenna, TreePine, Building, 
  Clapperboard, Film, PenTool, Coffee 
} from 'lucide-react'

// Exactly 30 Professional Categories with strictly mapped icons
export const CATEGORY_DATA = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'technology', label: 'Technology', icon: Monitor },
  { id: 'ai-ml', label: 'AI & Machine Learning', icon: Cpu },
  { id: 'science-research', label: 'Science & Research', icon: Microscope },
  { id: 'business', label: 'Business', icon: Briefcase },
  { id: 'finance', label: 'Finance', icon: CircleDollarSign },
  { id: 'commerce', label: 'Commerce', icon: ShoppingCart },
  { id: 'healthcare', label: 'Healthcare', icon: HeartPulse },
  { id: 'biotechnology', label: 'Biotechnology', icon: Dna },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'legal', label: 'Legal', icon: Scale },
  { id: 'government', label: 'Government', icon: Landmark },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'defense', label: 'Defense', icon: Crosshair },
  { id: 'agriculture', label: 'Agriculture', icon: Tractor },
  { id: 'energy', label: 'Energy', icon: Zap },
  { id: 'manufacturing', label: 'Manufacturing', icon: Factory },
  { id: 'industrial', label: 'Industrial', icon: Wrench },
  { id: 'construction', label: 'Construction', icon: HardHat },
  { id: 'mining', label: 'Mining', icon: Pickaxe },
  { id: 'automotive', label: 'Automotive', icon: Car },
  { id: 'aerospace', label: 'Aerospace', icon: Plane },
  { id: 'logistics', label: 'Transportation & Logistics', icon: Truck },
  { id: 'telecom', label: 'Telecommunications', icon: Antenna },
  { id: 'environment', label: 'Environment', icon: TreePine },
  { id: 'real-estate', label: 'Real Estate', icon: Building },
  { id: 'media', label: 'Media', icon: Clapperboard },
  { id: 'entertainment', label: 'Entertainment', icon: Film },
  { id: 'design-creative', label: 'Design & Creative', icon: PenTool },
  { id: 'hospitality', label: 'Food & Hospitality', icon: Coffee },
]

export function CategoriesGrid() {
  // Split the 30 categories into 3 rows of 10
  const row1 = CATEGORY_DATA.slice(0, 10)
  const row2 = CATEGORY_DATA.slice(10, 20)
  const row3 = CATEGORY_DATA.slice(20, 30)

  return (
    <section className="relative overflow-hidden py-4 -mx-4 md:-mx-8">
      {/* Inline styles to guarantee marquee animation works without touching tailwind config */}
      <style>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scroll-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .marquee-left {
          display: flex;
          width: max-content;
          animation: scroll-left 45s linear infinite;
        }
        .marquee-right {
          display: flex;
          width: max-content;
          animation: scroll-right 45s linear infinite;
        }
        .marquee-track:hover .marquee-left,
        .marquee-track:hover .marquee-right {
          animation-play-state: paused;
        }
      `}</style>

      <div className="mb-6 px-4 md:px-8">
        <p className="label-mono text-white/50">Categories</p>
      </div>

      {/* Gradient fading masks on left and right edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      <div className="space-y-4 marquee-track">
        
        {/* ROW 1: Moves Left */}
        <div className="marquee-left gap-4 pl-4 hover:cursor-pointer">
          {/* Duplicate array for seamless infinite scroll */}
          {[...row1, ...row1].map((c, i) => (
            <CategoryChip key={`${c.id}-${i}`} category={c} />
          ))}
        </div>

        {/* ROW 2: Moves Right */}
        <div className="marquee-right gap-4 pl-4 hover:cursor-pointer" style={{ transform: 'translateX(-50%)' }}>
          {[...row2, ...row2].map((c, i) => (
            <CategoryChip key={`${c.id}-${i}`} category={c} />
          ))}
        </div>

        {/* ROW 3: Moves Left (slightly faster) */}
        <div className="marquee-left gap-4 pl-4 hover:cursor-pointer" style={{ animationDuration: '40s' }}>
          {[...row3, ...row3].map((c, i) => (
            <CategoryChip key={`${c.id}-${i}`} category={c} />
          ))}
        </div>

      </div>
    </section>
  )
}

function CategoryChip({ category }: { category: typeof CATEGORY_DATA[0] }) {
  const Icon = category.icon
  return (
    <Link
      href={`/community?category=${category.id}`}
      className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-white/[0.06] bg-[#0c0c12] hover:bg-white/[0.05] hover:border-white/[0.15] transition-all flex-shrink-0"
    >
      <Icon className="w-4 h-4 text-white/50" strokeWidth={1.75} />
      <span className="text-[13.5px] font-medium text-white/80 whitespace-nowrap">
        {category.label}
      </span>
    </Link>
  )
}