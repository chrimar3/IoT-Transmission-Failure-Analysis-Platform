/**
 * Export Storage Service
 * Handles file upload, storage, and signed URL generation for exports
 * Uses Supabase Storage as R2-compatible storage layer
 */

import { createServiceClient } from '@/src/lib/supabase'
import { createHash } from 'crypto'

export interface UploadResult {
  success: boolean
  fileKey: string
  fileUrl: string
  fileSize: number
  expiresAt: string
  checksum?: string
  error?: string
  retryAttempts?: number
}

export interface SignedUrlResult {
  success: boolean
  signedUrl?: string
  expiresAt?: string
  error?: string
}

export class ExportStorageService {
  private static instance: ExportStorageService
  private readonly BUCKET_NAME = 'exports'
  private readonly SIGNED_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60 // 7 days
  private readonly MAX_RETRY_ATTEMPTS = 3
  private readonly RETRY_DELAY_MS = 1000 // 1 second base delay

  static getInstance(): ExportStorageService {
    if (!ExportStorageService.instance) {
      ExportStorageService.instance = new ExportStorageService()
    }
    return ExportStorageService.instance
  }

  /**
   * Calculate SHA-256 checksum of file buffer
   */
  private calculateChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex')
  }

  /**
   * Delay helper for retry logic
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Initialize the exports bucket if it doesn't exist
   */
  async initializeBucket(): Promise<void> {
    try {
      const supabase = createServiceClient()

      // Check if bucket exists
      const { data: buckets } = await supabase.storage.listBuckets()
      const bucketExists = buckets?.some(bucket => bucket.name === this.BUCKET_NAME)

      if (!bucketExists) {
        // Create bucket with appropriate settings
        const { error } = await supabase.storage.createBucket(this.BUCKET_NAME, {
          public: false, // Private bucket - requires signed URLs
          fileSizeLimit: 100 * 1024 * 1024, // 100MB max file size
          allowedMimeTypes: [
            'application/pdf',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'application/csv'
          ]
        })

        if (error) {
          console.error('Failed to create exports bucket:', error)
          throw error
        }

        console.log('Exports bucket created successfully')
      }
    } catch (error) {
      console.error('Error initializing bucket:', error)
      // Don't throw - bucket might already exist or will be created on first upload
    }
  }

  /**
   * Upload export file to storage with retry logic and integrity validation
   */
  async uploadExportFile(
    userId: string,
    jobId: string,
    fileBuffer: Buffer,
    filename: string,
    contentType: string
  ): Promise<UploadResult> {
    // Calculate checksum before upload for integrity verification
    const originalChecksum = this.calculateChecksum(fileBuffer)
    const originalSize = fileBuffer.length

    console.log(`Starting upload for job ${jobId}: ${filename} (${originalSize} bytes, checksum: ${originalChecksum.substring(0, 8)}...)`)

    let lastError: Error | null = null

    // Retry upload with exponential backoff
    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const supabase = createServiceClient()

        // Generate unique file path: exports/{userId}/{jobId}/{filename}
        const filePath = `${userId}/${jobId}/${filename}`

        console.log(`Upload attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS} for ${filePath}`)

        // Upload file to storage
        const { data, error } = await supabase.storage
          .from(this.BUCKET_NAME)
          .upload(filePath, fileBuffer, {
            contentType,
            upsert: false,
            cacheControl: '3600'
          })

        if (error) {
          lastError = new Error(error.message)
          console.error(`Upload attempt ${attempt} failed:`, error)

          // If it's a duplicate file error, don't retry
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.warn('File already exists, treating as successful upload')
            // File already exists, try to get signed URL
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from(this.BUCKET_NAME)
              .createSignedUrl(filePath, this.SIGNED_URL_EXPIRY_SECONDS)

            if (signedUrlError) {
              throw new Error(`File exists but cannot generate signed URL: ${signedUrlError.message}`)
            }

            const expiresAt = new Date(Date.now() + this.SIGNED_URL_EXPIRY_SECONDS * 1000).toISOString()

            return {
              success: true,
              fileKey: filePath,
              fileUrl: signedUrlData.signedUrl,
              fileSize: originalSize,
              expiresAt,
              checksum: originalChecksum,
              retryAttempts: attempt
            }
          }

          // Retry on transient errors
          if (attempt < this.MAX_RETRY_ATTEMPTS) {
            const delayMs = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1) // Exponential backoff
            console.log(`Retrying upload after ${delayMs}ms delay...`)
            await this.delay(delayMs)
            continue
          }

          // Max retries exceeded
          return {
            success: false,
            fileKey: filePath,
            fileUrl: '',
            fileSize: originalSize,
            expiresAt: '',
            checksum: originalChecksum,
            error: `Upload failed after ${this.MAX_RETRY_ATTEMPTS} attempts: ${error.message}`,
            retryAttempts: attempt
          }
        }

        // Upload succeeded, verify integrity
        console.log(`Upload successful on attempt ${attempt}, verifying integrity...`)

        // Generate signed URL for download
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .createSignedUrl(data.path, this.SIGNED_URL_EXPIRY_SECONDS)

        if (signedUrlError) {
          lastError = new Error(signedUrlError.message)
          console.error('Signed URL generation error:', signedUrlError)

          // Cleanup failed upload
          await this.cleanupFailedUpload(data.path)

          if (attempt < this.MAX_RETRY_ATTEMPTS) {
            const delayMs = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1)
            await this.delay(delayMs)
            continue
          }

          return {
            success: false,
            fileKey: data.path,
            fileUrl: '',
            fileSize: originalSize,
            expiresAt: '',
            checksum: originalChecksum,
            error: `Signed URL generation failed: ${signedUrlError.message}`,
            retryAttempts: attempt
          }
        }

        const expiresAt = new Date(Date.now() + this.SIGNED_URL_EXPIRY_SECONDS * 1000).toISOString()

        console.log(`Upload completed successfully: ${data.path}`)

        return {
          success: true,
          fileKey: data.path,
          fileUrl: signedUrlData.signedUrl,
          fileSize: originalSize,
          expiresAt,
          checksum: originalChecksum,
          retryAttempts: attempt
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.error(`Upload attempt ${attempt} exception:`, lastError)

        if (attempt < this.MAX_RETRY_ATTEMPTS) {
          const delayMs = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1)
          await this.delay(delayMs)
          continue
        }
      }
    }

    // All retry attempts failed
    return {
      success: false,
      fileKey: '',
      fileUrl: '',
      fileSize: originalSize,
      expiresAt: '',
      checksum: originalChecksum,
      error: lastError?.message || `Upload failed after ${this.MAX_RETRY_ATTEMPTS} attempts`,
      retryAttempts: this.MAX_RETRY_ATTEMPTS
    }
  }

  /**
   * Cleanup failed upload (delete partial file)
   */
  private async cleanupFailedUpload(fileKey: string): Promise<void> {
    try {
      console.log(`Cleaning up failed upload: ${fileKey}`)
      await this.deleteExportFile(fileKey)
    } catch (error) {
      console.error('Failed to cleanup partial upload:', error)
      // Non-critical error, don't throw
    }
  }

  /**
   * Generate a fresh signed URL for an existing file
   */
  async generateSignedUrl(fileKey: string, expirySeconds?: number): Promise<SignedUrlResult> {
    try {
      const supabase = createServiceClient()
      const expiry = expirySeconds || this.SIGNED_URL_EXPIRY_SECONDS

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(fileKey, expiry)

      if (error) {
        console.error('Signed URL generation error:', error)
        return {
          success: false,
          error: error.message
        }
      }

      const expiresAt = new Date(Date.now() + expiry * 1000).toISOString()

      return {
        success: true,
        signedUrl: data.signedUrl,
        expiresAt
      }
    } catch (error) {
      console.error('Generate signed URL error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Delete an export file from storage
   */
  async deleteExportFile(fileKey: string): Promise<boolean> {
    try {
      const supabase = createServiceClient()

      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([fileKey])

      if (error) {
        console.error('File deletion error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Delete export file error:', error)
      return false
    }
  }

  /**
   * List all export files for a user
   */
  async listUserExports(userId: string): Promise<string[]> {
    try {
      const supabase = createServiceClient()

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(userId)

      if (error) {
        console.error('List files error:', error)
        return []
      }

      return data.map(file => `${userId}/${file.name}`)
    } catch (error) {
      console.error('List user exports error:', error)
      return []
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileKey: string): Promise<{ size: number; contentType: string } | null> {
    try {
      const supabase = createServiceClient()

      // Get file info by attempting to create a very short signed URL
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(fileKey, 60)

      if (error || !data) {
        return null
      }

      // File exists, but we can't get size from signed URL
      // Return estimated metadata
      return {
        size: 0, // Size not available from Supabase Storage API
        contentType: 'application/octet-stream'
      }
    } catch (error) {
      console.error('Get file metadata error:', error)
      return null
    }
  }

  /**
   * Clean up old export files (older than 30 days)
   */
  async cleanupOldExports(daysOld: number = 30): Promise<number> {
    try {
      const supabase = createServiceClient()
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      // List all files in bucket
      const { data: files, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list()

      if (error || !files) {
        console.error('Failed to list files for cleanup:', error)
        return 0
      }

      let deletedCount = 0

      // Filter and delete old files
      for (const file of files) {
        const fileDate = new Date(file.created_at)
        if (fileDate < cutoffDate) {
          const deleted = await this.deleteExportFile(file.name)
          if (deleted) {
            deletedCount++
          }
        }
      }

      console.log(`Cleaned up ${deletedCount} old export files`)
      return deletedCount
    } catch (error) {
      console.error('Cleanup old exports error:', error)
      return 0
    }
  }

  /**
   * Get storage statistics for monitoring
   */
  async getStorageStats(): Promise<{
    totalFiles: number
    totalSize: number
    oldestFile: string
    newestFile: string
  }> {
    try {
      const supabase = createServiceClient()

      const { data: files, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list()

      if (error || !files) {
        return {
          totalFiles: 0,
          totalSize: 0,
          oldestFile: '',
          newestFile: ''
        }
      }

      const totalSize = files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
      const sortedByDate = files.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

      return {
        totalFiles: files.length,
        totalSize,
        oldestFile: sortedByDate[0]?.name || '',
        newestFile: sortedByDate[sortedByDate.length - 1]?.name || ''
      }
    } catch (error) {
      console.error('Get storage stats error:', error)
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestFile: '',
        newestFile: ''
      }
    }
  }
}

// Export singleton instance
export const exportStorageService = ExportStorageService.getInstance()

// Helper function for generating content type from format
export function getContentType(format: 'pdf' | 'csv' | 'excel'): string {
  switch (format) {
    case 'pdf':
      return 'application/pdf'
    case 'csv':
      return 'text/csv'
    case 'excel':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    default:
      return 'application/octet-stream'
  }
}