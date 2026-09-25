// QR encode/decode for device pairing (BRAIN-SYNC-SPEC §10/§11).
//
// Two small, dependency-free libraries, both only ever loaded with the
// Brain Sync screen (never in the main bundle):
//   uqr   (MIT)        — encodes the pairing payload into a module matrix
//   jsQR  (Apache-2.0) — decodes camera frames where the browser has no
//                        native BarcodeDetector (e.g. iOS Safari, Firefox)
// Why a library at all: QR encoding/decoding (Reed–Solomon, masking,
// perspective correction) is exactly the kind of code not to hand-roll, and
// iOS Safari — the main PWA target — has no built-in QR decoder.

import { encode } from 'uqr'

// boolean[][] (true = dark), including a 4-module quiet zone. Error
// correction M: a phone screen shown to another phone is a clean capture,
// and a lower level keeps the modules larger.
export function qrMatrix(text) {
  return encode(text, { ecc: 'M', border: 4 }).data
}

// One SVG path for all dark modules — crisp at any size, no canvas.
export function qrPath(matrix) {
  let d = ''
  matrix.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) d += `M${x} ${y}h1v1h-1z`
    })
  })
  return d
}

// Returns decode(source) -> Promise<string | null>, where source is a video
// frame (anything drawable onto a canvas). Prefers the platform's
// BarcodeDetector; falls back to jsQR on a canvas.
export async function createFrameDecoder({ BarcodeDetectorImpl = globalThis.BarcodeDetector, createCanvas } = {}) {
  if (BarcodeDetectorImpl) {
    try {
      const formats = await BarcodeDetectorImpl.getSupportedFormats?.()
      if (!formats || formats.includes('qr_code')) {
        const detector = new BarcodeDetectorImpl({ formats: ['qr_code'] })
        return async (source) => {
          const [found] = await detector.detect(source)
          return found?.rawValue ?? null
        }
      }
    } catch {
      // fall through to jsQR
    }
  }
  const { default: jsQR } = await import('jsqr')
  const canvas = createCanvas ? createCanvas() : document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  return async (source) => {
    const width = source.videoWidth ?? source.width
    const height = source.videoHeight ?? source.height
    if (!width || !height) return null
    canvas.width = width
    canvas.height = height
    context.drawImage(source, 0, 0, width, height)
    const { data } = context.getImageData(0, 0, width, height)
    return jsQR(data, width, height, { inversionAttempts: 'dontInvert' })?.data ?? null
  }
}
