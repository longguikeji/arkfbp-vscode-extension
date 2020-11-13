import { Terminal, EventEmitter } from "vscode";
import { FlowTreeItem } from "./flowTreeItem";

export type ITerminalMap = Map<string, Terminal>;

export type ScriptEventEmitter = EventEmitter<FlowTreeItem | void>;
export type MaybeScript = FlowTreeItem | void;
