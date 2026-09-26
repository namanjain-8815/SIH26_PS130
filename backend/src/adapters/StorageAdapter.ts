export interface StoredFile {
  url: string;
  file_name: string;
}

export interface StorageAdapter {
  save(originalName: string, buffer: Buffer): Promise<StoredFile>;
  delete(url: string): Promise<void>;
}
