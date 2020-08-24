import cp = require('child_process');
import * as vscode from 'vscode';
import { window } from 'vscode';
import { resolve } from 'dns';


export function runCommandInIntegratedTerminal(terminal: vscode.Terminal, cmd: string, args: string[], cwd: string | undefined): void {
    const cmd_args = Array.from(args);

    terminal.show();

	if (cwd) {
		// Replace single backslash with double backslash.
		const textCwd = cwd.replace(/\\/g, '\\\\');
		terminal.sendText(['cd', `"${textCwd}"`].join(' '));
	}
	cmd_args.splice(0, 0, cmd);
	terminal.sendText(cmd_args.join(' '));
}