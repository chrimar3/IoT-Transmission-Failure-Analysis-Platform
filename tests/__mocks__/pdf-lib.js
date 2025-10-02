/**
 * Mock for pdf-lib library
 * Prevents dependency issues in test environment
 */

class PDFDocument {
  static async create() {
    return new PDFDocument()
  }

  constructor() {
    this.pages = []
  }

  addPage(size) {
    const page = {
      getWidth: () => size?.[0] || 595,
      getHeight: () => size?.[1] || 842,
      getSize: () => ({ width: size?.[0] || 595, height: size?.[1] || 842 }),
      drawText: jest.fn(),
      drawRectangle: jest.fn(),
      drawLine: jest.fn(),
      setFont: jest.fn(),
      setFontSize: jest.fn()
    }
    this.pages.push(page)
    return page
  }

  async embedFont(font) {
    return {
      name: 'MockFont',
      heightAtSize: (size) => size,
      widthOfTextAtSize: (text, size) => text.length * size * 0.6
    }
  }

  async save() {
    return new Uint8Array(Buffer.from('mock pdf data'))
  }

  async saveAsBase64() {
    return Buffer.from('mock pdf data').toString('base64')
  }
}

const StandardFonts = {
  Helvetica: 'Helvetica',
  HelveticaBold: 'Helvetica-Bold',
  TimesRoman: 'Times-Roman',
  Courier: 'Courier'
}

function rgb(r, g, b) {
  return { r, g, b, type: 'RGB' }
}

module.exports = {
  PDFDocument,
  StandardFonts,
  rgb
}
