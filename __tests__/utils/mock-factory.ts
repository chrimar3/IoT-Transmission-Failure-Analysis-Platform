/**
 * Mock Factory Pattern for Integration Tests
 * Provides dynamic mock state management for Supabase client
 */

export interface MockState {
  // Storage mock state
  storageUploadError: string | null
  storageSignedUrlError: string | null
  storageUploadAttempts: number
  storageUploadSuccessOnAttempt: number | null
  duplicateFileMode: boolean
  duplicateFileUrl: string

  // RPC mock state
  canUserExport: boolean
  currentExportCount: number
  exportLimit: number
  percentageUsed: number

  // Tier limits mock state
  tierName: string
  formatsAllowed: string[]
  exportsPerMonth: number
  maxFileSizeMb: number
}

/**
 * Factory class for creating configurable Supabase mocks
 */
export class SupabaseMockFactory {
  private static mockState: MockState = {
    storageUploadError: null,
    storageSignedUrlError: null,
    storageUploadAttempts: 0,
    storageUploadSuccessOnAttempt: null,
    duplicateFileMode: false,
    duplicateFileUrl: 'https://storage.example.com/existing-file',
    canUserExport: true,
    currentExportCount: 10,
    exportLimit: 100,
    percentageUsed: 10.0,
    tierName: 'PROFESSIONAL',
    formatsAllowed: ['csv', 'excel', 'pdf'],
    exportsPerMonth: 100,
    maxFileSizeMb: 50
  }

  /**
   * Reset mock state to default values
   */
  static reset(): void {
    this.mockState = {
      storageUploadError: null,
      storageSignedUrlError: null,
      storageUploadAttempts: 0,
      storageUploadSuccessOnAttempt: null,
      duplicateFileMode: false,
      duplicateFileUrl: 'https://storage.example.com/existing-file',
      canUserExport: true,
      currentExportCount: 10,
      exportLimit: 100,
      percentageUsed: 10.0,
      tierName: 'PROFESSIONAL',
      formatsAllowed: ['csv', 'excel', 'pdf'],
      exportsPerMonth: 100,
      maxFileSizeMb: 50
    }
  }

  /**
   * Configure storage upload to fail with specific error
   */
  static setStorageUploadError(error: string | null): void {
    this.mockState.storageUploadError = error
  }

  /**
   * Configure storage signed URL to fail with specific error
   */
  static setStorageSignedUrlError(error: string | null): void {
    this.mockState.storageSignedUrlError = error
  }

  /**
   * Configure storage upload to succeed on specific attempt
   */
  static setStorageUploadSuccessOnAttempt(attemptNumber: number): void {
    this.mockState.storageUploadSuccessOnAttempt = attemptNumber
  }

  /**
   * Configure user export quota state
   */
  static setExportQuota(canExport: boolean, currentCount: number, limit: number): void {
    this.mockState.canUserExport = canExport
    this.mockState.currentExportCount = currentCount
    this.mockState.exportLimit = limit
    this.mockState.percentageUsed = (currentCount / limit) * 100
  }

  /**
   * Configure tier limits
   */
  static setTierLimits(tier: string, formatsAllowed: string[]): void {
    this.mockState.tierName = tier
    this.mockState.formatsAllowed = formatsAllowed
  }

  /**
   * Configure duplicate file scenario
   */
  static setDuplicateFileMode(enabled: boolean, fileUrl?: string): void {
    this.mockState.duplicateFileMode = enabled
    if (fileUrl) {
      this.mockState.duplicateFileUrl = fileUrl
    }
  }

  /**
   * Create mock Supabase client with current state
   */
  static createMock() {
    const state = this.mockState

    return {
      storage: {
        listBuckets: jest.fn(() => ({ data: [], error: null })),
        createBucket: jest.fn(() => ({ error: null })),
        from: jest.fn(() => ({
          upload: jest.fn(() => {
            state.storageUploadAttempts++

            // Handle duplicate file scenario
            if (state.duplicateFileMode) {
              return Promise.resolve({
                data: null,
                error: { message: 'File already exists' }
              })
            }

            // Handle retry scenario - fail until success attempt
            if (state.storageUploadSuccessOnAttempt !== null) {
              if (state.storageUploadAttempts < state.storageUploadSuccessOnAttempt) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Network timeout' }
                })
              } else {
                return Promise.resolve({
                  data: { path: 'user123/job456/report.pdf' },
                  error: null
                })
              }
            }

            // Handle persistent error
            if (state.storageUploadError) {
              return Promise.resolve({
                data: null,
                error: { message: state.storageUploadError }
              })
            }

            // Success case
            return Promise.resolve({
              data: { path: 'user123/job123/report.pdf' },
              error: null
            })
          }),
          createSignedUrl: jest.fn(() => {
            if (state.storageSignedUrlError) {
              return Promise.resolve({
                data: null,
                error: { message: state.storageSignedUrlError }
              })
            }
            // Return duplicate file URL if in duplicate mode
            if (state.duplicateFileMode) {
              return Promise.resolve({
                data: { signedUrl: state.duplicateFileUrl },
                error: null
              })
            }
            return Promise.resolve({
              data: { signedUrl: 'https://storage.example.com/signed-url' },
              error: null
            })
          }),
          remove: jest.fn(() => ({ error: null })),
          list: jest.fn(() => ({ data: [], error: null }))
        }))
      },
      rpc: jest.fn((funcName: string) => {
        if (funcName === 'can_user_export') {
          return Promise.resolve({
            data: [{
              can_export: state.canUserExport,
              current_count: state.currentExportCount,
              limit_count: state.exportLimit,
              percentage_used: state.percentageUsed,
              resets_at: new Date('2025-11-01').toISOString()
            }],
            error: null
          })
        }
        return Promise.resolve({ data: null, error: null })
      }),
      from: jest.fn(() => ({
        insert: jest.fn(() => ({ error: null })),
        update: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) })),
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                tier: state.tierName,
                exports_per_month: state.exportsPerMonth,
                max_file_size_mb: state.maxFileSizeMb,
                max_recipients_per_email: 10,
                scheduled_reports_limit: 10,
                share_links_per_month: 50,
                formats_allowed: state.formatsAllowed,
                features_enabled: ['basic_export', 'excel_export', 'pdf_export']
              },
              error: null
            }))
          }))
        }))
      }))
    }
  }

  /**
   * Get current mock state (for debugging)
   */
  static getState(): MockState {
    return { ...this.mockState }
  }
}
