import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess, execFile } from 'child_process';
import readline from 'readline';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Find the Python executable from the project's virtual environments.
 * Checks tfenv first (the TensorFlow-dedicated venv), then .venv, then system python.
 */
function getPythonExecutable(): string {
    const candidates = [
        path.join(process.cwd(), 'tfenv', 'Scripts', 'python.exe'),
        path.join(process.cwd(), '.venv', 'Scripts', 'python.exe'),
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return 'python';
}

// ── Persistent Worker Manager ────────────────────────────────
// Keeps TensorFlow and the model warm in RAM for sub-second responses.

interface PendingTask {
    imagePath: string;
    resolve: (result: any) => void;
    reject: (error: any) => void;
    timestamp: number;
}

class ModelWorkerManager {
    private worker: ChildProcess | null = null;
    private isReady = false;
    private queue: PendingTask[] = [];
    private currentTask: PendingTask | null = null;
    private starting = false;

    constructor() {
        // Automatically start the worker to pre-warm the model
        this.ensureWorker();
    }

    private ensureWorker() {
        if (this.worker && !this.worker.killed) return;
        if (this.starting) return;
        this.starting = true;

        const pythonExe = getPythonExecutable();
        const scriptPath = path.join(process.cwd(), 'scripts', 'worker.py');

        if (!fs.existsSync(scriptPath)) {
            console.warn('[ModelWorker] worker.py not found, falling back to one-shot mode.');
            this.starting = false;
            return;
        }

        console.log('[ModelWorker] Pre-warming persistent TensorFlow model worker...');
        const t0 = Date.now();

        try {
            this.worker = spawn(pythonExe, ['-u', scriptPath], {
                cwd: process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe'],
            });

            const rl = readline.createInterface({ input: this.worker.stdout! });

            rl.on('line', (line: string) => {
                const trimmed = line.trim();
                if (!trimmed) return;

                if (!this.isReady && trimmed === 'READY') {
                    this.isReady = true;
                    this.starting = false;
                    console.log(`[ModelWorker] Model is WARM and READY in ${Date.now() - t0}ms.`);
                    this.processNext();
                    return;
                }

                if (this.currentTask) {
                    const task = this.currentTask;
                    this.currentTask = null;
                    try {
                        const json = JSON.parse(trimmed);
                        task.resolve(json);
                    } catch (e: any) {
                        task.reject(new Error(`Failed to parse worker output: ${trimmed}`));
                    }
                    this.processNext();
                }
            });

            this.worker.stderr?.on('data', (chunk: Buffer) => {
                const msg = chunk.toString();
                // Filter benign TensorFlow oneDNN / CPU notices
                if (!msg.includes('oneDNN') && !msg.includes('cpu_feature_guard') && !msg.includes('GPU support')) {
                    console.warn('[ModelWorker stderr]:', msg.trim());
                }
            });

            this.worker.on('error', (err) => {
                console.error('[ModelWorker] Process error:', err);
                this.restart();
            });

            this.worker.on('exit', (code) => {
                console.warn(`[ModelWorker] Exited with code ${code}`);
                this.restart();
            });
        } catch (err) {
            console.error('[ModelWorker] Failed to spawn worker:', err);
            this.starting = false;
        }
    }

    private restart() {
        this.worker = null;
        this.isReady = false;
        this.starting = false;

        // Fail current task so caller doesn't hang
        if (this.currentTask) {
            this.currentTask.reject(new Error('Model worker exited unexpectedly'));
            this.currentTask = null;
        }

        // Restart worker for future requests
        setTimeout(() => this.ensureWorker(), 1000);
    }

    private processNext() {
        if (!this.isReady || this.currentTask || this.queue.length === 0) {
            return;
        }

        this.currentTask = this.queue.shift()!;
        try {
            this.worker!.stdin!.write(this.currentTask.imagePath + '\n');
        } catch (err) {
            this.currentTask.reject(err);
            this.currentTask = null;
            this.restart();
        }
    }

    public predict(imagePath: string, timeoutMs = 30_000): Promise<any> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                // If timed out, remove from queue or fail
                const idx = this.queue.findIndex(t => t.imagePath === imagePath);
                if (idx !== -1) {
                    this.queue.splice(idx, 1);
                }
                reject(new Error(`Prediction timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            const wrappedResolve = (val: any) => {
                clearTimeout(timer);
                resolve(val);
            };

            const wrappedReject = (err: any) => {
                clearTimeout(timer);
                reject(err);
            };

            this.queue.push({
                imagePath,
                resolve: wrappedResolve,
                reject: wrappedReject,
                timestamp: Date.now(),
            });

            this.ensureWorker();
            this.processNext();
        });
    }
}

// Global worker singleton (persists across hot reloads in development)
declare global {
    var __modelWorker: ModelWorkerManager | undefined;
}

const workerManager: ModelWorkerManager =
    global.__modelWorker || (global.__modelWorker = new ModelWorkerManager());

/**
 * Run inference on an image buffer using the TensorFlow SavedModel.
 * Uses the persistent warm in-memory worker for sub-second responses (~300ms).
 */
export async function predictWithSavedModel(imageBuffer: Buffer) {
    const tempDir = path.join(process.cwd(), 'scratch');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFile = path.join(tempDir, `scan_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
    fs.writeFileSync(tempFile, imageBuffer);

    const tStart = Date.now();

    try {
        // Fast path: Persistent warm model worker
        const result = await workerManager.predict(tempFile);
        const elapsed = Date.now() - tStart;
        console.log(`[CANECARE Scanner] Inference completed in ${elapsed}ms:`, result.top?.label, `(${Math.round((result.top?.probability || 0)*100)}%)`);
        return result;
    } catch (workerErr: any) {
        console.warn(`[CANECARE Scanner] Persistent worker failed (${workerErr.message}), trying one-shot fallback...`);

        // Fallback: One-shot python execution if worker ever encounters an issue
        try {
            const scriptPath = path.join(process.cwd(), 'scripts', 'predict.py');
            const pythonExe = getPythonExecutable();

            const { stdout } = await execFileAsync(
                pythonExe,
                ['-u', scriptPath, tempFile],
                { cwd: process.cwd(), timeout: 60_000 }
            );

            const trimmed = stdout.trim();
            const jsonStart = trimmed.indexOf('{');
            if (jsonStart === -1) {
                return { error: 'Model returned non-JSON response' };
            }

            return JSON.parse(trimmed.substring(jsonStart));
        } catch (fallbackErr: any) {
            console.error('[CANECARE Scanner] Fallback prediction error:', fallbackErr);
            return { error: `Prediction failed: ${fallbackErr.message}` };
        }
    } finally {
        if (fs.existsSync(tempFile)) {
            try {
                fs.unlinkSync(tempFile);
            } catch {
                // Ignore temp cleanup errors
            }
        }
    }
}