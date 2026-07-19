import { MessageAttachmentPayload } from "../types/index.js";

export interface IFileService {
  /**
   * Uploads a raw binary or buffer into the storage provider
   */
  uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folder?: string
  ): Promise<MessageAttachmentPayload>;

  /**
   * Generates a secure, temporary pre-signed URL for direct browser uploads
   */
  generatePresignedUploadUrl(fileName: string, mimeType: string): Promise<{ uploadUrl: string; fileUrl: string }>;

  /**
   * Deletes a file from remote storage
   */
  deleteFile(fileUrl: string): Promise<boolean>;
}
