import * as fs from "fs";
import * as ts from "typescript";
import { BuildBase } from "./BuildBase";
import { MODIFY_TIP, UserDataEventPath, UserDataInterfaceDir } from "./Const";
import { UpperFirst } from "./Utils";

interface IIterfaceInfo {
    name: string;
    fields: string[];
    methods: string[];
}

export class BuildDataEvent extends BuildBase {
    doBuild(): void {
        if (fs.existsSync(UserDataInterfaceDir) == false) return console.error("文件夹不存在=>" + UserDataInterfaceDir);
        const files = fs.readdirSync(UserDataInterfaceDir);
        const infos: IIterfaceInfo[] = [];
        files.forEach(v => {
            const info = this.getFileInfo(UserDataInterfaceDir + "/" + v);
            infos.push(...info);
        });
        let context = MODIFY_TIP + "export const enum UserDataEvent {\r";
        infos.forEach(v => {
            context += `\t//${ v.name }\r`;
            v.fields.forEach(f => context += `\t${ v.name.substring(1) }_${ UpperFirst(f) }_Changed = "${ v.name.substring(1).toLocaleLowerCase() }_${ f.toLocaleLowerCase() }_changed",\r`);
        });
        context += "}";
        fs.writeFileSync(UserDataEventPath, context);

    }

    private getFileInfo(filePath: string) {
        const context = fs.readFileSync(filePath, "utf-8");
        const sourceFile = ts.createSourceFile('info.d.ts', context, ts.ScriptTarget.ES2022);
        const infos: IIterfaceInfo[] = [];
        this.decodeFile(sourceFile, infos);
        return infos;
    }

    private decodeFile(node: ts.Node, infos: IIterfaceInfo[]) {
        ts.forEachChild(node, child => {
            if (ts.isInterfaceDeclaration(child)) {
                infos.push(this.decodeInterface(child));
            }
        });
    }

    private decodeInterface(node: ts.InterfaceDeclaration) {
        const info: IIterfaceInfo = { name: node.name.text, fields: [], methods: [] };
        ts.forEachChild(node, child => {
            if (ts.isPropertySignature(child)) {
                info.fields.push(child.name[ "text" ]);
            } else if (ts.isMethodSignature(child)) {
                info.methods.push(child.name[ "text" ]);
            }
        });
        return info;
    }
}