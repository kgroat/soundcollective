/// <reference path='../es6-promise/es6-promise.d.ts' />

interface Navigator {
    requestMIDIAccess: (MIDIOptions?: { sysex: boolean }) => Promise<MIDIAccess>;
}

interface navigator {
    requestMIDIAccess: (MIDIOptions?: { sysex: boolean }) => Promise<MIDIAccess>;
}

interface ES6Iterator<T> {
    next: () => { done: boolean; value: T; };
}

interface ES6ListLike<T, U, V> {
    entries: () => ES6Iterator<any[]>;
    forEach: (cb: (item: U, index: number, container: V) => any) => void;
    get: (index: number) => U;
    has: (index: number) => boolean;
    keys: () => ES6Iterator<T>;
    values: () => ES6Iterator<U>;
    size: number;
}



interface MIDIAccess {
    inputs: MIDIInputMap;
    outputs: MIDIOutputMap;
    onstatechange: EventHandler;
    sysexEnabled: boolean;
}

interface MIDIConnectionEvent extends Event {
    port: MIDIPort;
}

interface MIDIInput extends MIDIPort {
    onmidimessage: EventHandler;
}

interface MIDIInputMap extends ES6ListLike<number, MIDIInput, MIDIInputMap> {
}

interface MIDIMessageEvent extends Event {
    receivedTime: number;
    data: Uint8Array;
}

interface MIDIOutput extends MIDIPort {
    send: (data: number[], timestamp?: number) => void;
    clear: () => void;
}

interface MIDIOutputMap extends ES6ListLike<number, MIDIOutput, MIDIOutputMap> {
}

interface MIDIPort {
    id: string;
    manufacturer?: string;
    name?: string;
    type: string;
    version?: string;
    state: string;
    connection: string;
    onstatechange: EventHandler;
    open: () => Promise<MIDIPort>;
    close: () => Promise<MIDIPort>;
}