// Machine images: elektronmods.com's cut-outs, used with its owner's permission (see docs/MACHINE_IMAGES.md),
// and Wikimedia Commons photos under their authors' free licences. Credits show with each image and on the machine overview.
export type MachinePhoto = { src: string; author: string; license: string; licenseUrl?: string; source: string; via: string; cutout?: boolean }

const ELEKTRONMODS = { author: 'elektronmods.com', license: 'Used with permission', source: 'https://elektronmods.com', via: 'elektronmods.com', cutout: true }

export const MACHINE_PHOTOS: Record<string, MachinePhoto> = {
  'octatrack': { src: 'machines/octatrack.webp', ...ELEKTRONMODS },
  'digitakt': { src: 'machines/digitakt.webp', ...ELEKTRONMODS },
  'digitone': { src: 'machines/digitone.webp', ...ELEKTRONMODS },
  'digitakt-ii': { src: 'machines/digitakt-ii.webp', ...ELEKTRONMODS },
  'digitone-ii': { src: 'machines/digitone-ii.webp', ...ELEKTRONMODS },
  'syntakt': { src: 'machines/syntakt.webp', ...ELEKTRONMODS },
  'model-samples': { src: 'machines/model-samples.webp', ...ELEKTRONMODS },
  'model-cycles': { src: 'machines/model-cycles.webp', ...ELEKTRONMODS },
  'tonverk': { src: 'machines/tonverk.jpg', author: "Systemtechniker", license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', via: 'Wikimedia Commons', source: "https://commons.wikimedia.org/wiki/File:2025-09-20_17.23.39_Elektron_Tonverk.jpg" },
  'analog-rytm-mkii': { src: 'machines/analog-rytm-mkii.jpg', author: "Systemtechniker", license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', via: 'Wikimedia Commons', source: "https://commons.wikimedia.org/wiki/File:Elektron_Analog_Rytm_MKII.jpg" },
  'analog-rytm-mki': { src: 'machines/analog-rytm-mki.jpg', author: "Brandon Daniel", license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0', via: 'Wikimedia Commons', source: "https://commons.wikimedia.org/wiki/File:Elektron_Analog_RYTM_-_2014_NAMM_Show.jpg" },
  'analog-four-mkii': { src: 'machines/analog-four-mkii.jpg', author: "Systemtechniker", license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', via: 'Wikimedia Commons', source: "https://commons.wikimedia.org/wiki/File:Elektron_Analog_Four_MKII.jpg" },
  'analog-keys': { src: 'machines/analog-keys.jpg', author: "Brandon Daniel", license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0', via: 'Wikimedia Commons', source: "https://commons.wikimedia.org/wiki/File:Elektron_Analog_Keys_-_2014_NAMM_Show.jpg" },
  'analog-heat': { src: 'machines/analog-heat.jpg', author: "Systemtechniker", license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', via: 'Wikimedia Commons', source: "https://commons.wikimedia.org/wiki/File:Elektron_Analog_Heat_MKII.jpg" },
  'machinedrum': { src: 'machines/machinedrum.jpg', author: "j bizzie (derivative work: Clusternote)", license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0', via: 'Wikimedia Commons', source: "https://commons.wikimedia.org/wiki/File:Elektron_MACHINEDRUM_SPS-1UW.jpg" },
  'monomachine': { src: 'machines/monomachine.jpg', author: "GeschnittenBrot (derivative work: Clusternote)", license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0', via: 'Wikimedia Commons', source: "https://commons.wikimedia.org/wiki/File:Elektron_MONOMACHINE.jpg" },
}
