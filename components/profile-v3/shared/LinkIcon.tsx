import {
  GithubLogo,
  GitlabLogo,
  DribbbleLogo,
  BehanceLogo,
  YoutubeLogo,
  MediumLogo,
  NotionLogo,
  FigmaLogo,
  TwitchLogo,
  DiscordLogo,
  SpotifyLogo,
  SoundcloudLogo,
  RedditLogo,
  TiktokLogo,
  PinterestLogo,
  ThreadsLogo,
  Link as LinkIconPh,
  Question,
} from '@phosphor-icons/react'

// Icon + brand color mapping
const ICON_MAP: Record<string, { Icon: any; color: string }> = {
  github:       { Icon: GithubLogo,     color: 'text-zinc-300' },
  gitlab:       { Icon: GitlabLogo,     color: 'text-orange-400' },
  dribbble:     { Icon: DribbbleLogo,   color: 'text-pink-400' },
  behance:      { Icon: BehanceLogo,    color: 'text-blue-400' },
  youtube:      { Icon: YoutubeLogo,    color: 'text-red-500' },
  medium:       { Icon: MediumLogo,     color: 'text-zinc-200' },
  substack:     { Icon: LinkIconPh,     color: 'text-orange-400' },
  notion:       { Icon: NotionLogo,     color: 'text-zinc-200' },
  figma:        { Icon: FigmaLogo,      color: 'text-purple-400' },
  twitch:       { Icon: TwitchLogo,     color: 'text-purple-400' },
  discord:      { Icon: DiscordLogo,    color: 'text-indigo-400' },
  spotify:      { Icon: SpotifyLogo,    color: 'text-green-500' },
  soundcloud:   { Icon: SoundcloudLogo, color: 'text-orange-500' },
  reddit:       { Icon: RedditLogo,     color: 'text-orange-500' },
  tiktok:       { Icon: TiktokLogo,     color: 'text-zinc-200' },
  pinterest:    { Icon: PinterestLogo,  color: 'text-red-500' },
  threads:      { Icon: ThreadsLogo,    color: 'text-zinc-200' },
  producthunt:  { Icon: LinkIconPh,     color: 'text-orange-500' },
  hackernews:   { Icon: LinkIconPh,     color: 'text-orange-500' },
  stackoverflow:{ Icon: LinkIconPh,     color: 'text-orange-500' },
  link:         { Icon: LinkIconPh,     color: 'text-zinc-400' },
}

interface LinkIconProps {
  icon: string
  className?: string
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'
}

export function LinkIcon({ icon, className = 'w-4 h-4', weight = 'fill' }: LinkIconProps) {
  const entry = ICON_MAP[icon?.toLowerCase()] || ICON_MAP.link
  const { Icon, color } = entry
  return <Icon className={`${className} ${color}`} weight={weight} />
}