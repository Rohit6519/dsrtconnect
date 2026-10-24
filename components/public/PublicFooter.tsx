import Link from 'next/link'

export function PublicFooter() {
  return (
    <footer className="relative py-16 px-4 border-t border-white/10">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <span className="text-xl font-semibold text-white">DSRT</span>
            </div>
            <p className="text-sm text-white/50 max-w-sm leading-relaxed">
              An AI-native builder ecosystem for the next generation of
              founders, engineers, and researchers.
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-4">
              Product
            </p>
            <div className="space-y-2">
              {[
                { name: 'DSRT', href: '/' },
                { name: 'Hackathons', href: '/hackathons' },
                { name: 'Developers', href: '/developers' },
              ].map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="block text-sm text-white/60 hover:text-white transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-4">
              Company
            </p>
            <div className="space-y-2">
              {[
                { name: 'About', href: '/company' },
                { name: 'Social', href: '/social' },
                { name: 'Careers', href: '/company#careers' },
              ].map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="block text-sm text-white/60 hover:text-white transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-4">
              Legal
            </p>
            <div className="space-y-2">
              <a
                href="#"
                className="block text-sm text-white/60 hover:text-white transition-colors"
              >
                Privacy
              </a>
              <a
                href="#"
                className="block text-sm text-white/60 hover:text-white transition-colors"
              >
                Terms
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <p className="text-xs text-white/40">
            © 2025 DSRT · dsrtai.com
          </p>
          <p className="text-[10px] text-white/30 italic tracking-wider">
            dedicated to my beautiful wife hajra
          </p>
        </div>
      </div>
    </footer>
  )
}