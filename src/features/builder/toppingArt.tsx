import type { ReactNode } from 'react'
import type { ToppingKind } from '@/api/types'

/** Desenho de uma peça de cada ingrediente, centrada em (0, 0), em unidades do viewBox 400x400 */
export const TOPPING_SHAPE: Record<ToppingKind, ReactNode> = {
  calabresa: (
    <g>
      <circle r="14" fill="#9E2F22" />
      <circle r="11.5" fill="#C24A36" />
      <circle cx="-4" cy="-3" r="1.6" fill="#F3CDA6" />
      <circle cx="3" cy="4" r="1.4" fill="#F3CDA6" />
      <circle cx="5" cy="-4" r="1.2" fill="#F3CDA6" />
      <circle cx="-3" cy="5" r="1.1" fill="#F3CDA6" />
    </g>
  ),
  bacon: (
    <g>
      <path d="M-15 -5 C-9 -9 -4 -1 2 -5 S12 -9 15 -5 L15 3 C9 -1 5 7 -1 3 S-11 -1 -15 3 Z" fill="#B9544A" />
      <path d="M-14 -1 C-8 -4 -3 2 3 -1 S11 -4 14 -1" fill="none" stroke="#F4CFC2" strokeWidth="2" />
    </g>
  ),
  frango: (
    <path
      d="M-10 -4 C-8 -11 2 -10 6 -7 C12 -4 11 3 7 6 C3 10 -6 9 -9 5 C-12 2 -12 -1 -10 -4 Z"
      fill="#EACB98"
      stroke="#C99B5E"
      strokeWidth="1.2"
    />
  ),
  presunto: (
    <g>
      <rect x="-11" y="-8" width="22" height="16" rx="4" fill="#E79C98" />
      <path d="M-9 -2 H9" stroke="#F6C9C4" strokeWidth="1.5" />
    </g>
  ),
  champignon: (
    <g>
      <path d="M-11 1 A11 9 0 0 1 11 1 Z" fill="#E7D7BF" stroke="#B39672" strokeWidth="1.3" />
      <rect x="-3.5" y="0" width="7" height="8" rx="2" fill="#EADCC6" stroke="#B39672" strokeWidth="1.3" />
    </g>
  ),
  cebola: (
    <g fill="none">
      <circle r="11" stroke="#F4EAF1" strokeWidth="3" />
      <circle r="6.5" stroke="#E7CFE2" strokeWidth="2" />
    </g>
  ),
  tomate: (
    <g>
      <circle r="13" fill="#D7362B" />
      <circle r="10" fill="#E5523F" />
      <ellipse cx="-4" cy="-2" rx="2" ry="3" fill="#F7CF5A" />
      <ellipse cx="4" cy="-2" rx="2" ry="3" fill="#F7CF5A" />
      <ellipse cx="0" cy="5" rx="3" ry="2" fill="#F7CF5A" />
    </g>
  ),
  azeitona: (
    <g>
      <ellipse rx="7" ry="6" fill="#26221E" />
      <ellipse rx="2.4" ry="2" fill="#6A5C4C" />
      <ellipse cx="-2.5" cy="-3" rx="2" ry="1" fill="#5E5650" opacity="0.7" />
    </g>
  ),
  milho: <ellipse rx="3.4" ry="4.2" fill="#F5C232" stroke="#D9A21A" strokeWidth="0.8" />,
  pimentao: (
    <path
      d="M-9 -6 C-4 -12 6 -11 10 -5 C13 1 9 9 2 10 C-5 11 -11 6 -11 0 C-11 -2 -10 -4 -9 -6 Z"
      fill="none"
      stroke="#3A8C3B"
      strokeWidth="3.2"
    />
  ),
  palmito: (
    <g>
      <circle r="9" fill="#F7F1DE" stroke="#E3D6AE" strokeWidth="2" />
      <circle r="3.5" fill="#EFE5C5" />
    </g>
  ),
  ovo: (
    <g>
      <ellipse rx="13" ry="10" fill="#FFFDF7" stroke="#EDE6D6" strokeWidth="1" />
      <circle cx="1" r="5.5" fill="#F2B21A" />
    </g>
  ),
  catupiry: (
    <g fill="#FFF8E8" stroke="#E8DCC0" strokeWidth="1">
      <circle cx="-5" cy="1" r="7" />
      <circle cx="5" cy="-2" r="6" />
      <circle cx="1" cy="5" r="5" />
    </g>
  ),
  manjericao: (
    <g>
      <path d="M0 -12 C8 -8 9 4 0 12 C-9 4 -8 -8 0 -12 Z" fill="#2E7D4F" />
      <path d="M0 -10 V10" stroke="#5FA77A" strokeWidth="1.2" />
    </g>
  ),
}

/** Quantas peças de cada ingrediente vão na pizza */
export const TOPPING_COUNT: Record<ToppingKind, number> = {
  calabresa: 10,
  bacon: 9,
  frango: 12,
  presunto: 9,
  champignon: 10,
  cebola: 8,
  tomate: 7,
  azeitona: 12,
  milho: 30,
  pimentao: 8,
  palmito: 9,
  ovo: 5,
  catupiry: 7,
  manjericao: 9,
}

/** Gerador pseudoaleatório com semente: a mesma pizza sempre sai igual */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7)

export interface Piece {
  x: number
  y: number
  rotate: number
}

/** Espalha as peças pelo disco de molho, sem amontoar */
export function scatter(kind: string, count: number, radius = 138): Piece[] {
  const rand = mulberry32(hash(kind))
  const pieces: Piece[] = []
  const minDist = count > 20 ? 14 : 30
  for (let i = 0; i < count; i++) {
    let best: Piece | null = null
    for (let tries = 0; tries < 40; tries++) {
      const r = radius * Math.sqrt(rand())
      const a = rand() * Math.PI * 2
      const p = { x: 200 + r * Math.cos(a), y: 200 + r * Math.sin(a), rotate: rand() * 360 }
      const ok = pieces.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= minDist)
      best = p
      if (ok) break
    }
    pieces.push(best!)
  }
  return pieces
}
