/**
 * Mock for ExcelJS library
 * Prevents fs/tmp dependency issues in test environment
 */

class MockWorkbook {
  constructor() {
    this.creator = 'Test'
    this.lastModifiedBy = 'Test'
    this.created = new Date()
    this.modified = new Date()
    this.worksheets = []
  }

  addWorksheet(name) {
    const worksheet = new MockWorksheet()
    worksheet.name = name
    this.worksheets.push(worksheet)
    return worksheet
  }

  async xlsx() {
    return {
      writeBuffer: async () => Buffer.from('mock excel data')
    }
  }
}

class MockWorksheet {
  constructor() {
    this.columns = []
    this.rows = []
    this.name = ''
  }

  addRow(data) {
    this.rows.push(data)
    return { commit: () => {} }
  }

  getRow(index) {
    return this.rows[index] || { commit: () => {} }
  }

  getCell(address) {
    return {
      value: null,
      font: {},
      alignment: {},
      border: {},
      fill: {}
    }
  }

  mergeCells(...args) {
    // Mock merge cells
  }
}

const ExcelJS = {
  Workbook: MockWorkbook
}

module.exports = ExcelJS
module.exports.default = ExcelJS
