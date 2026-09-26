import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { StorageAdapter, StoredFile } from './StorageAdapter';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

/**
 * MVP implementation, local disk behind the StorageAdapter interface — swap
 * for an S3/Supabase-backed adapter later without touching call sites
 * (plan §16, §29).
 */
export class LocalStorageAdapter implements StorageAdapter {
  async save(originalName: string, buffer: Buffer): Promise<StoredFile> {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const safeName = `${randomUUID()}-${originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    await fs.writeFile(path.join(UPLOAD_DIR, safeName), buffer);
    return { url: `/uploads/${safeName}`, file_name: originalName };
  }

  async delete(url: string): Promise<void> {
    const filePath = path.join(UPLOAD_DIR, path.basename(url));
    await fs.rm(filePath, { force: true });
  }
}
