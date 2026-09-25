import { describe, it, expect } from 'vitest'
import jsQR from 'jsqr'
import { qrMatrix, qrPath, createFrameDecoder } from './qr.js'
import { encodePairingPayload } from './syncApi.js'

// Rasterizes a module matrix the way a screen shows it (dark on white),
// `scale` pixels per module, as RGBA — what a camera frame gives jsQR.
function rasterize(matrix, scale = 4) {
  const size = matrix.length * scale
  const data = new Uint8ClampedArray(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dark = matrix[Math.floor(y / scale)][Math.floor(x / scale)]
      const i = (y * size + x) * 4
      data[i] = data[i + 1] = data[i + 2] = dark ? 0 : 255
      data[i + 3] = 255
    }
  }
  return { data, width: size, height: size }
}

const payload = encodePairingPayload('https://sync.example.org', `bpt_${'Ab9_-'.repeat(9)}Zz`)

describe('pairing QR codes', () => {
  it('a rendered pairing payload decodes back exactly (encoder ↔ decoder round trip)', () => {
    const matrix = qrMatrix(payload)
    const { data, width, height } = rasterize(matrix)
    expect(jsQR(data, width, height)?.data).toBe(payload)
  })

  it('includes a quiet zone and renders every dark module into the SVG path', () => {
    const matrix = qrMatrix(payload)
    expect(matrix[0].every((dark) => !dark)).toBe(true) // border row is light
    const darkCount = matrix.flat().filter(Boolean).length
    expect(qrPath(matrix).match(/M/g)).toHaveLength(darkCount)
  })

  it('uses the native BarcodeDetector when the platform has one', async () => {
    class FakeDetector {
      static getSupportedFormats = async () => ['qr_code', 'ean_13']
      async detect() { return [{ rawValue: 'from-native' }] }
    }
    const decode = await createFrameDecoder({ BarcodeDetectorImpl: FakeDetector })
    expect(await decode({})).toBe('from-native')
  })

  it('falls back to jsQR on a canvas when there is no native QR detector', async () => {
    const frame = rasterize(qrMatrix(payload))
    const canvas = {
      getContext: () => ({ drawImage() {}, getImageData: () => ({ data: frame.data }) }),
    }
    class NoQr {
      static getSupportedFormats = async () => ['ean_13']
    }
    const decode = await createFrameDecoder({ BarcodeDetectorImpl: NoQr, createCanvas: () => canvas })
    expect(await decode({ videoWidth: frame.width, videoHeight: frame.height })).toBe(payload)
    expect(await decode({ videoWidth: 0, videoHeight: 0 })).toBeNull() // camera not ready yet
  })
})
