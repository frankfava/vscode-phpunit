import { PHPUnitXML, type TestDefinition } from '@vscode-phpunit/phpunit';
import { beforeEach, describe, expect, it } from 'vitest';
import type { OutputChannel, TestItem, TestRun } from 'vscode';
import type { Configuration } from '../Configuration';
import type { TestCollection } from '../TestCollection/TestCollection';
import { DatasetObserver } from './DatasetObserver';
import { ObserverFactory } from './ObserverFactory';
import { PrinterObserver } from './PrinterObserver';
import { TestResultObserver } from './TestResultObserver';
import type { PhpUnitTerminal } from './Writers';

describe('ObserverFactory', () => {
    let factory: ObserverFactory;
    let outputChannel: OutputChannel;
    let terminal: PhpUnitTerminal;

    function createFactory(config: Partial<Record<string, unknown>> = {}) {
        const testCollection = {
            getTestDefinition: () => undefined,
            resolveDatasetChild: () => undefined,
        } as unknown as TestCollection;
        outputChannel = {
            append: () => {},
            appendLine: () => {},
            clear: () => {},
            show: () => {},
        } as unknown as OutputChannel;
        const configuration = {
            get: (key: string) => config[key],
        } as unknown as Configuration;
        const phpUnitXML = new PHPUnitXML();
        terminal = {
            append: () => {},
            clear: () => {},
            show: () => {},
        } as unknown as PhpUnitTerminal;
        return new ObserverFactory(
            testCollection,
            outputChannel,
            configuration,
            phpUnitXML,
            terminal,
        );
    }

    beforeEach(() => {
        factory = createFactory();
    });

    it('should create observers including DatasetObserver, TestResultObserver, and PrinterObserver', () => {
        const queue = new Map<TestDefinition, TestItem>();
        const testRun = { enqueued: () => {} } as unknown as TestRun;
        const observers = factory.create(queue, testRun);

        expect(observers.length).toBe(5);
        expect(observers.some((o) => o instanceof DatasetObserver)).toBe(true);
        expect(observers.some((o) => o instanceof TestResultObserver)).toBe(true);
        expect(observers.some((o) => o instanceof PrinterObserver)).toBe(true);
    });

    it('should add a terminal PrinterObserver when output.terminal is enabled', () => {
        factory = createFactory({ 'output.terminal': true });
        const queue = new Map<TestDefinition, TestItem>();
        const testRun = { enqueued: () => {} } as unknown as TestRun;

        const observers = factory.create(queue, testRun);

        expect(observers.length).toBe(6);
        expect(observers.filter((o) => o instanceof PrinterObserver).length).toBe(2);
    });

    it('should create new instances for each call', () => {
        const queue = new Map<TestDefinition, TestItem>();
        const testRun = { enqueued: () => {} } as unknown as TestRun;
        const observers1 = factory.create(queue, testRun);
        const observers2 = factory.create(queue, testRun);

        const output1 = observers1.find((o) => o instanceof PrinterObserver);
        const output2 = observers2.find((o) => o instanceof PrinterObserver);

        expect(output1).not.toBe(output2);
    });
});
