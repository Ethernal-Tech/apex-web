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

	stateStr = () =>
		`[m|c|ql]=[${this.max}|${this.current}|${this.queue.length}]`;

	acquire(): Promise<void> {
		return new Promise((resolve) => {
			const prevState = this.stateStr();

			if (this.current < this.max) {
				++this.current;
				resolve();
			} else {
				this.queue.push(resolve);
			}

			Logger.debug(
				`${this.loggerPrefix}acquired - ${prevState} => ${this.stateStr()}`,
			);
		});
	}

	release(): void {
		const prevState = this.stateStr();

		if (this.queue.length > 0) {
			const next = this.queue.shift();
			next && next();
		} else {
			this.current = Math.max(this.current - 1, 0);
		}

		Logger.debug(
			`${this.loggerPrefix}released - ${prevState} => ${this.stateStr()}`,
		);
	}
}
