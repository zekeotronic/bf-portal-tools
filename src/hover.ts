import * as vscode from 'vscode';
import { TypeDefinitionParser } from './typeParser';

export class BFPortalHoverProvider implements vscode.HoverProvider {
  constructor(private typeParser: TypeDefinitionParser | null) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.Hover | undefined {
    const range = document.lineAt(position).range;
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) return undefined;

    const word = document.getText(wordRange);
    
    // Check if it's a mod.* function
    const lineText = document.lineAt(position).text;
    const modMatch = lineText.match(/mod\.(\w+)/);
    
    if (modMatch && this.typeParser) {
      const funcName = modMatch[1];
      
      // Check if it's a function
      const func = this.typeParser.getFunction(funcName);
      if (func) {
        const signature = `mod.${func.name}(${func.params.map((p: any) => `${p.name}: ${p.type}`).join(', ')}): ${func.returnType}`;
        const markdown = new vscode.MarkdownString();
        markdown.appendCodeblock(signature, 'typescript');
        
        if (func.description) {
          markdown.appendMarkdown(`\n\n${func.description}`);
        }
        
        return new vscode.Hover(markdown);
      }
      
      // Check if it's an enum
      const enumInfo = this.typeParser.getEnum(funcName);
      if (enumInfo) {
        const markdown = new vscode.MarkdownString();
        markdown.appendCodeblock(`enum ${enumInfo.name}`, 'typescript');
        markdown.appendMarkdown(`\n\nMembers: ${enumInfo.members.join(', ')}`);
        return new vscode.Hover(markdown);
      }
      
      // Check if it's a type
      const typeInfo = this.typeParser.getType(funcName);
      if (typeInfo) {
        const markdown = new vscode.MarkdownString();
        markdown.appendCodeblock(`type ${typeInfo.name}`, 'typescript');
        return new vscode.Hover(markdown);
      }
    }

    return this.getFallbackHover(word);
  }

  private getFallbackHover(word: string): vscode.Hover | undefined {
    const docs: { [key: string]: string } = {
      'OnGameModeStarted': '```typescript\nexport function OnGameModeStarted(): void\n```\n\nCalled when the game mode starts.',
      'OnPlayerJoinGame': '```typescript\nexport function OnPlayerJoinGame(eventPlayer: mod.Player): void\n```\n\nCalled when a player joins.',
      'AllPlayers': '```typescript\nmod.AllPlayers(): mod.Array\n```\n\nReturns an array of all players in the game.',
      'GetTeam': '```typescript\nmod.GetTeam(player: mod.Player): mod.Team\n```\n\nGets the team of a player.',
    };

    if (docs[word]) {
      return new vscode.Hover(new vscode.MarkdownString(docs[word]));
    }

    return undefined;
  }
}