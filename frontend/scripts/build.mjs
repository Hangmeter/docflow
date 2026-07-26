import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
await cp('src/js', 'dist/js', { recursive: true });
await cp('src/css', 'dist/css', { recursive: true });
