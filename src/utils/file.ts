/**
 * File-related utility functions
 */

import { promises as fs } from 'fs';
import { resolve } from 'path';

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read JSON file and parse it
 */
export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  const content = await fs.readFile(resolve(filePath), 'utf8');
  return JSON.parse(content) as T;
}

/**
 * Write object to JSON file
 */
export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(resolve(filePath), content, 'utf8');
}

/**
 * Read text file
 */
export async function readTextFile(filePath: string): Promise<string> {
  return fs.readFile(resolve(filePath), 'utf8');
}

/**
 * Write text to file
 */
export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await fs.writeFile(resolve(filePath), content, 'utf8');
}

/**
 * Create directory if it doesn't exist
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(resolve(dirPath), { recursive: true });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Get file stats
 */
export async function getFileStats(filePath: string): Promise<{
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  isDirectory: boolean;
  isFile: boolean;
}> {
  const stats = await fs.stat(resolve(filePath));
  return {
    size: stats.size,
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime,
    isDirectory: stats.isDirectory(),
    isFile: stats.isFile(),
  };
}

/**
 * List files in directory
 */
export async function listFiles(
  dirPath: string,
  options: { recursive?: boolean; pattern?: RegExp } = {}
): Promise<string[]> {
  const { recursive = false, pattern } = options;
  const files: string[] = [];

  async function scanDirectory(currentPath: string): Promise<void> {
    const entries = await fs.readdir(resolve(currentPath), { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = joinPath(currentPath, entry.name);

      if (entry.isFile()) {
        if (pattern === undefined || pattern.test(entry.name)) {
          files.push(fullPath);
        }
      } else if (entry.isDirectory() && recursive) {
        await scanDirectory(fullPath);
      }
    }
  }

  await scanDirectory(dirPath);
  return files;
}

/**
 * Copy file
 */
export async function copyFile(source: string, destination: string): Promise<void> {
  await fs.copyFile(resolve(source), resolve(destination));
}

/**
 * Move/rename file
 */
export async function moveFile(source: string, destination: string): Promise<void> {
  await fs.rename(resolve(source), resolve(destination));
}

/**
 * Delete file
 */
export async function deleteFile(filePath: string): Promise<void> {
  await fs.unlink(resolve(filePath));
}

/**
 * Delete directory (recursively)
 */
export async function deleteDirectory(dirPath: string): Promise<void> {
  await fs.rmdir(resolve(dirPath), { recursive: true });
}

/**
 * Categorize a file based on its path and extension
 */
export function categorizeFile(filePath: string): string {
  const path = filePath.toLowerCase();
  const extensionMap: Record<string, string> = {
    '.ts': 'code',
    '.js': 'code',
    '.tsx': 'code',
    '.jsx': 'code',
    '.py': 'code',
    '.css': 'style',
    '.scss': 'style',
    '.less': 'style',
    '.sass': 'style',
    '.md': 'docs',
    '.txt': 'docs',
    '.rst': 'docs',
    '.json': 'config',
    '.yaml': 'config',
    '.yml': 'config',
    '.toml': 'config',
    '.png': 'asset',
    '.jpg': 'asset',
    '.jpeg': 'asset',
    '.svg': 'asset',
    '.gif': 'asset',
    '.ico': 'asset',
    '.proto': 'proto',
    '.sh': 'build',
    '.bat': 'build',
    '.ps1': 'build',
  };

  // Get file extension
  const ext = filePath.substring(filePath.lastIndexOf('.'));
  const category = extensionMap[ext];
  if (category !== undefined) return category;

  // Fallback to path-based categorization
  if (path.includes('test') || path.includes('spec')) return 'test';
  if (path.includes('doc') || path.includes('readme')) return 'docs';
  if (path.includes('config')) return 'config';
  if (path.includes('package') && path.includes('lock')) return 'deps';
  if (path.includes('build') || path.includes('dist')) return 'build';

  return 'misc';
}

/**
 * Get file extension from path
 */
export function getFileExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  return lastDot === -1 ? '' : filePath.substring(lastDot);
}

/**
 * Get file name without extension
 */
export function getFileNameWithoutExtension(filePath: string): string {
  const fileName = getFileName(filePath);
  const lastDot = fileName.lastIndexOf('.');
  return lastDot === -1 ? fileName : fileName.substring(0, lastDot);
}

/**
 * Get file name from path
 */
export function getFileName(filePath: string): string {
  const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return lastSlash === -1 ? filePath : filePath.substring(lastSlash + 1);
}

/**
 * Get directory path from file path
 */
export function getDirectoryPath(filePath: string): string {
  const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return lastSlash === -1 ? '.' : filePath.substring(0, lastSlash);
}

/**
 * Check if path is likely a directory (no extension)
 */
export function isLikelyDirectory(path: string): boolean {
  const fileName = getFileName(path);
  return !fileName.includes('.') || fileName.startsWith('.');
}

/**
 * Normalize path separators to forward slashes
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * Join path segments
 */
export function joinPath(...segments: string[]): string {
  return segments
    .map((segment, index) => {
      if (index === 0) return segment.replace(/\/$/, '');
      return segment.replace(/^\/|\/$/g, '');
    })
    .filter((segment) => segment.length > 0)
    .join('/');
}

/**
 * Check if file path matches common patterns
 */
export const FILE_PATTERNS = {
  isTestFile: (path: string): boolean => {
    const lower = path.toLowerCase();
    return (
      lower.includes('test') ||
      lower.includes('spec') ||
      lower.endsWith('.test.ts') ||
      lower.endsWith('.test.js') ||
      lower.endsWith('.spec.ts') ||
      lower.endsWith('.spec.js')
    );
  },

  isConfigFile: (path: string): boolean => {
    const lower = path.toLowerCase();
    return (
      lower.includes('config') ||
      lower.includes('.env') ||
      lower.endsWith('.json') ||
      lower.endsWith('.yaml') ||
      lower.endsWith('.yml') ||
      lower.endsWith('.toml')
    );
  },

  isSourceCode: (path: string): boolean => {
    const ext = getFileExtension(path).toLowerCase();
    return ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.rs', '.go'].includes(ext);
  },

  isDocumentation: (path: string): boolean => {
    const lower = path.toLowerCase();
    const ext = getFileExtension(path).toLowerCase();
    return (
      ext === '.md' ||
      ext === '.txt' ||
      ext === '.rst' ||
      lower.includes('readme') ||
      lower.includes('doc')
    );
  },

  isBuildArtifact: (path: string): boolean => {
    const lower = path.toLowerCase();
    return (
      lower.includes('build') ||
      lower.includes('dist') ||
      lower.includes('target') ||
      lower.includes('out') ||
      lower.includes('bin')
    );
  },
} as const;
