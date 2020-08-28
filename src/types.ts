import { Terminal, EventEmitter } from "vscode";
import { FlowTreeItem } from "./flowTreeItem1";

export type ITerminalMap = Map<string, Terminal>;

export type ScriptEventEmitter = EventEmitter<FlowTreeItem | undefined>;
export type MaybeScript = FlowTreeItem | undefined;
