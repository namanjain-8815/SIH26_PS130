import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { StorageAdapter, StoredFile } from './StorageAdapter';

function getUploadDir(): string {
  if (process.cwd().endsWith('backend')) {
    return path.join(process.cwd(), 'uploads');
  }
  return path.join(process.cwd(), 'backend', 'uploads');
}

export class LocalStorageAdapter implements StorageAdapter {
  private getUploadDirs(): string[] {
    const cwd = process.cwd();
    return Array.from(new Set([
      getUploadDir(),
      path.join(cwd, 'uploads'),
      path.join(cwd, 'backend', 'uploads'),
      path.resolve(__dirname, '../../uploads'),
      path.resolve(__dirname, '../../../uploads'),
    ]));
  }

  async save(originalName: string, buffer: Buffer): Promise<StoredFile> {
    const uploadDir = getUploadDir();
    await fs.mkdir(uploadDir, { recursive: true });
    const safeName = `${randomUUID()}-${originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    await fs.writeFile(path.join(uploadDir, safeName), buffer);
    return { url: `/uploads/${safeName}`, file_name: originalName };
  }

  async delete(url: string): Promise<void> {
    const baseName = path.basename(url);
    for (const dir of this.getUploadDirs()) {
      const filePath = path.join(dir, baseName);
      await fs.rm(filePath, { force: true }).catch(() => {});
    }
  }

  async read(url: string): Promise<Buffer | null> {
    if (!url) return null;
    const baseName = path.basename(url);
    const cleanUrl = url.replace(/^\/+/, '');
    const relativeToUploads = url.replace(/^\/?uploads\/?/, '');

    const candidatePaths: string[] = [];
    for (const dir of this.getUploadDirs()) {
      candidatePaths.push(path.join(dir, baseName));
      candidatePaths.push(path.join(dir, 'demo', baseName));
      candidatePaths.push(path.join(dir, relativeToUploads));
      candidatePaths.push(path.resolve(dir, '..', cleanUrl));
    }
    candidatePaths.push(path.join(process.cwd(), cleanUrl));

    for (const p of candidatePaths) {
      try {
        const stats = await fs.stat(p);
        if (stats.isFile()) {
          return await fs.readFile(p);
        }
      } catch {
        // try next candidate
      }
    }
    return null;
  }
}

