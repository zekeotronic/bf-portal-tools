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
exports.BFPortalHoverProvider = void 0;
const vscode = __importStar(require("vscode"));
class BFPortalHoverProvider {
    constructor(typeParser) {
        this.typeParser = typeParser;
    }
    provideHover(document, position, token) {
        const range = document.lineAt(position).range;
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange)
            return undefined;
        const word = document.getText(wordRange);
        // Check if it's a mod.* function
        const lineText = document.lineAt(position).text;
        const modMatch = lineText.match(/mod\.(\w+)/);
        if (modMatch && this.typeParser) {
            const funcName = modMatch[1];
            // Check if it's a function
            const func = this.typeParser.getFunction(funcName);
            if (func) {
                const signature = `mod.${func.name}(${func.params.map((p) => `${p.name}: ${p.type}`).join(', ')}): ${func.returnType}`;
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
    getFallbackHover(word) {
        const docs = {
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
exports.BFPortalHoverProvider = BFPortalHoverProvider;
//# sourceMappingURL=hover.js.map