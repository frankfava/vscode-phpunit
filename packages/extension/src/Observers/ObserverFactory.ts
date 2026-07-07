import {
    AliasMap,
    type IConfiguration,
    PHPUnitXML,
    type PresetName,
    Printer,
    type PrinterFormat,
    resolveFormat,
    type TestDefinition,
    type TestRunnerObserver,
} from '@vscode-phpunit/phpunit';
import { inject, injectable } from 'inversify';
import type { OutputChannel, TestItem, TestRun } from 'vscode';
import { Configuration } from '../Configuration';
import { TestCollection } from '../TestCollection/TestCollection';
import { TYPES } from '../types';
import { DatasetObserver } from './DatasetObserver';
import { DebugOutputObserver } from './DebugOutputObserver';
import { ErrorDialogObserver } from './ErrorDialogObserver';
import { PrinterObserver } from './PrinterObserver';
import { TestResultObserver } from './TestResultObserver';
import { type PhpUnitTerminal, TerminalWriter, TestRunWriter } from './Writers';

@injectable()
export class ObserverFactory {
    constructor(
        @inject(TestCollection) private testCollection: TestCollection,
        @inject(TYPES.OutputChannel) private outputChannel: OutputChannel,
        @inject(Configuration) private configuration: IConfiguration,
        @inject(PHPUnitXML) private phpUnitXML: PHPUnitXML,
        @inject(TYPES.Terminal) private terminal: PhpUnitTerminal,
    ) {}

    create(queue: Map<TestDefinition, TestItem>, testRun: TestRun): TestRunnerObserver[] {
        const testItemById = new AliasMap<TestItem>(
            [...queue.values()].map((item) => [item.id, item]),
        );
        const format = resolveFormat(
            (this.configuration.get('output.preset') ?? 'collision') as PresetName,
            this.configuration.get('output.format') as Partial<PrinterFormat> | undefined,
        );

        const observers: TestRunnerObserver[] = [
            new DatasetObserver(this.testCollection, testItemById),
            new TestResultObserver(queue, testRun, testItemById),
            new DebugOutputObserver(this.outputChannel, this.configuration, testItemById),
            new PrinterObserver(
                new TestRunWriter(testRun, testItemById),
                new Printer(this.phpUnitXML, format),
            ),
            new ErrorDialogObserver(this.configuration),
        ];

        if (this.configuration.get('output.terminal') === true) {
            this.terminal.clear();
            this.terminal.show();
            observers.push(
                new PrinterObserver(
                    new TerminalWriter(this.terminal),
                    new Printer(this.phpUnitXML, format),
                ),
            );
        }

        return observers;
    }
}
