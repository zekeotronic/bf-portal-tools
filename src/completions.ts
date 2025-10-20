import * as vscode from 'vscode';
import { TypeDefinitionParser } from './typeParser';

export class BFPortalCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private typeParser: TypeDefinitionParser | null) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document.lineAt(position).text.substring(0, position.character);

    // Provide mod.* completions
    if (linePrefix.endsWith('mod.')) {
      return this.getModNamespaceCompletions();
    }

    // Provide enum completions
    const enumMatch = linePrefix.match(/mod\.(\w+)\./);
    if (enumMatch && this.typeParser) {
      const enumName = enumMatch[1];
      const enumInfo = this.typeParser.getEnum(enumName);
      if (enumInfo) {
        return enumInfo.members.map((member: string) => {
          const item = new vscode.CompletionItem(member, vscode.CompletionItemKind.EnumMember);
          item.detail = `${enumName}.${member}`;
          return item;
        });
      }
    }

    // Provide event handler completions
    if (linePrefix.match(/export\s+function\s+On/)) {
      return this.getEventHandlerCompletions();
    }

    return undefined;
  }

  private getModNamespaceCompletions(): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];

    if (!this.typeParser) {
      return this.getFallbackCompletions();
    }

    // Add functions
    const functions = this.typeParser.getFunctions();
    functions.forEach((func: any, name: string) => {
      const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Function);
      item.detail = `(${func.params.map((p: any) => `${p.name}: ${p.type}`).join(', ')}): ${func.returnType}`;
      
      // Create snippet with parameters
      const paramSnippets = func.params.map((p: any, i: number) => `\${${i + 1}:${p.name}}`).join(', ');
      item.insertText = new vscode.SnippetString(`${name}(${paramSnippets})`);
      
      const markdown = new vscode.MarkdownString();
      markdown.appendCodeblock(`mod.${name}(${func.params.map((p: any) => `${p.name}: ${p.type}`).join(', ')}): ${func.returnType}`, 'typescript');
      item.documentation = markdown;
      
      completions.push(item);
    });

    // Add types
    const types = this.typeParser.getTypes();
    types.forEach((type: any, name: string) => {
      const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Class);
      item.detail = `Type: ${name}`;
      completions.push(item);
    });

    // Add enums
    const enums = this.typeParser.getEnums();
    enums.forEach((enumInfo: any, name: string) => {
      const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Enum);
      item.detail = `Enum: ${name}`;
      const markdown = new vscode.MarkdownString();
      markdown.appendText(`Members: ${enumInfo.members.slice(0, 10).join(', ')}`);
      if (enumInfo.members.length > 10) {
        markdown.appendText(`... (${enumInfo.members.length - 10} more)`);
      }
      item.documentation = markdown;
      completions.push(item);
    });

    return completions;
  }

  private getFallbackCompletions(): vscode.CompletionItem[] {
    // Fallback completions if type parser not available
    const fallbackFunctions = [
      { name: 'AllPlayers', detail: '(): Array', doc: 'Returns an array of all players' },
      { name: 'GetTeam', detail: '(player: Player): Team', doc: 'Gets the team of a player' },
      { name: 'Message', detail: '(text: string): Message', doc: 'Creates a message' },
      { name: 'CountOf', detail: '(array: Array): number', doc: 'Gets array length' },
      { name: 'ValueInArray', detail: '(array: Array, index: number): any', doc: 'Gets array element' },
    ];

    return fallbackFunctions.map((f: any) => {
      const item = new vscode.CompletionItem(f.name, vscode.CompletionItemKind.Function);
      item.detail = f.detail;
      item.documentation = new vscode.MarkdownString(f.doc);
      return item;
    });
  }

  private getEventHandlerCompletions(): vscode.CompletionItem[] {
    const handlers = [
      {
        label: 'OnGameModeStarted',
        snippet: 'OnGameModeStarted() {\n\t$0\n}',
        detail: '(): void'
      },
      {
        label: 'OnPlayerJoinGame',
        snippet: 'OnPlayerJoinGame(eventPlayer: mod.Player) {\n\t$0\n}',
        detail: '(eventPlayer: Player): void'
      },
      {
        label: 'OnPlayerDied',
        snippet: 'OnPlayerDied(\n\teventPlayer: mod.Player,\n\teventOtherPlayer: mod.Player,\n\teventDeathType: mod.DeathType,\n\teventWeaponUnlock: mod.WeaponUnlock\n): void {\n\t$0\n}',
        detail: '(eventPlayer: Player, eventOtherPlayer: Player, eventDeathType: DeathType, eventWeaponUnlock: WeaponUnlock): void'
      },
      {
        label: 'OnPlayerDeployed',
        snippet: 'OnPlayerDeployed(eventPlayer: mod.Player): void {\n\t$0\n}',
        detail: '(eventPlayer: Player): void'
      }
    ];

    return handlers.map((h: any) => {
      const item = new vscode.CompletionItem(h.label, vscode.CompletionItemKind.Function);
      item.detail = h.detail;
      item.insertText = new vscode.SnippetString(h.snippet);
      return item;
    });
  }
}