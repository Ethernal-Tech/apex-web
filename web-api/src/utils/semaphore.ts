import { Logger } from '@nestjs/common';

export class Semaphore {
	private max: number;
	private current: number;
	private queue: (() => void)[];

	private loggerPrefix: string;

	constructor(max: number, loggerPrefix: string = '') {
		this.max = max;
		this.current = 0;
		this.queue = [];
		this.loggerPrefix = loggerPrefix;
	}

	acquire(): Promise<void> {
		return new Promise((resolve) => {
			Logger.debug(
				`${this.loggerPrefix}acquiring - [c|m|ql]=[${this.current}|${this.max}|${this.queue.length}]`,
			);
			if (this.current < this.max) {
				++this.current;
				resolve();
			} else {
				this.queue.push(resolve);
			}
			Logger.debug(
				`${this.loggerPrefix}acquired - [c|m|ql]=[${this.current}|${this.max}|${this.queue.length}]`,
			);
		});
	}

	release(): void {
		Logger.debug(
			`${this.loggerPrefix}releasing - [c|m|ql]=[${this.current}|${this.max}|${this.queue.length}]`,
		);
		if (this.queue.length > 0) {
			const next = this.queue.shift();
			next && next();
		} else {
			this.current = Math.max(this.current - 1, 0);
		}
		Logger.debug(
			`${this.loggerPrefix}released - [c|m|ql]=[${this.current}|${this.max}|${this.queue.length}]`,
		);
	}
}
