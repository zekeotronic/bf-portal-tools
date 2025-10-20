import * as vscode from 'vscode';

export class BFPortalDiagnostics {
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('bf-portal');
  }

  public updateDiagnostics(document: vscode.TextDocument): void {
    if (!this.isPortalDocument(document)) {
      return;
    }

    const config = vscode.workspace.getConfiguration('bfPortal');
    if (!config.get('enableDiagnostics', true)) {
      return;
    }

    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    // Check for import statements (not allowed)
    const importRegex = /^import\s+.*\s+from\s+['"].*['"]/gm;
    let match;
    while ((match = importRegex.exec(text)) !== null) {
      const pos = document.positionAt(match.index);
      const line = document.lineAt(pos.line);
      const diagnostic = new vscode.Diagnostic(
        line.range,
        'Import statements are not supported in BF Portal. Use the mod namespace instead.',
        vscode.DiagnosticSeverity.Error
      );
      diagnostic.code = 'no-imports';
      diagnostics.push(diagnostic);
    }

    // Check for require statements
    const requireRegex = /require\s*\(\s*['"].*['"]\s*\)/g;
    while ((match = requireRegex.exec(text)) !== null) {
      const pos = document.positionAt(match.index);
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(pos, document.positionAt(match.index + match[0].length)),
        'require() is not supported in BF Portal scripts.',
        vscode.DiagnosticSeverity.Error
      );
      diagnostic.code = 'no-require';
      diagnostics.push(diagnostic);
    }

    // Check for browser APIs
    const browserAPIs = ['localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest', 'document', 'window'];
    for (const api of browserAPIs) {
      const apiRegex = new RegExp(`\\b${api}\\b`, 'g');
      while ((match = apiRegex.exec(text)) !== null) {
        const pos = document.positionAt(match.index);
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(pos, document.positionAt(match.index + match[0].length)),
          `Browser API '${api}' is not available in BF Portal.`,
          vscode.DiagnosticSeverity.Error
        );
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
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(pos, document.positionAt(match.index + match[0].length)),
          `Event handler '${handler}' must be exported. Add 'export' keyword.`,
          vscode.DiagnosticSeverity.Warning
        );
        diagnostic.code = 'missing-export';
        diagnostics.push(diagnostic);
      }
    }

    // Check for async without await (common mistake)
    const asyncNoAwaitRegex = /export\s+async\s+function\s+(\w+)\s*\([^)]*\)\s*{[^}]*}/g;
    while ((match = asyncNoAwaitRegex.exec(text)) !== null) {
      if (!match[0].includes('await')) {
        const pos = document.positionAt(match.index);
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(pos, document.positionAt(match.index + match[0].length)),
          `Function '${match[1]}' is marked async but doesn't use await. Consider removing async if not needed.`,
          vscode.DiagnosticSeverity.Information
        );
        diagnostic.code = 'unnecessary-async';
        diagnostics.push(diagnostic);
      }
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  public validateDocument(document: vscode.TextDocument): Promise<void> {
    return new Promise<void>((resolve) => {
      this.updateDiagnostics(document);
      
      const diagnostics = this.diagnosticCollection.get(document.uri);
      if (!diagnostics || diagnostics.length === 0) {
        vscode.window.showInformationMessage('✓ No issues found in Portal script');
      } else {
        const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
        const warnings = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning).length;
        vscode.window.showWarningMessage(
          `Found ${errors} error(s) and ${warnings} warning(s)`
        );
      }
      
      resolve();
    });
  }

  private isPortalDocument(document: vscode.TextDocument): boolean {
    return (
      document.languageId === 'typescript' ||
      document.languageId === 'bf-portal-ts' ||
      document.fileName.endsWith('.portal.ts')
    );
  }

  public dispose(): void {
    this.diagnosticCollection.dispose();
  }
}