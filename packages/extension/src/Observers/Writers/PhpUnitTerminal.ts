import { EventEmitter, type Pseudoterminal, type Terminal, window } from 'vscode';

/**
 * Owns a lazily-created integrated terminal backed by a write-emitter
 * pseudoterminal. Test output (with ANSI colors) is streamed into it so runs
 * can be watched in a real terminal panel, independent of the Test Explorer.
 */
export class PhpUnitTerminal {
    private static readonly NAME = 'PHPUnit';

    private readonly writeEmitter = new EventEmitter<string>();
    private terminal?: Terminal;
    private opened = false;
    private readonly pending: string[] = [];

    append(text: string): void {
        this.write(text.replace(/\r?\n/g, '\r\n'));
    }

    /** Clear screen + scrollback and move the cursor home. */
    clear(): void {
        this.write('\x1b[2J\x1b[3J\x1b[H');
    }

    /** Reveal the terminal without stealing editor focus. */
    show(): void {
        this.ensureTerminal().show(true);
    }

    private write(data: string): void {
        this.ensureTerminal();
        if (this.opened) {
            this.writeEmitter.fire(data);
        } else {
            // Writes before the pty is opened would be dropped; buffer them.
            this.pending.push(data);
        }
    }

    private ensureTerminal(): Terminal {
        if (this.terminal) {
            return this.terminal;
        }

        this.opened = false;
        const pty: Pseudoterminal = {
            onDidWrite: this.writeEmitter.event,
            open: () => {
                this.opened = true;
                if (this.pending.length > 0) {
                    this.writeEmitter.fire(this.pending.join(''));
                    this.pending.length = 0;
                }
            },
            close: () => {},
        };

        this.terminal = window.createTerminal({ name: PhpUnitTerminal.NAME, pty });
        const disposable = window.onDidCloseTerminal((closed) => {
            if (closed === this.terminal) {
                this.terminal = undefined;
                this.opened = false;
                this.pending.length = 0;
                disposable.dispose();
            }
        });

        return this.terminal;
    }
}
