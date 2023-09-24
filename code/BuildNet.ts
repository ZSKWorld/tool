import * as fs from "fs";
import * as path from "path";
import { BuildBase } from "./BuildBase";
import { NetInterfaceDir, NetResponsePath, ServiceObjPath, ServicesPath } from "./Const";
import { GetTemplateContent, UpperFirst } from "./Utils";
export default class BuildNet extends BuildBase {
    private _allCtrls: { [ key: string ]: string[] } = {};
    private _serviceObjTemp = GetTemplateContent("ServiceObj");
    private _servicesTemp = GetTemplateContent("Services");
    doBuild() {
        this.getAllController();
        this.buildNetMsg();
        this.buildServiceObj();
        this.buildServices();
    }

    private getAllController() {
        if (!fs.existsSync(NetInterfaceDir)) return console.log("目录不存在 " + NetInterfaceDir);
        const netCtrls = fs.readdirSync(NetInterfaceDir).filter(v => v.endsWith(".d.ts"));
        netCtrls.forEach(fileName => {
            const name = fileName.replace(".d.ts", "");
            const filePath = path.resolve(NetInterfaceDir, fileName);
            const fileContent = fs.readFileSync(filePath).toString();
            const matches = fileContent.match(/[\S].*void/g);
            if (matches?.length) {
                this._allCtrls[ name ] = matches;
            }
        });
    }

    private buildNetMsg() {
        const matches: string[] = [];
        Object.keys(this._allCtrls).forEach(v => matches.push(...this._allCtrls[ v ]));
        let data = "/**The class is automatically generated by BatMain.bat , please do not modify */\nexport const enum NetMessage {\n";
        matches.unshift("syncInfo(data: IUserData): void");
        matches.forEach(match => {
            const name = match.substring(0, match.trim().indexOf("("));
            const type = match.substring(match.indexOf("(") + 1, match.indexOf(")")).split(":")[ 1 ].trim();
            const temp = UpperFirst(name);
            const hasInput = type.includes("Input");
            let param1 = "";
            if (type) {
                param1 += "\t/**\n";
                param1 += `\t * @param output {@link ${ type.replace("Input", "Output") }}\n`;
                if (hasInput)
                    param1 += `\t * @param input {@link ${ type }}\n`;
                param1 += "\t */\n";
            }
            data += param1;
            data += `\t${ temp } = "NetMsg_${ temp }",\n\n`;

            if (hasInput) {
                param1 = "";
                if (type) {
                    param1 += "\t/**\n";
                    param1 += `\t * @param output {@link ${ type.replace("Input", "Output") }}\n`;
                    if (hasInput)
                        param1 += `\t * @param input {@link ${ type }}\n`;
                    param1 += "\t */\n";
                }
                data += param1;
                data += `\t${ temp + "Error" } = "NetMsg_${ temp }_Error",\n\n`;
            }
        });
        data = data.trim() + "\n}";
        fs.writeFileSync(NetResponsePath, data);
    }

    private buildServiceObj() {
        let ctrlType = "";
        let content = "";
        Object.keys(this._allCtrls).forEach((v, index) => {
            ctrlType += index ? " & " + v : v;
            this._allCtrls[ v ].forEach(func => {
                content += `\t${ func } { throw new Error("Method not implemented."); }\n`;
            });
        });
        const data = this._serviceObjTemp.replace(/#controller#/g, ctrlType).replace(/#content#/g, content);
        fs.writeFileSync(ServiceObjPath, data.trim());
    }

    private buildServices() {
        let content = "";
        Object.keys(this._allCtrls).forEach(v => {
            const name = v.substring(1) + "Service";
            content += `export const ${ name.replace("Ctrl", "") } = ServiceInst<${ v }>();\n`;
        });
        const data = this._servicesTemp.replace(/#content#/g, content);
        fs.writeFileSync(ServicesPath, data.trim());
    }
}