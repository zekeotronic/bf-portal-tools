import * as fs from 'fs';
import * as path from 'path';

export interface FunctionSignature {
    name: string;
    params: { name: string; type: string }[];
    returnType: string;
    description?: string;
    isAsync?: boolean;
}

export interface EnumInfo {
    name: string;
    members: string[];
}

export interface TypeInfo {
    name: string;
    kind: 'type' | 'interface' | 'class' | 'enum';
}

export class TypeDefinitionParser {
    private typeDefsPath: string;
    private functions: Map<string, FunctionSignature> = new Map<string, FunctionSignature>();
    private enums: Map<string, EnumInfo> = new Map<string, EnumInfo>();
    private types: Map<string, TypeInfo> = new Map<string, TypeInfo>();

    constructor(typeDefsPath: string) {
        this.typeDefsPath = typeDefsPath;
        this.parse();
    }

    private parse(): void {
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

    private parseEnums(content: string): void {
        // Match: export enum EnumName { Member1, Member2, ... }
        const enumRegex = /export\s+enum\s+(\w+)\s*\{([^}]+)\}/g;
        let match;

        while ((match = enumRegex.exec(content)) !== null) {
            const enumName = match[1];
            const membersStr = match[2];
            
            // Extract enum members
            const members = membersStr
                .split(',')
                .map((m: string) => m.trim())
                .filter((m: string) => m && !m.startsWith('//'));

            this.enums.set(enumName, { name: enumName, members });
        }
    }

    private parseTypes(content: string): void {
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

    private parseFunctions(content: string): void {
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
            const params: { name: string; type: string }[] = [];
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

    public getFunctions(): Map<string, FunctionSignature> {
        return this.functions;
    }

    public getEnums(): Map<string, EnumInfo> {
        return this.enums;
    }

    public getTypes(): Map<string, TypeInfo> {
        return this.types;
    }

    public getFunction(name: string): FunctionSignature | undefined {
        return this.functions.get(name);
    }

    public getEnum(name: string): EnumInfo | undefined {
        return this.enums.get(name);
    }

    public getType(name: string): TypeInfo | undefined {
        return this.types.get(name);
    }
}