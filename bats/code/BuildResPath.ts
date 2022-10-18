import { readdirSync, statSync, writeFileSync } from "fs";
import * as path from "path";
import { MODIFY_TIP, ResDir, ResPathPath } from "./Const";
import { UpperFirst } from "./Utils";

export default class BuildResPath {
    constructor() {
        let content = this.buildResEnum(ResDir, "res/");
        content = `${ MODIFY_TIP }export namespace ResPath {\n${ content }}`;
        writeFileSync(ResPathPath, content);
    }

    private buildResEnum(dirPath: string, dirName: string, baseContent?: string) {
        let content = baseContent || "";
        const isUI = dirName.startsWith("res/ui/");
        const isFont = dirName.startsWith("res/font/");
        let allFiles = readdirSync(dirPath);
        let dirs: string[] = [];
        let files: string[] = [];
        allFiles.forEach(fileName => {
            const filePath = path.resolve(dirPath, fileName);
            const info = statSync(filePath);
            if (info.isDirectory()) {
                dirs.push(fileName);
            } else {
                files.push(fileName);
            }
        });
        // files.forEach(fileName => {
        //     let tempName = fileName.split(".")[ 0 ];
        //     let temp: string = "";
        //     if (isUI && fileName.endsWith(".zip") == false) return;
        //     if (isUI) fileName = tempName;
        //     if (isUI || isFont) temp = `\t${ tempName } = "${ tempName }",\n`;
        //     temp += `\t${ UpperFirst(dirName.replace("res/", ""), [ "/" ]) + tempName } = "${ dirName + fileName }",\n`;
        //     content += temp;
        // });
        if (isUI) {
            content += this.buildEnum("UIName", false, dirName, files, ".zip");
            content += "\n" + this.buildEnum("UIPath", true, dirName, files, ".zip");
        } else if (isFont) {
            content += this.buildEnum("FontName", false, dirName, files);
            content += "\n" + this.buildEnum("FontPath", true, dirName, files);
        } else {
            if (!baseContent) content += this.buildEnum("UnclassifiedPath", true, dirName, files);
            else {
                const dirs = dirName.split("/");
                content += this.buildEnum(UpperFirst(dirs[ dirs.length - 2 ] + "Path"), true, dirName, files);
            }
        }
        dirs.forEach(fileName => {
            const filePath = path.resolve(dirPath, fileName);
            let subDir = dirName + fileName + "/";
            content = this.buildResEnum(filePath, subDir, content + `\n\t// ${ subDir }\n`);
        });
        return content;
    }

    private buildEnum(name: string, path: boolean, dir: string, files: string[], include?: string) {
        let content = "";
        files.forEach(v => {
            if (include && v.endsWith(include) == false) return;
            const fileName = v.split(".")[ 0 ];
            if (path) content += `\n\t\t${ UpperFirst(fileName) } = "${ dir + (include ? fileName : v) }",`;
            else content += `\n\t\t${ UpperFirst(fileName) } = "${ fileName }",`;
        });
        if (content) return `\texport const enum ${ name } {${ content }\n\t}\n`;
        else return `\texport const enum ${ name } {}\n`;
    }
}