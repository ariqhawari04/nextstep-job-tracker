import {readFileSync} from 'node:fs';
import ts from 'typescript';
export function moduleURL(path,replacements={}){let code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;for(const [from,to] of Object.entries(replacements))code=code.replaceAll(from,to);return 'data:text/javascript;base64,'+Buffer.from(code).toString('base64')}
export const scannerURL=moduleURL('lib/job-scan.ts');
export const networkURL=moduleURL('lib/scan-network.ts',{'./job-scan':scannerURL});
