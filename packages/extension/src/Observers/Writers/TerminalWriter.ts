import type { OutputLocation, OutputWriter } from '@vscode-phpunit/phpunit';
import type { PhpUnitTerminal } from './PhpUnitTerminal';

/**
 * Streams printer output into the integrated PHPUnit terminal. ANSI colors are
 * preserved (unlike {@link OutputChannelWriter}); location/testId are not
 * meaningful for a plain terminal and are ignored.
 */
export class TerminalWriter implements OutputWriter {
    constructor(private terminal: PhpUnitTerminal) {}

    append(text: string, _location?: OutputLocation, _testId?: string): void {
        this.terminal.append(text);
    }

    appendLine(text: string, _location?: OutputLocation, _testId?: string): void {
        this.terminal.append(`${text}\n`);
    }
}
