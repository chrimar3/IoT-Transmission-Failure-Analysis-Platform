/**
 * File System Mock for Jest Tests
 *
 * Provides comprehensive mock for Node.js fs module to support export tests
 * that interact with the filesystem without actually writing files.
 */

const fs = jest.createMockFromModule('fs')

// In-memory file system for tracking mock file operations
const mockFileSystem = new Map()
const mockDirectories = new Set()

// Mock implementations for fs.promises
fs.promises = {
  /**
   * Mock writeFile - stores file content in memory
   */
  writeFile: jest.fn().mockImplementation(async (path, data) => {
    mockFileSystem.set(path, data)
    return undefined
  }),

  /**
   * Mock mkdir - tracks directory creation
   */
  mkdir: jest.fn().mockImplementation(async (path, options) => {
    mockDirectories.add(path)
    return undefined
  }),

  /**
   * Mock readFile - retrieves file content from memory
   */
  readFile: jest.fn().mockImplementation(async (path, encoding) => {
    const content = mockFileSystem.get(path)
    if (!content) {
      const error = new Error(`ENOENT: no such file or directory, open '${path}'`)
      error.code = 'ENOENT'
      throw error
    }

    if (encoding === 'utf-8' || encoding === 'utf8') {
      return content.toString()
    }

    return Buffer.from(content)
  }),

  /**
   * Mock unlink - removes file from memory
   */
  unlink: jest.fn().mockImplementation(async (path) => {
    mockFileSystem.delete(path)
    return undefined
  }),

  /**
   * Mock access - checks if file exists in memory
   */
  access: jest.fn().mockImplementation(async (path) => {
    if (!mockFileSystem.has(path) && !mockDirectories.has(path)) {
      const error = new Error(`ENOENT: no such file or directory, access '${path}'`)
      error.code = 'ENOENT'
      throw error
    }
    return undefined
  }),

  /**
   * Mock stat - returns file statistics
   */
  stat: jest.fn().mockImplementation(async (path) => {
    const content = mockFileSystem.get(path)

    if (!content && !mockDirectories.has(path)) {
      const error = new Error(`ENOENT: no such file or directory, stat '${path}'`)
      error.code = 'ENOENT'
      throw error
    }

    const isDirectory = mockDirectories.has(path)
    const size = isDirectory ? 0 : (typeof content === 'string' ? Buffer.byteLength(content) : (content ? content.length : 0))

    return {
      size,
      isFile: () => !isDirectory,
      isDirectory: () => isDirectory,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      dev: 0,
      ino: 0,
      mode: isDirectory ? 16877 : 33188,
      nlink: 1,
      uid: 1000,
      gid: 1000,
      rdev: 0,
      blksize: 4096,
      blocks: Math.ceil(size / 512),
      atimeMs: Date.now(),
      mtimeMs: Date.now(),
      ctimeMs: Date.now(),
      birthtimeMs: Date.now(),
      atime: new Date(),
      mtime: new Date(),
      ctime: new Date(),
      birthtime: new Date()
    }
  })
}

// Mock createWriteStream for streaming writes
fs.createWriteStream = jest.fn().mockImplementation((path) => {
  const chunks = []

  const stream = {
    write: jest.fn().mockImplementation((chunk) => {
      chunks.push(chunk)
      return true
    }),
    end: jest.fn().mockImplementation((callback) => {
      const content = Buffer.concat(chunks.map(c => typeof c === 'string' ? Buffer.from(c) : c))
      mockFileSystem.set(path, content)
      if (callback) callback()
      // Emit 'finish' event
      if (stream.on && stream.on.mock) {
        const finishHandlers = stream.on.mock.calls
          .filter(call => call[0] === 'finish')
          .map(call => call[1])
        finishHandlers.forEach(handler => handler())
      }
    }),
    on: jest.fn().mockImplementation((event, handler) => {
      return stream
    }),
    once: jest.fn().mockImplementation((event, handler) => {
      return stream
    }),
    emit: jest.fn(),
    destroy: jest.fn(),
    writable: true,
    path
  }

  return stream
})

// Synchronous versions of common fs methods
fs.existsSync = jest.fn().mockImplementation((path) => {
  return mockFileSystem.has(path) || mockDirectories.has(path)
})

fs.mkdirSync = jest.fn().mockImplementation((path, options) => {
  mockDirectories.add(path)
  return undefined
})

fs.readFileSync = jest.fn().mockImplementation((path, encoding) => {
  const content = mockFileSystem.get(path)
  if (!content) {
    const error = new Error(`ENOENT: no such file or directory, open '${path}'`)
    error.code = 'ENOENT'
    throw error
  }

  if (encoding === 'utf-8' || encoding === 'utf8') {
    return content.toString()
  }

  return Buffer.from(content)
})

fs.writeFileSync = jest.fn().mockImplementation((path, data) => {
  mockFileSystem.set(path, data)
  return undefined
})

fs.rmSync = jest.fn().mockImplementation((path, options) => {
  // Remove files starting with this path
  for (const [filePath] of mockFileSystem) {
    if (filePath.startsWith(path)) {
      mockFileSystem.delete(filePath)
    }
  }

  // Remove directories
  for (const dirPath of mockDirectories) {
    if (dirPath.startsWith(path)) {
      mockDirectories.delete(dirPath)
    }
  }

  return undefined
})

fs.statSync = jest.fn().mockImplementation((path) => {
  const content = mockFileSystem.get(path)

  if (!content && !mockDirectories.has(path)) {
    const error = new Error(`ENOENT: no such file or directory, stat '${path}'`)
    error.code = 'ENOENT'
    throw error
  }

  const isDirectory = mockDirectories.has(path)
  const size = isDirectory ? 0 : (typeof content === 'string' ? Buffer.byteLength(content) : (content ? content.length : 0))

  return {
    size,
    isFile: () => !isDirectory,
    isDirectory: () => isDirectory,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    dev: 0,
    ino: 0,
    mode: isDirectory ? 16877 : 33188,
    nlink: 1,
    uid: 1000,
    gid: 1000,
    rdev: 0,
    blksize: 4096,
    blocks: Math.ceil(size / 512),
    atimeMs: Date.now(),
    mtimeMs: Date.now(),
    ctimeMs: Date.now(),
    birthtimeMs: Date.now(),
    atime: new Date(),
    mtime: new Date(),
    ctime: new Date(),
    birthtime: new Date()
  }
})

// Utility function to clear the mock file system (useful for test cleanup)
fs.__clearMockFiles = () => {
  mockFileSystem.clear()
  mockDirectories.clear()
}

// Utility function to get all mock files (useful for debugging tests)
fs.__getMockFiles = () => {
  return Array.from(mockFileSystem.keys())
}

// Utility function to get mock file content (useful for test assertions)
fs.__getMockFileContent = (path) => {
  return mockFileSystem.get(path)
}

module.exports = fs
