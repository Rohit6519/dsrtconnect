'use client'

interface Props {
  message: string
  expirationDays: number
  onMessageChange: (m: string) => void
  onExpirationChange: (d: number) => void
}

export function Step6_Message({
  message, expirationDays, onMessageChange, onExpirationChange
}: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[15px] font-bold text-white">Personal Message</h3>
        <p className="text-[12.5px] text-zinc-500 mt-1">
          Optional. A short note goes a long way toward acceptance.
        </p>
      </div>

      <div>
        <label className="block text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-1.5">
          Message (Optional)
        </label>
        <textarea
          value={message}
          onChange={e => onMessageChange(e.target.value)}
          placeholder="Tell them why you want them on the team, what excites you about their skills, or what you'll build together..."
          rows={5}
          maxLength={1000}
          className="w-full p-3 bg-[#0d0d10] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.15] resize-none leading-relaxed"
        />
        <p className="text-[10.5px] text-zinc-500 text-right mt-1">
          {message.length} / 1000
        </p>
      </div>

      <div>
        <label className="block text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-2">
          Invitation Expires In
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[3, 7, 14, 30].map(days => (
            <button
              key={days}
              onClick={() => onExpirationChange(days)}
              className={
                'p-2.5 rounded-lg border text-center transition-all ' +
                (expirationDays === days
                  ? 'border-white/20 bg-white/[0.06] text-white'
                  : 'border-white/[0.06] bg-[#0d0d10] text-zinc-400 hover:border-white/[0.12] hover:text-white')
              }
            >
              <p className="text-[13px] font-bold">{days}</p>
              <p className="text-[10px] font-mono uppercase tracking-wider mt-0.5">days</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}