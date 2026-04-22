/**
 * Font loading via @remotion/google-fonts.
 *
 * IMPORTANT: Remotion requires fonts be loaded through its official
 * adapter. Do NOT use <link>, next/font, or manual @font-face.
 *
 * Caller invokes loadFonts() once at module load (e.g. in the Root
 * composition file). Returns the waitUntilDone promises so Remotion
 * can block the first render until glyphs are ready.
 *
 * pnpm add @remotion/google-fonts
 */
import { loadFont as loadSpaceGrotesk } from '@remotion/google-fonts/SpaceGrotesk'
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono'

export const loadFonts = () => {
  const heading = loadSpaceGrotesk('normal', {
    weights: ['500', '700'],
    subsets: ['latin']
  })
  const mono = loadJetBrainsMono('normal', {
    weights: ['400', '500', '700'],
    subsets: ['latin']
  })
  return {
    waitUntilDone: Promise.all([
      heading.waitUntilDone(),
      mono.waitUntilDone()
    ]),
    headingFamily: heading.fontFamily,
    monoFamily: mono.fontFamily
  }
}
