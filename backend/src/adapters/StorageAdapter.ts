export interface StoredFile {
  url: string;
  file_name: string;
}

export interface StorageAdapter {
  save(originalName: string, buffer: Buffer): Promise<StoredFile>;
  delete(url: string): Promise<void>;
  read(url: string): Promise<Buffer | null>;
  exists?(url: string): Promise<boolean>;
}

