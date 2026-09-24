import { Platform, Share } from 'react-native'
import { czk } from './data'

/**
 * Invite links point at the website's /pozvanka page, which previews as a card in
 * any chat app and works for people who don't have the app yet. Mirrors the web's
 * lib/invite.ts — keep the wording the same.
 */
const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? 'https://usetri.app'

export const inviteUrl = (groupId: string) => `${SITE_URL}/pozvanka/${groupId}`

export const inviteMessage = (serviceName: string, pricePerSeat: number, fullPrice: number) =>
  `Pojď se mnou do skupiny ${serviceName} přes Ušetři — ${czk(pricePerSeat)} měsíčně místo ${czk(fullPrice)}.`

/** Opens the system share sheet. Resolves quietly when the sheet is dismissed. */
export async function shareInvite(offer: {
  id: string
  name: string
  pricePerSeat: number
  fullPrice: number
}) {
  const url = inviteUrl(offer.id)
  const message = inviteMessage(offer.name, offer.pricePerSeat, offer.fullPrice)
  // iOS attaches `url` as its own item; Android only reads `message`.
  await Share.share(
    Platform.OS === 'ios' ? { message, url } : { message: `${message} ${url}` },
    { dialogTitle: `Pozvánka do skupiny ${offer.name}` },
  )
}
