/**
 * Storage Service - Supabase Storage integration
 * Handles file uploads with optimization and validation
 */

import { createClient } from '@/lib/supabase/client'

export type StorageBucket = 'cleaning-photos' | 'documents' | 'logos'

export interface UploadOptions {
  bucket: StorageBucket
  path?: string
  maxSizeMB?: number
  optimize?: boolean
  resize?: {
    width: number
    height: number
    fit?: 'cover' | 'contain' | 'fill'
  }
}

export interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

export class StorageService {
  private supabase: any = createClient()

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    file: File,
    options: UploadOptions
  ): Promise<UploadResult> {
    try {
      // Validate file size
      const maxSize = (options.maxSizeMB || 5) * 1024 * 1024 // Convert MB to bytes
      if (file.size > maxSize) {
        return {
          success: false,
          error: `File size exceeds ${options.maxSizeMB || 5}MB`
        }
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return {
          success: false,
          error: 'Only image files are allowed'
        }
      }

      // Generate unique filename
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const extension = file.name.split('.').pop()
      const filename = `${timestamp}-${randomString}.${extension}`

      // Build storage path
      const storagePath = options.path
        ? `${options.path}/${filename}`
        : filename

      // Optimize image if requested
      let fileToUpload = file
      if (options.optimize || options.resize) {
        fileToUpload = await this.optimizeImage(file, options.resize)
      }

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(options.bucket)
        .upload(storagePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        return {
          success: false,
          error: error.message
        }
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(options.bucket)
        .getPublicUrl(data.path)

      return {
        success: true,
        url: urlData.publicUrl,
        path: data.path
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      return {
        success: false,
        error: error.message || 'Upload failed'
      }
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(
    files: File[],
    options: UploadOptions
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = []

    for (const file of files) {
      const result = await this.uploadFile(file, options)
      results.push(result)
    }

    return results
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(bucket: StorageBucket, path: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([path])

      if (error) {
        console.error('Delete error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Delete error:', error)
      return false
    }
  }

  /**
   * Delete multiple files
   */
  async deleteMultiple(bucket: StorageBucket, paths: string[]): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(bucket)
        .remove(paths)

      if (error) {
        console.error('Delete error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Delete error:', error)
      return false
    }
  }

  /**
   * Optimize image (resize and compress)
   */
  private async optimizeImage(
    file: File,
    resize?: { width: number; height: number; fit?: 'cover' | 'contain' | 'fill' }
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            resolve(file) // Fallback to original file
            return
          }

          // Calculate dimensions
          let width = img.width
          let height = img.height

          if (resize) {
            const targetWidth = resize.width
            const targetHeight = resize.height
            const fit = resize.fit || 'cover'

            if (fit === 'cover') {
              // Cover: fill the target dimensions, crop if needed
              const ratio = Math.max(targetWidth / width, targetHeight / height)
              width = width * ratio
              height = height * ratio
            } else if (fit === 'contain') {
              // Contain: fit within target dimensions, keep aspect ratio
              const ratio = Math.min(targetWidth / width, targetHeight / height)
              width = width * ratio
              height = height * ratio
            } else {
              // Fill: stretch to target dimensions
              width = targetWidth
              height = targetHeight
            }

            canvas.width = targetWidth
            canvas.height = targetHeight

            // Center the image
            const x = (targetWidth - width) / 2
            const y = (targetHeight - height) / 2

            ctx.drawImage(img, x, y, width, height)
          } else {
            // No resize, just optimize quality
            canvas.width = width
            canvas.height = height
            ctx.drawImage(img, 0, 0)
          }

          // Convert to blob with compression
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const optimizedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                })
                resolve(optimizedFile)
              } else {
                resolve(file) // Fallback
              }
            },
            'image/jpeg',
            0.85 // 85% quality
          )
        }

        img.onerror = () => resolve(file) // Fallback
        img.src = e.target?.result as string
      }

      reader.onerror = () => resolve(file) // Fallback
      reader.readAsDataURL(file)
    })
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: StorageBucket, path: string): string {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  }

  /**
   * List files in a bucket path
   */
  async listFiles(
    bucket: StorageBucket,
    path?: string
  ): Promise<{ name: string; id: string; updated_at: string }[]> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .list(path)

      if (error) {
        console.error('List files error:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('List files error:', error)
      return []
    }
  }
}

// Export singleton instance
export const storageService = new StorageService()
