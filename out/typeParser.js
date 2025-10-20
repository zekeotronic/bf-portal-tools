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
exports.TypeDefinitionParser = void 0;
const fs = __importStar(require("fs"));
class TypeDefinitionParser {
    constructor(typeDefsPath) {
        this.functions = new Map();
        this.enums = new Map();
        this.types = new Map();
        this.typeDefsPath = typeDefsPath;
        this.parse();
    }
    parse() {
        if (!fs.existsSync(this.typeDefsPath)) {
            console.warn('Type definitions not found:', this.typeDefsPath);
            return;
        }
        const content = fs.readFileSync(this.typeDefsPath, 'utf8');
        // Parse enums
        this.parseEnums(content);
        // Parse types
        this.parseTypes(content);
        // Parse functions
        this.parseFunctions(content);
    }
    parseEnums(content) {
        // Match: export enum EnumName { Member1, Member2, ... }
        const enumRegex = /export\s+enum\s+(\w+)\s*\{([^}]+)\}/g;
        let match;
        while ((match = enumRegex.exec(content)) !== null) {
            const enumName = match[1];
            const membersStr = match[2];
            // Extract enum members
            const members = membersStr
                .split(',')
                .map((m) => m.trim())
                .filter((m) => m && !m.startsWith('//'));
            this.enums.set(enumName, { name: enumName, members });
        }
    }
    parseTypes(content) {
        // Match opaque types: export type TypeName = { _opaque: typeof Symbol };
        const opaqueTypeRegex = /export\s+type\s+(\w+)\s*=\s*\{[^}]*_opaque[^}]*\}/g;
        let match;
        while ((match = opaqueTypeRegex.exec(content)) !== null) {
            const typeName = match[1];
            this.types.set(typeName, { name: typeName, kind: 'type' });
        }
        // Match regular types
        const typeRegex = /export\s+type\s+(\w+)\s*=/g;
        while ((match = typeRegex.exec(content)) !== null) {
            const typeName = match[1];
            if (!this.types.has(typeName)) {
                this.types.set(typeName, { name: typeName, kind: 'type' });
            }
        }
    }
    parseFunctions(content) {
        // Match function declarations
        // export function FunctionName(param: Type): ReturnType;
        // export function FunctionName(param: Type, param2: Type): ReturnType;
        const funcRegex = /export\s+(async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*:\s*([^;]+);/g;
        let match;
        while ((match = funcRegex.exec(content)) !== null) {
            const isAsync = !!match[1];
            const funcName = match[2];
            const paramsStr = match[3];
            const returnType = match[4].trim();
            // Parse parameters
            const params = [];
            if (paramsStr.trim()) {
                const paramPairs = paramsStr.split(',');
                for (const pair of paramPairs) {
                    const colonIndex = pair.lastIndexOf(':');
                    if (colonIndex > 0) {
                        const name = pair.substring(0, colonIndex).trim();
                        const type = pair.substring(colonIndex + 1).trim();
                        params.push({ name, type });
                    }
                }
            }
            this.functions.set(funcName, {
                name: funcName,
                params,
                returnType,
                isAsync
            });
        }
    }
    getFunctions() {
        return this.functions;
    }
    getEnums() {
        return this.enums;
    }
    getTypes() {
        return this.types;
    }
    getFunction(name) {
        return this.functions.get(name);
    }
    getEnum(name) {
        return this.enums.get(name);
    }
    getType(name) {
        return this.types.get(name);
    }
}
exports.TypeDefinitionParser = TypeDefinitionParser;
//# sourceMappingURL=typeParser.js.map