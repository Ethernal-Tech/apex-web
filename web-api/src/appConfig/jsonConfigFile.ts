import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { resolveConfigDir } from './appConfig.helper';

export interface JsonConfigFileOptions<T> {
	/** Looked up in the same folders as the other appConfig JSON files. */
	fileName: string;
	/** What the file holds, for the log lines - e.g. "Token infos". */
	label: string;
	/** Throws when the contents are unusable, so the last good value is kept. */
	parse: (raw: unknown) => T;
	/** Short description of a parsed value, for the log lines. */
	summary: (value: T) => string;
	/** Served until the first successful read, and while the file is missing. */
	fallback: T;
}

/**
 * A JSON config file that is re-read whenever it changes on disk, so editing it
 * is enough - no rebuild, no redeploy, no restart.
 *
 * The fallback is served when the file cannot be found at all; when the file is
 * there but invalid, the last good contents are kept and the error is logged
 * once per change rather than on every request.
 */
export class JsonConfigFile<T> {
	private value: T;
	private filePath?: string;
	private filePathResolved = false;
	private loadedMtimeMs?: number;
	private missingFileLogged = false;

	constructor(private readonly options: JsonConfigFileOptions<T>) {
		this.value = options.fallback;
	}

	/**
	 * The current contents. Reloads first when the file changed, so callers
	 * always see the latest config without holding on to a stale copy.
	 */
	get(): T {
		this.reloadIfChanged();
		return this.value;
	}

	private reloadIfChanged(): void {
		const filePath = this.resolveFilePath();
		if (!filePath) {
			return;
		}

		let mtimeMs: number;
		try {
			mtimeMs = fs.statSync(filePath).mtimeMs;
		} catch {
			if (!this.missingFileLogged) {
				Logger.warn(
					`${this.options.label} file not found at ${filePath}, serving the built-in config: ${this.currentSummary()}`,
				);
				this.missingFileLogged = true;
			}
			return;
		}

		this.missingFileLogged = false;
		if (this.loadedMtimeMs === mtimeMs) {
			return;
		}

		// remembered even on failure, so a broken file is not re-parsed (and
		// re-logged) on every request - only once per change
		this.loadedMtimeMs = mtimeMs;

		try {
			const parsed = this.options.parse(
				JSON.parse(fs.readFileSync(filePath, 'utf8')),
			);
			this.value = parsed;
			Logger.log(
				`${this.options.label} loaded from ${filePath}: ${this.options.summary(parsed)}`,
			);
		} catch (error) {
			Logger.error(
				`Invalid ${this.options.label.toLowerCase()} file ${filePath}: ${error instanceof Error ? error.message : error}. Keeping the current config: ${this.currentSummary()}`,
			);
		}
	}

	/** Resolved once - the folder does not move while the process is running. */
	private resolveFilePath(): string | undefined {
		if (this.filePathResolved) {
			return this.filePath;
		}
		this.filePathResolved = true;

		const { fileName } = this.options;
		const dir = resolveConfigDir(fileName);
		this.filePath = dir ? path.join(dir, fileName) : undefined;
		if (!this.filePath) {
			Logger.warn(
				`No ${fileName} found, serving the built-in config: ${this.currentSummary()}`,
			);
		}
		return this.filePath;
	}

	private currentSummary(): string {
		return this.options.summary(this.value);
	}
}
