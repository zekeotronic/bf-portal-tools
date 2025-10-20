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
exports.activate = activate;
exports.deactivate = deactivate;
exports.getTypeParser = getTypeParser;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const diagnostics_1 = require("./diagnostics");
const completions_1 = require("./completions");
const hover_1 = require("./hover");
const typeParser_1 = require("./typeParser");
let typeParser = null;
function activate(context) {
    console.log('Battlefield Portal Tools is now active!');
    // Initialize type parser
    const typeDefsPath = context.asAbsolutePath('types/bf-portal/index.d.ts');
    typeParser = new typeParser_1.TypeDefinitionParser(typeDefsPath);
    const diagnostics = new diagnostics_1.BFPortalDiagnostics();
    const completionProvider = new completions_1.BFPortalCompletionProvider(typeParser);
    const hoverProvider = new hover_1.BFPortalHoverProvider(typeParser);
    // Register providers
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(['typescript', 'bf-portal-ts'], completionProvider, '.', 'm'));
    context.subscriptions.push(vscode.languages.registerHoverProvider(['typescript', 'bf-portal-ts'], hoverProvider));
    // Signature help provider
    const signatureHelpProvider = vscode.languages.registerSignatureHelpProvider(['typescript', 'bf-portal-ts'], {
        provideSignatureHelp(document, position) {
            const linePrefix = document.lineAt(position).text.substr(0, position.character);
            const match = linePrefix.match(/mod\.(\w+)\s*\(/);
            if (match && typeParser) {
                const funcName = match[1];
                const func = typeParser.getFunction(funcName);
                if (func) {
                    const signature = new vscode.SignatureInformation(`mod.${func.name}(${func.params.map((p) => `${p.name}: ${p.type}`).join(', ')}): ${func.returnType}`);
                    func.params.forEach((param) => {
                        signature.parameters.push(new vscode.ParameterInformation(`${param.name}: ${param.type}`, new vscode.MarkdownString(`**${param.name}** - Type: \`${param.type}\``)));
                    });
                    const help = new vscode.SignatureHelp();
                    help.signatures = [signature];
                    help.activeSignature = 0;
                    help.activeParameter = 0; // Could be calculated based on comma count
                    return help;
                }
            }
            return null;
        }
    }, '(', ',');
    context.subscriptions.push(signatureHelpProvider);
    // Watch for document changes to update diagnostics
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(doc => diagnostics.updateDiagnostics(doc)), vscode.workspace.onDidSaveTextDocument(doc => diagnostics.updateDiagnostics(doc)), vscode.workspace.onDidChangeTextDocument(e => diagnostics.updateDiagnostics(e.document)));
    // Initialize diagnostics for already open documents
    vscode.workspace.textDocuments.forEach(doc => diagnostics.updateDiagnostics(doc));
    // Initialize Project Command
    const initProjectCommand = vscode.commands.registerCommand('bf-portal.initProject', async () => {
        await initializeProject(context);
    });
    // Validate Script Command
    const validateCommand = vscode.commands.registerCommand('bf-portal.validateScript', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        await diagnostics.validateDocument(editor.document);
    });
    // Update Types Command
    const updateTypesCommand = vscode.commands.registerCommand('bf-portal.updateTypes', async () => {
        await updateTypeDefinitions(context);
    });
    // Show Type Info Command
    const showTypeInfoCommand = vscode.commands.registerCommand('bf-portal.showTypeInfo', async () => {
        if (!typeParser) {
            vscode.window.showErrorMessage('Type definitions not loaded');
            return;
        }
        const functions = typeParser.getFunctions();
        const enums = typeParser.getEnums();
        const types = typeParser.getTypes();
        const info = `
**Battlefield Portal Type Information**

- **Functions**: ${functions.size}
- **Enums**: ${enums.size}
- **Types**: ${types.size}

Use IntelliSense (Ctrl+Space) to explore available APIs!
    `;
        vscode.window.showInformationMessage(info);
    });
    context.subscriptions.push(initProjectCommand, validateCommand, updateTypesCommand, showTypeInfoCommand);
    // Auto-setup for Portal projects
    autoSetupPortalProject(context);
}
async function initializeProject(context) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }
    const rootPath = workspaceFolder.uri.fsPath;
    const typesPath = context.asAbsolutePath('types/bf-portal');
    // Create tsconfig.json
    const tsconfig = {
        compilerOptions: {
            target: "ES2020",
            module: "ESNext",
            lib: ["ES2020"],
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            noEmit: true,
            moduleResolution: "node",
            typeRoots: [typesPath, "./node_modules/@types"],
            types: ["bf-portal"]
        },
        include: ["**/*.ts", "**/*.portal.ts"],
        exclude: ["node_modules", "out"]
    };
    const tsconfigPath = path.join(rootPath, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
        fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    }
    // Create .vscode directory and settings
    const vscodeDir = path.join(rootPath, '.vscode');
    if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir);
    }
    const settings = {
        "typescript.tsdk": "node_modules/typescript/lib",
        "typescript.enablePromptUseWorkspaceTsdk": true,
        "bfPortal.enableDiagnostics": true
    };
    fs.writeFileSync(path.join(vscodeDir, 'settings.json'), JSON.stringify(settings, null, 2));
    // Create sample script with helper library import
    const sampleScript = `/**
 * Battlefield Portal Script
 * 
 * This script demonstrates the Portal API with the helper library.
 */

// This function is called when the game mode starts
export function OnGameModeStarted() {
  console.log('Game mode started!');
  
  // Example: Show a message to all players
  modlib.ShowEventGameModeMessage(
    mod.Message('Welcome to the server!'),
    undefined // undefined = all players
  );
}

// Called when a player joins the game
export function OnPlayerJoinGame(eventPlayer: mod.Player) {
  console.log('Player joined:', eventPlayer);
  
  // Welcome the player with a custom notification
  modlib.DisplayCustomNotificationMessage(
    mod.Message('Welcome!'),
    mod.CustomNotificationSlots.HeaderText,
    5, // duration in seconds
    eventPlayer
  );
}

// Called when a player dies
export function OnPlayerDied(
  eventPlayer: mod.Player,
  eventOtherPlayer: mod.Player,
  eventDeathType: mod.DeathType,
  eventWeaponUnlock: mod.WeaponUnlock
): void {
  console.log('Player died:', eventPlayer);
}

// Called when a player deploys/spawns
export function OnPlayerDeployed(eventPlayer: mod.Player): void {
  console.log('Player deployed:', eventPlayer);
  
  // Example: Set player health
  const players = mod.AllPlayers();
  const count = mod.CountOf(players);
  
  for (let i = 0; i < count; i++) {
    const player = mod.ValueInArray(players, i) as mod.Player;
    // Do something with each player
  }
}
`;
    const mainScriptPath = path.join(rootPath, 'Script.ts');
    if (!fs.existsSync(mainScriptPath)) {
        fs.writeFileSync(mainScriptPath, sampleScript);
    }
    const stringsPath = path.join(rootPath, 'Strings.json');
    if (!fs.existsSync(stringsPath)) {
        fs.writeFileSync(stringsPath, '{}');
    }
    // Copy modlib if provided
    // const modlibSource = context.asAbsolutePath('templates/modlib.ts');
    // const modlibDest = path.join(rootPath, 'modlib.ts');
    // if (fs.existsSync(modlibSource) && !fs.existsSync(modlibDest)) {
    //   fs.copyFileSync(modlibSource, modlibDest);
    // }
    // Open the main script
    const doc = await vscode.workspace.openTextDocument(mainScriptPath);
    await vscode.window.showTextDocument(doc);
    vscode.window.showInformationMessage('✓ BF Portal project initialized! Check Script.ts');
}
async function updateTypeDefinitions(context) {
    vscode.window.showInformationMessage('Updating BF Portal type definitions...');
    // Reload type parser
    const typeDefsPath = context.asAbsolutePath('types/bf-portal/index.d.ts');
    typeParser = new typeParser_1.TypeDefinitionParser(typeDefsPath);
    vscode.window.showInformationMessage('✓ Type definitions reloaded!');
}
async function autoSetupPortalProject(context) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders)
        return;
    for (const folder of workspaceFolders) {
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '**/*.portal.ts'), null, 1);
        if (files.length > 0) {
            const tsconfigPath = path.join(folder.uri.fsPath, 'tsconfig.json');
            if (!fs.existsSync(tsconfigPath)) {
                const result = await vscode.window.showInformationMessage('BF Portal scripts detected. Would you like to set up TypeScript configuration?', 'Yes', 'No');
                if (result === 'Yes') {
                    await initializeProject(context);
                }
            }
        }
    }
}
function deactivate() {
    console.log('Battlefield Portal Tools deactivated');
}
function getTypeParser() {
    return typeParser;
}
//# sourceMappingURL=extension.js.map