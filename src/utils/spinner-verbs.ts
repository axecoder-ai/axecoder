/** Rotating status verbs shown while the agent is working */
export const SPINNER_VERBS = [
  'Accomplishing',
  'Actioning',
  'Actualizing',
  'Baking',
  'Booping',
  'Brewing',
  'Calculating',
  'Cerebrating',
  'Channelling',
  'Churning',
  'Coding',
  'Coalescing',
  'Cogitating',
  'Combobulating',
  'Computing',
  'Concocting',
  'Conjuring',
  'Considering',
  'Contemplating',
  'Cooking',
  'Crafting',
  'Creating',
  'Crunching',
  'Deciphering',
  'Deliberating',
  'Determining',
  'Discombobulating',
  'Divining',
  'Doing',
  'Effecting',
  'Elucidating',
  'Enchanting',
  'Envisioning',
  'Finagling',
  'Flibbertigibbeting',
  'Forging',
  'Forming',
  'Frolicking',
  'Generating',
  'Germinating',
  'Hatching',
  'Herding',
  'Honking',
  'Hustling',
  'Ideating',
  'Imagining',
  'Incubating',
  'Inferring',
  'Jiving',
  'Manifesting',
  'Marinating',
  'Meandering',
  'Moseying',
  'Mulling',
  'Mustering',
  'Musing',
  'Noodling',
  'Percolating',
  'Perusing',
  'Philosophising',
  'Pondering',
  'Pontificating',
  'Processing',
  'Puttering',
  'Puzzling',
  'Reticulating',
  'Ruminating',
  'Scheming',
  'Schlepping',
  'Shimmying',
  'Shucking',
  'Simmering',
  'Smooshing',
  'Spelunking',
  'Spinning',
  'Stewing',
  'Sussing',
  'Synthesizing',
  'Thinking',
  'Tinkering',
  'Transmuting',
  'Unfurling',
  'Unravelling',
  'Vibing',
  'Wandering',
  'Whirring',
  'Wibbling',
  'Wizarding',
  'Working',
  'Wrangling',
] as const

export const SPINNER_ROTATE_MS = 5000

const stripEllipsis = (label: string) => label.replace(/…$/, '')

export const formatSpinnerVerb = (verb: string) => `${verb}…`

export const pickSpinnerVerb = (exclude?: string): string => {
  const pool: readonly string[] = SPINNER_VERBS
  if (pool.length === 0) return 'Thinking…'
  if (pool.length === 1) return formatSpinnerVerb(pool[0]!)
  const skip = exclude?.trim()
  let picked = pool[Math.floor(Math.random() * pool.length)]!
  if (skip && pool.length > 1) {
    let guard = 0
    while (picked === skip && guard++ < 8) {
      picked = pool[Math.floor(Math.random() * pool.length)]!
    }
  }
  return formatSpinnerVerb(picked)
}

export const nextSpinnerVerb = (current?: string) =>
  pickSpinnerVerb(current ? stripEllipsis(current) : undefined)
