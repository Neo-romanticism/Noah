import type { BrowserWindow } from 'electron';

export function sendDialog(win: BrowserWindow, text: string): void {
  win.webContents.send('dialog:show', text);
}

export function sendAutonomousAction(
  win: BrowserWindow,
  action: { type: string; payload: string }
): void {
  win.webContents.send('action:autonomous', action);
}