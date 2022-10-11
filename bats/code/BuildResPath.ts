import { readdirSync, statSync, writeFileSync } from "fs";
import * as path from "path";
import { MODIFY_TIP, ResDir, ResPathPath } from "./Const";
import { UpperFirst } from "./Utils";

export default class BuildResPath {
    constructor() {
        let content = this.buildOther(ResDir, "res/");
        content = `${ MODIFY_TIP }export const enum ResPath{${ content }}`;
        // console.log(content);
        writeFileSync(ResPathPath, content);
    }

    private buildOther(dirPath: string, dirName: string, baseContent?: string) {
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
        files.forEach(fileName => {
            let tempName = fileName.split(".")[ 0 ];
            let temp: string = "";
            if (isUI && !fileName.endsWith(".zip")) return;
            if (isUI) fileName = tempName;
            if (isUI || isFont) temp = `\t${ tempName } = "${ tempName }",\n`;
            temp += `\t${ UpperFirst(dirName.replace("res/", ""), [ "/" ]) + tempName } = "${ dirName + fileName }",\n`;
            content += temp;
        });
        dirs.forEach(fileName => {
            const filePath = path.resolve(dirPath, fileName);
            let subDir = dirName + fileName + "/";
            content = this.buildOther(filePath, subDir, content + `\n\t// ${ subDir }\n`);
        });
        // allFiles.forEach(fileName => {
        //     const filePath = path.resolve(dirPath, fileName);
        //     const info = statSync(filePath);
        //     if (info.isDirectory()) {
        //         let subDir = dirName + fileName + "/";
        //         content = this.buildOther(filePath, subDir, content + `\n\t//${subDir}\n`);
        //     } else {
        //         let tempName = fileName.split(".")[0];
        //         let temp: string = "";
        //         if (isUI) {
        //             if (fileName.endsWith(".zip")) fileName = tempName;
        //             else return;
        //         }
        //         temp = `\t${UpperFirst(dirName.replace("res/", ""), ["/"]) + tempName} = "${dirName + fileName}",\n`;
        //         content += temp;
        //     }
        // });
        return content;
    }
}