import * as fs from "fs";
import * as path from "path";
import { BuildBase } from "./BuildBase";
import { NetInterfaceDir, NetResponsePath, ServiceObjPath, ServicesPath, UserDataEventPath, UserDataPath } from "./Const";
import { GetTemplateContent, UpperFirst } from "./Utils";
export default class BuildNet extends BuildBase {
    private _allCtrls: { [ key: string ]: string[] } = {};
    private _serviceObjTemp = GetTemplateContent("ServiceObj");
    private _servicesTemp = GetTemplateContent("Services");
    doBuild() {
        this.getAllController();
        this.buildResponse();
        this.buildServiceObj();
        this.buildServices();
        this.buildUserDataEvent();
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

    private buildResponse() {
        const matches: string[] = [];
        Object.keys(this._allCtrls).forEach(v => matches.push(...this._allCtrls[ v ]));
        let data = "/**The class is automatically generated by BatMain.bat , please do not modify */\nexport const enum NetResponse {\n";
        matches.unshift("syncInfo(data: IUserData): void");
        matches.forEach(match => {
            const name = match.substring(0, match.trim().indexOf("("));
            const type = match.substring(match.indexOf("(") + 1, match.indexOf(")")).replace("Input", "Output").split(":")[ 1 ];
            const temp = UpperFirst(name);
            const param1 = "参数类型：{@link " + type.trim() + "}";
            const param2 = type.includes("Output") ? " & {@link " + type.replace("Output", "Input") + "}" : "";
            data += `\t/** ${ type ? param1 + param2 : "无参" } */\n`;
            data += `\tResponse_${ temp } = "Response_${ temp }",\n\n`;
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
            content += `export const ${ name } = ServiceInst<${ v }>();\n`;
        });
        const data = this._servicesTemp.replace(/#content#/g, content);
        fs.writeFileSync(ServicesPath, data.trim());
    }

    private buildUserDataEvent() {
        if (fs.existsSync(UserDataPath) == false) return console.error("文件不存在=>" + UserDataPath);
        const content = fs.readFileSync(UserDataPath).toString();
        const startIndex = content.indexOf("interface IUserData");
        if (startIndex == -1) return console.error("没有找到IUserData");
        const endIndex = content.indexOf("}", startIndex);
        const data = content.substring(startIndex, endIndex);
        const matches = data.match(/.*;/g).map(match => match.trim().split(":")[ 0 ].replace("?", ""));
        let result = "/**The class is automatically generated by BatMain.bat , please do not modify */\nexport const enum UserDataEvent {\n";
        matches.forEach(v => result += `\t${ UpperFirst(v) }_Changed = "${ UpperFirst(v) }_Changed",\n`);
        result += "}";
        fs.writeFileSync(UserDataEventPath, result);
    }
}