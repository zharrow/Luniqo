import { createHmac } from 'node:crypto'

/** Code TOTP (RFC 6238 : SHA-1, 6 chiffres, pas de 30 s), comme app/mfa/policy.py. */
export function totp(base32Secret: string, stepOffset = 0): string {
  const secret = base32Decode(base32Secret.replace(/\s/g, ''))
  const counter = Math.floor(Date.now() / 1000 / 30) + stepOffset
  const message = Buffer.alloc(8)
  message.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', secret).update(message).digest()
  const offset = (digest.at(-1) ?? 0) & 0x0f
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  return code.toString().padStart(6, '0')
}

function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const char of input.toUpperCase().replace(/=+$/, '')) {
    const value = alphabet.indexOf(char)
    if (value === -1) throw new Error(`Caractère base32 invalide : ${char}`)
    bits += value.toString(2).padStart(5, '0')
  }
  const bytes = bits.match(/.{8}/g) ?? []
  return Buffer.from(bytes.map((byte) => parseInt(byte, 2)))
}
