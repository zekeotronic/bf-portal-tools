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
exports.BFPortalDiagnostics = void 0;
const vscode = __importStar(require("vscode"));
class BFPortalDiagnostics {
    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('bf-portal');
    }
    updateDiagnostics(document) {
        if (!this.isPortalDocument(document)) {
            return;
        }
        const config = vscode.workspace.getConfiguration('bfPortal');
        if (!config.get('enableDiagnostics', true)) {
            return;
        }
        const diagnostics = [];
        const text = document.getText();
        const lines = text.split('\n');
        // Check for import statements (not allowed)
        const importRegex = /^import\s+.*\s+from\s+['"].*['"]/gm;
        let match;
        while ((match = importRegex.exec(text)) !== null) {
            const pos = document.positionAt(match.index);
            const line = document.lineAt(pos.line);
            const diagnostic = new vscode.Diagnostic(line.range, 'Import statements are not supported in BF Portal. Use the mod namespace instead.', vscode.DiagnosticSeverity.Error);
            diagnostic.code = 'no-imports';
            diagnostics.push(diagnostic);
        }
        // Check for require statements
        const requireRegex = /require\s*\(\s*['"].*['"]\s*\)/g;
        while ((match = requireRegex.exec(text)) !== null) {
            const pos = document.positionAt(match.index);
            const diagnostic = new vscode.Diagnostic(new vscode.Range(pos, document.positionAt(match.index + match[0].length)), 'require() is not supported in BF Portal scripts.', vscode.DiagnosticSeverity.Error);
            diagnostic.code = 'no-require';
            diagnostics.push(diagnostic);
        }
        // Check for browser APIs
        const browserAPIs = ['localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest', 'document', 'window'];
        for (const api of browserAPIs) {
            const apiRegex = new RegExp(`\\b${api}\\b`, 'g');
            while ((match = apiRegex.exec(text)) !== null) {
                const pos = document.positionAt(match.index);
                const diagnostic = new vscode.Diagnostic(new vscode.Range(pos, document.positionAt(match.index + match[0].length)), `Browser API '${api}' is not available in BF Portal.`, vscode.DiagnosticSeverity.Error);
                diagnostic.code = 'no-browser-api';
                diagnostics.push(diagnostic);
            }
        }
        // Check for missing export keyword on event handlers
        const eventHandlers = [
            'OnGameModeStarted',
            'OnPlayerJoinGame',
            'OnPlayerDied',
            'OnPlayerDeployed',
            'OnVehicleSpawned',
            'OnVehicleDestroyed'
        ];
        for (const handler of eventHandlers) {
            const handlerRegex = new RegExp(`^\\s*function\\s+${handler}\\s*\\(`, 'gm');
            while ((match = handlerRegex.exec(text)) !== null) {
                const pos = document.positionAt(match.index);
                const diagnostic = new vscode.Diagnostic(new vscode.Range(pos, document.positionAt(match.index + match[0].length)), `Event handler '${handler}' must be exported. Add 'export' keyword.`, vscode.DiagnosticSeverity.Warning);
                diagnostic.code = 'missing-export';
                diagnostics.push(diagnostic);
            }
        }
        // Check for async without await (common mistake)
        const asyncNoAwaitRegex = /export\s+async\s+function\s+(\w+)\s*\([^)]*\)\s*{[^}]*}/g;
        while ((match = asyncNoAwaitRegex.exec(text)) !== null) {
            if (!match[0].includes('await')) {
                const pos = document.positionAt(match.index);
                const diagnostic = new vscode.Diagnostic(new vscode.Range(pos, document.positionAt(match.index + match[0].length)), `Function '${match[1]}' is marked async but doesn't use await. Consider removing async if not needed.`, vscode.DiagnosticSeverity.Information);
                diagnostic.code = 'unnecessary-async';
                diagnostics.push(diagnostic);
            }
        }
        this.diagnosticCollection.set(document.uri, diagnostics);
    }
    validateDocument(document) {
        return new Promise((resolve) => {
            this.updateDiagnostics(document);
            const diagnostics = this.diagnosticCollection.get(document.uri);
            if (!diagnostics || diagnostics.length === 0) {
                vscode.window.showInformationMessage('✓ No issues found in Portal script');
            }
            else {
                const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
                const warnings = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning).length;
                vscode.window.showWarningMessage(`Found ${errors} error(s) and ${warnings} warning(s)`);
            }
            resolve();
        });
    }
    isPortalDocument(document) {
        return (document.languageId === 'typescript' ||
            document.languageId === 'bf-portal-ts' ||
            document.fileName.endsWith('.portal.ts'));
    }
    dispose() {
        this.diagnosticCollection.dispose();
    }
}
exports.BFPortalDiagnostics = BFPortalDiagnostics;
//# sourceMappingURL=diagnostics.js.map