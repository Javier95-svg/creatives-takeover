import type { WebContainer, WebContainerProcess } from '@webcontainer/api';
import type { MVPProjectFile } from './project';

export type MVPWebContainerStatus =
  | 'idle'
  | 'unsupported'
  | 'booting'
  | 'mounting'
  | 'installing'
  | 'starting'
  | 'ready'
  | 'error';

export interface MVPWebContainerLog {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  createdAt: string;
}

export interface MVPWebContainerState {
  status: MVPWebContainerStatus;
  previewUrl: string | null;
  error: string | null;
  logs: MVPWebContainerLog[];
}

type StateListener = (state: MVPWebContainerState) => void;

const initialState: MVPWebContainerState = {
  status: 'idle',
  previewUrl: null,
  error: null,
  logs: [],
};

function isBrowserRuntimeSupported() {
  return typeof window !== 'undefined' && typeof SharedArrayBuffer !== 'undefined' && window.crossOriginIsolated === true;
}

function normalizePath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\.\/+/, '');
}

function buildFileTree(files: MVPProjectFile[]) {
  const root: Record<string, unknown> = {};

  for (const file of files) {
    const path = normalizePath(file.path);
    if (!path) continue;
    const parts = path.split('/').filter(Boolean);
    let cursor = root;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        cursor[part] = { file: { contents: file.content } };
        return;
      }
      const existing = cursor[part] as { directory?: Record<string, unknown> } | undefined;
      if (!existing?.directory) {
        cursor[part] = { directory: {} };
      }
      cursor = (cursor[part] as { directory: Record<string, unknown> }).directory;
    });
  }

  return root;
}

class MVPWebContainerRuntime {
  private webcontainer: WebContainer | null = null;
  private installProcess: WebContainerProcess | null = null;
  private devProcess: WebContainerProcess | null = null;
  private listeners = new Set<StateListener>();
  private state: MVPWebContainerState = initialState;

  subscribe(listener: StateListener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private setState(patch: Partial<MVPWebContainerState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener(this.state));
  }

  private log(level: MVPWebContainerLog['level'], message: string) {
    this.setState({
      logs: [
        ...this.state.logs.slice(-120),
        {
          id: crypto.randomUUID(),
          level,
          message,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }

  private async pipeOutput(process: WebContainerProcess, level: MVPWebContainerLog['level']) {
    process.output.pipeTo(new WritableStream({
      write: (chunk) => {
        const text = String(chunk).trim();
        if (text) this.log(level, text);
      },
    })).catch((error) => {
      this.log('warn', error instanceof Error ? error.message : String(error));
    });
  }

  async stop() {
    this.installProcess?.kill();
    this.devProcess?.kill();
    this.installProcess = null;
    this.devProcess = null;
    this.setState({ status: 'idle', previewUrl: null, error: null });
  }

  async start(files: MVPProjectFile[], options: { devCommand?: string; port?: number } = {}) {
    if (!isBrowserRuntimeSupported()) {
      this.setState({
        status: 'unsupported',
        previewUrl: null,
        error: 'WebContainer preview requires a cross-origin isolated browser context.',
      });
      return;
    }

    try {
      await this.stop();
      this.setState({ status: 'booting', previewUrl: null, error: null, logs: [] });
      this.log('info', 'Booting WebContainer...');

      if (!this.webcontainer) {
        const { WebContainer } = await import('@webcontainer/api');
        this.webcontainer = await WebContainer.boot();
        this.webcontainer.on('server-ready', (port, url) => {
          this.log('info', `Dev server ready on port ${port}`);
          this.setState({ status: 'ready', previewUrl: url, error: null });
        });
      }

      this.setState({ status: 'mounting' });
      await this.webcontainer.mount(buildFileTree(files));
      this.log('info', 'Project files mounted.');

      this.setState({ status: 'installing' });
      this.installProcess = await this.webcontainer.spawn('npm', ['install']);
      await this.pipeOutput(this.installProcess, 'info');
      const installExit = await this.installProcess.exit;
      if (installExit !== 0) {
        throw new Error(`npm install failed with exit code ${installExit}`);
      }

      this.setState({ status: 'starting' });
      const command = options.devCommand || 'npm run dev';
      const [cmd, ...args] = command.split(/\s+/).filter(Boolean);
      this.devProcess = await this.webcontainer.spawn(cmd || 'npm', args.length ? args : ['run', 'dev']);
      await this.pipeOutput(this.devProcess, 'info');

      window.setTimeout(() => {
        if (this.state.status === 'starting') {
          this.log('warn', `Waiting for Vite preview on port ${options.port ?? 5173}...`);
        }
      }, 6000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log('error', message);
      this.setState({ status: 'error', previewUrl: null, error: message });
    }
  }
}

export const mvpWebContainerRuntime = new MVPWebContainerRuntime();

