import { DsrtPage, DsrtPanel } from '@/components/dsrt'

export const dynamic = 'force-dynamic'

type Bit = 0 | 1
type Matrix = Bit[][]

function encodeQR(data: string): { matrix: Matrix; size: number } {
  const bytes = new TextEncoder().encode(data)
  const version = pickVersion(bytes.length)
  const { size, ecBlocks, dataBytesCapacity } = getVersionInfo(version)

  const bits: Bit[] = []
  writeBits(bits, 0b0100, 4)
  writeBits(bits, bytes.length, version < 10 ? 8 : 16)
  for (const b of bytes) writeBits(bits, b, 8)

  const target = dataBytesCapacity * 8
  const term = Math.min(4, target - bits.length)
  for (let i = 0; i < term; i++) bits.push(0)
  while (bits.length % 8 !== 0) bits.push(0)

  const pads = [0xec, 0x11]
  let padIdx = 0
  while (bits.length < target) {
    writeBits(bits, pads[padIdx % 2], 8)
    padIdx++
  }

  const dataBytes: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0
    for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i + j] ?? 0)
    dataBytes.push(b)
  }

  const ecc = rsEncode(dataBytes, ecBlocks)
  const combined = [...dataBytes, ...ecc]

  const finalBits: Bit[] = []
  for (const b of combined) writeBits(finalBits, b, 8)

  // FIXED: Destructure the proper return type from buildMatrix
  const { matrix, size: matrixSize } = buildMatrix(version, size, finalBits)
  return { matrix, size: matrixSize }
}

function writeBits(out: Bit[], value: number, n: number) {
  for (let i = n - 1; i >= 0; i--) out.push(((value >> i) & 1) as Bit)
}

function pickVersion(byteLen: number): number {
  const caps = [
    { v: 1, cap: 17 }, { v: 2, cap: 32 }, { v: 3, cap: 53 }, { v: 4, cap: 78 },
    { v: 5, cap: 106 }, { v: 6, cap: 134 }, { v: 7, cap: 154 }, { v: 8, cap: 192 },
    { v: 9, cap: 230 }, { v: 10, cap: 271 },
  ]
  for (const c of caps) if (byteLen <= c.cap) return c.v
  return 10
}

function getVersionInfo(v: number) {
  const table: Record<number, { total: number; ec: number }> = {
    1: { total: 26, ec: 7 }, 2: { total: 44, ec: 10 }, 3: { total: 70, ec: 15 },
    4: { total: 100, ec: 20 }, 5: { total: 134, ec: 26 }, 6: { total: 172, ec: 18 },
    7: { total: 196, ec: 20 }, 8: { total: 242, ec: 24 }, 9: { total: 292, ec: 30 },
    10: { total: 346, ec: 18 },
  }
  const info = table[v]
  const size = 21 + (v - 1) * 4
  return { size, ecBlocks: info.ec, dataBytesCapacity: info.total - info.ec }
}

const GF_EXP: number[] = new Array(512)
const GF_LOG: number[] = new Array(256)
{
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255]
}
function gfMul(a: number, b: number): number {
  if (!a || !b) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}
function rsGeneratorPoly(degree: number): number[] {
  let poly = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i])
    }
    poly = next
  }
  return poly
}
function rsEncode(data: number[], eccLen: number): number[] {
  const gen = rsGeneratorPoly(eccLen)
  const buf = [...data, ...new Array(eccLen).fill(0)]
  for (let i = 0; i < data.length; i++) {
    const factor = buf[i]
    if (factor !== 0) {
      for (let j = 0; j < gen.length; j++) {
        buf[i + j] ^= gfMul(gen[j], factor)
      }
    }
  }
  return buf.slice(data.length)
}

