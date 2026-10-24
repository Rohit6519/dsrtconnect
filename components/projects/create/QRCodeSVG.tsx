'use client'

import React from 'react'

interface QRCodeSVGProps {
  value: string
  size?: number
}

export function QRCodeSVG({ value, size = 180 }: QRCodeSVGProps) {
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    value
  )}&color=ffffff&bgcolor=09090b&margin=1`

  return (
    <div className="bg-[#09090b] border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center shadow-lg shrink-0">
      <img
        src={qrApiUrl}
        alt="Project QR Code"
        width={size}
        height={size}
        className="rounded-lg object-contain"
      />
    </div>
  )
}