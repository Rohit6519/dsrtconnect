import Link from 'next/link'
import { DsrtPage, DsrtSection, DsrtPanel, DsrtGrid } from '@/components/dsrt'

export default function GamesPage() {
  const games = [
    {
      id: 'pingpong',
      name: 'Emoji PingPong',
      icon: '🏓',
      description: 'Classic ping pong. Take a quick break.',
      href: '/games/pingpong',
    },
    {
      id: 'blockcube',
      name: 'Block Cube',
      icon: '🧊',
      description: 'Stack the blocks, beat the clock.',
      href: '/games/blockcube',
    },
  ]

  return (
    <DsrtPage width="narrow" className="py-8">
      <DsrtSection
        title="DSRT Arcade"
        description="Take a quick break between builds. More games coming soon."
        headerVariant="large"
        className="mb-8"
      />

      <DsrtGrid cols={{ base: 1, md: 2 }} gap="md">
        {games.map((game) => (
          <Link key={game.id} href={game.href} className="group h-full">
            <DsrtPanel padding="lg" className="h-full hover:border-white/[0.14] group-hover:-translate-y-0.5 transition-all text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-3xl shadow-inner">
                {game.icon}
              </div>
              <div>
                <h3 className="font-bold text-[16px] text-white">{game.name}</h3>
                <p className="text-[13px] text-white/50 mt-1 max-w-[200px] mx-auto">
                  {game.description}
                </p>
              </div>
            </DsrtPanel>
          </Link>
        ))}
      </DsrtGrid>
    </DsrtPage>
  )
}