// FIXED: Corrected return type definition to object
function buildMatrix(version: number, size: number, bits: Bit[]): { matrix: Matrix; size: number } {
  const m: (Bit | null)[][] = Array.from({ length: size }, () => new Array(size).fill(null))
  const drawFinder = (r: number, c: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const rr = r + dr, cc = c + dc
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue
        const isBorder = dr === -1 || dr === 7 || dc === -1 || dc === 7
        const isPattern =
          (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6) &&
          (dr === 0 || dr === 6 || dc === 0 || dc === 6 ||
            (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4))
        if (isBorder) m[rr][cc] = 0
        else if (isPattern) m[rr][cc] = 1
        else if (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6) m[rr][cc] = 0
      }
    }
  }
  drawFinder(0, 0); drawFinder(0, size - 7); drawFinder(size - 7, 0)
  for (let i = 8; i < size - 8; i++) {
    m[6][i] = (i % 2 === 0 ? 1 : 0)
    m[i][6] = (i % 2 === 0 ? 1 : 0)
  }
  m[size - 8][8] = 1
  for (let i = 0; i < 9; i++) if (m[8][i] === null) m[8][i] = 0
  for (let i = 0; i < 8; i++) if (m[i][8] === null) m[i][8] = 0
  for (let i = size - 8; i < size; i++) if (m[8][i] === null) m[8][i] = 0
  for (let i = size - 7; i < size; i++) if (m[i][8] === null) m[i][8] = 0

  let bitIdx = 0
  let upward = true
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i
      for (let k = 0; k < 2; k++) {
        const cc = col - k
        if (m[row][cc] === null) {
          const b = bits[bitIdx++] ?? 0
          m[row][cc] = (((row + cc) % 2 === 0) ? (b ^ 1) : b) as Bit
        }
      }
    }
    upward = !upward
  }
  
  const eccBits = 0b01
  const format = (eccBits << 3) | 0
  let d = format << 10
  const gen = 0b10100110111
  const bitLen = (x: number) => { let n = 0; while (x) { n++; x >>>= 1 }; return n }
  while (bitLen(d) >= 11) d ^= gen << (bitLen(d) - 11)
  const formatBits = ((format << 10) | d) ^ 0b101010000010010

  const set = (r: number, c: number, bit: number) => { m[r][c] = (bit & 1) as Bit }
  for (let i = 0; i <= 5; i++) set(8, i, (formatBits >> i) & 1)
  set(8, 7, (formatBits >> 6) & 1)
  set(8, 8, (formatBits >> 7) & 1)
  set(7, 8, (formatBits >> 8) & 1)
  for (let i = 9; i < 15; i++) set(14 - i, 8, (formatBits >> i) & 1)

  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, (formatBits >> i) & 1)
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, (formatBits >> i) & 1)
  set(size - 8, 8, 1)

  return { matrix: m as Matrix, size }
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { matrix, size } = encodeQR(token)

  const modulePx = 8
  const quiet = 4
  const totalPx = (size + quiet * 2) * modulePx

  return (
    <DsrtPage width="narrow" className="min-h-screen flex items-center justify-center">
      <DsrtPanel variant="default" padding="lg" className="w-full text-center max-w-sm mx-auto shadow-2xl">
        <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/50 mb-6">
          Your Check-in Ticket
        </p>

        <div className="mx-auto rounded-2xl bg-white p-4 inline-block shadow-lg">
          <svg
            width={Math.min(totalPx, 280)}
            height={Math.min(totalPx, 280)}
            viewBox={`0 0 ${totalPx} ${totalPx}`}
            xmlns="http://www.w3.org/2000/svg"
            shapeRendering="crispEdges"
          >
            <rect width={totalPx} height={totalPx} fill="#ffffff" />
            {matrix.map((row, r) =>
              row.map((bit, c) =>
                bit === 1 ? (
                  <rect
                    key={`${r}-${c}`}
                    x={(c + quiet) * modulePx}
                    y={(r + quiet) * modulePx}
                    width={modulePx}
                    height={modulePx}
                    fill="#000000"
                  />
                ) : null
              )
            )}
          </svg>
        </div>

        <p className="mt-6 text-[13px] text-white/60 leading-relaxed font-medium">
          Show this screen at check-in. Event staff will scan the QR to record your attendance.
        </p>

        <details className="mt-6 text-left border-t border-white/[0.08] pt-4">
          <summary className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 cursor-pointer hover:text-white/60 select-none">
            Show token string (backup)
          </summary>
          <p className="mt-3 text-[11px] font-mono text-white/50 break-all bg-[#05070D] border border-white/[0.1] rounded-lg p-3">
            {token}
          </p>
        </details>
      </DsrtPanel>
    </DsrtPage>
  )
}