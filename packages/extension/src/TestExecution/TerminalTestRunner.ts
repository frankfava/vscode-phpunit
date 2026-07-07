import {
    BinaryDetector,
    PHPUnitXML,
    type PresetName,
    Printer,
    type PrinterFormat,
    resolveFormat,
    TestRunner,
    TestRunnerEvent,
} from '@vscode-phpunit/phpunit';
import { type Uri, type WorkspaceFolder, window, workspace } from 'vscode';
import { Configuration } from '../Configuration';
import { PrinterObserver } from '../Observers/PrinterObserver';
import { type PhpUnitTerminal, TerminalWriter } from '../Observers/Writers';
import { ProcessBuilderFactory } from './ProcessBuilderFactory';

/**
 * Runs PHPUnit and streams collision-formatted output into the shared PHPUnit
 * terminal, WITHOUT registering a Test Explorer controller.
 *
 * This powers terminal output while the extension is deferring Test Explorer
 * registration to another provider (phpunit.deferToExtensions). The terminal
 * output is a by-product of *this* extension running PHPUnit, so
 * it needs its own lightweight run path — VS Code exposes no API to observe
 * another extension's test runs. It intentionally reuses the same
 * ProcessBuilder/Printer pipeline as the Test Explorer path so the formatted
 * output is identical; it just skips everything tied to TestItem/TestRun.
 */
export class TerminalTestRunner {
    constructor(private terminal: PhpUnitTerminal) {}

    /** Run every test in the given file (typically the active editor). */
    async runFile(uri: Uri): Promise<void> {
        const folder = workspace.getWorkspaceFolder(uri);
        if (!folder) {
            window.showWarningMessage('PHPUnit: the active file is not inside a workspace folder.');
            return;
        }
        await this.run(folder, uri.fsPath);
    }

    /** Run the whole test suite for a workspace folder. */
    async runAll(folder: WorkspaceFolder): Promise<void> {
        await this.run(folder);
    }

    private async run(folder: WorkspaceFolder, target?: string): Promise<void> {
        const configuration = new Configuration(
            workspace.getConfiguration('phpunit', folder.uri),
            new BinaryDetector(folder.uri.fsPath),
        );

        const phpUnitXML = new PHPUnitXML();
        const configurationFile = await configuration.getConfigurationFile(folder.uri.fsPath);
        if (configurationFile) {
            await phpUnitXML.loadFile(configurationFile);
        } else {
            phpUnitXML.setRoot(folder.uri.fsPath);
        }

        const builder = await new ProcessBuilderFactory(configuration, phpUnitXML, folder).create();
        if (target) {
            builder.setArguments(target);
        }

        const format = resolveFormat(
            (configuration.get('output.preset') ?? 'collision') as PresetName,
            configuration.get('output.format') as Partial<PrinterFormat> | undefined,
        );

        this.terminal.clear();
        this.terminal.show();

        const runner = new TestRunner();
        runner.observe(
            new PrinterObserver(new TerminalWriter(this.terminal), new Printer(phpUnitXML, format)),
        );
        runner.emit(TestRunnerEvent.start, undefined);

        try {
            await runner.run(builder).run();
        } finally {
            runner.emit(TestRunnerEvent.done, undefined);
        }
    }
}
