"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BFPortalCompletionProvider = void 0;
const vscode = __importStar(require("vscode"));
class BFPortalCompletionProvider {
    constructor(typeParser) {
        this.typeParser = typeParser;
    }
    provideCompletionItems(document, position, token, context) {
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
                return enumInfo.members.map((member) => {
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
    getModNamespaceCompletions() {
        const completions = [];
        if (!this.typeParser) {
            return this.getFallbackCompletions();
        }
        // Add functions
        const functions = this.typeParser.getFunctions();
        functions.forEach((func, name) => {
            const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Function);
            item.detail = `(${func.params.map((p) => `${p.name}: ${p.type}`).join(', ')}): ${func.returnType}`;
            // Create snippet with parameters
            const paramSnippets = func.params.map((p, i) => `\${${i + 1}:${p.name}}`).join(', ');
            item.insertText = new vscode.SnippetString(`${name}(${paramSnippets})`);
            const markdown = new vscode.MarkdownString();
            markdown.appendCodeblock(`mod.${name}(${func.params.map((p) => `${p.name}: ${p.type}`).join(', ')}): ${func.returnType}`, 'typescript');
            item.documentation = markdown;
            completions.push(item);
        });
        // Add types
        const types = this.typeParser.getTypes();
        types.forEach((type, name) => {
            const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Class);
            item.detail = `Type: ${name}`;
            completions.push(item);
        });
        // Add enums
        const enums = this.typeParser.getEnums();
        enums.forEach((enumInfo, name) => {
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
    getFallbackCompletions() {
        // Fallback completions if type parser not available
        const fallbackFunctions = [
            { name: 'AllPlayers', detail: '(): Array', doc: 'Returns an array of all players' },
            { name: 'GetTeam', detail: '(player: Player): Team', doc: 'Gets the team of a player' },
            { name: 'Message', detail: '(text: string): Message', doc: 'Creates a message' },
            { name: 'CountOf', detail: '(array: Array): number', doc: 'Gets array length' },
            { name: 'ValueInArray', detail: '(array: Array, index: number): any', doc: 'Gets array element' },
        ];
        return fallbackFunctions.map((f) => {
            const item = new vscode.CompletionItem(f.name, vscode.CompletionItemKind.Function);
            item.detail = f.detail;
            item.documentation = new vscode.MarkdownString(f.doc);
            return item;
        });
    }
    getEventHandlerCompletions() {
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
        return handlers.map((h) => {
            const item = new vscode.CompletionItem(h.label, vscode.CompletionItemKind.Function);
            item.detail = h.detail;
            item.insertText = new vscode.SnippetString(h.snippet);
            return item;
        });
    }
}
exports.BFPortalCompletionProvider = BFPortalCompletionProvider;
//# sourceMappingURL=completions.js.map