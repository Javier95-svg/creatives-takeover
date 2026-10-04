import { mkdir, readFile, writeFile, rename, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

// Host-only recovery log. Never store passwords, tokens, source or service keys.
export class CleanupJournal {
  constructor(directory) { this.directory = directory; }
  path(id) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid cleanup identifier');
    return join(this.directory, id + '.json');
  }
  async save(entry) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const path = this.path(entry.id);
    await writeFile(path + '.tmp', JSON.stringify(entry), { mode: 0o600 });
    await rename(path + '.tmp', path);
  }
  async remove(id) { await unlink(this.path(id)); }
  async entries() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const files = await readdir(this.directory);
    return Promise.all(files.filter(f => f.endsWith('.json')).map(async f => JSON.parse(await readFile(join(this.directory, f), 'utf8'))));
  }
}
