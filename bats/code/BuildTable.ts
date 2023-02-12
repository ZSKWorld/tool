import * as fs from "fs";
import * as xlsx from "node-xlsx";
import * as path from "path";
import { BuildBase } from "./BuildBase";
import { LangPath, MODIFY_TIP, TableDataPath, TablesCfgDir, TableStructTypePath, xlsxDir } from "./Const";
import { GetTemplateContent, RemoveDir } from "./Utils";

export default class ExportTable extends BuildBase {
    configTemplate = GetTemplateContent("TableConfig");
    tableMgrTemplate = GetTemplateContent("TableMgr");
    translater: { [ key: string ]: { tsType: string, execute: Function } } = {
        boolean: {
            tsType: "boolean",
            execute: (value: string) => {
                return value == "true";
            }
        },
        number: {
            tsType: "number",
            execute: (value: any) => {
                if (value == null) return 0;
                return Number(value) || 0;
            }
        },
        string: {
            tsType: "string",
            execute: (value: string) => {
                if (value == null) return "";
                return String(value);
            }
        },
        numberArray: {
            tsType: "number[]",
            execute: (value: string) => {
                if (value == null) return [];
                return String(value)?.split(",").map(v => Number(v)) || [];
            }
        },
        stringArray: {
            tsType: "string[]",
            execute: (value: string) => {
                if (value == null) return [];
                return String(value)?.split(",") || [];
            }
        },
        struct: {
            tsType: "",
            execute: (value: string, type: { [ key: string ]: string }) => {
                if (value == null) return null;
                const result = {};
                const typeKeys = Object.keys(type);
                const valueArr = value.split("-");
                typeKeys.forEach((v, index) => {
                    result[ this.GetKeyNum(v) ] = this.translater[ type[ v ] ].execute(valueArr[ index ]);
                });
                return result;
            }
        },
        structArray: {
            tsType: "",
            execute: (value: string, type: { [ key: string ]: string }) => {
                if (value == null) return null;
                const result = [];
                const valueArr = value.split("|");
                valueArr.forEach(v => result.push(this.translater.struct.execute(v, type)));
                return result;
            }
        }

    };
    keyIndex = 1;
    keyNumMap = {};
    tableDesc: string[] = [];
    config = {
        keyMap: {}
    };

    allSubTypes: { type: { [ key: string ]: string }, name: string }[] = [];

    doBuild() {
        RemoveDir(TablesCfgDir);
        this.CreateConfig();
        this.CreateStructTypesDeclare();
        this.CreateTablMgr();
    }
    GetKeyNum(key: string) {
        let keyNum = this.keyNumMap[ key ];
        if (!keyNum) {
            keyNum = this.keyIndex++;
            this.keyNumMap[ key ] = keyNum;
            this.config.keyMap[ keyNum ] = key;
        }
        return keyNum;
    }

    CreateConfig() {
        fs.mkdirSync(TablesCfgDir);
        fs.readdirSync(xlsxDir).forEach(files => {
            if (files.endsWith(".xlsx")) {
                let tableDatas: any[] = xlsx.parse(path.resolve(xlsxDir, files));
                tableDatas.forEach(v => {
                    const tableData: any[][] = v.data;
                    if (tableData.length <= 3) return;
                    const [ tableDesc, tableName ] = v.name.split('|');
                    if (!tableName) return;
                    if (tableName == "Lang") this.CreateLangCode(tableData);
                    const table = {};
                    this.tableDesc.push(tableDesc);
                    this.config[ tableName ] = table;
                    const [ descs, keys, types ] = tableData;
                    const comments: string[] = [];
                    for (let i = keys.length - 1; i >= 0; i--) {
                        if (descs[ i ] && descs[ i ].startsWith("//")) {
                            descs[ i ] = descs[ i ].replace("//", "");
                            tableData.forEach((v, index) => index >= 3 && comments.push(v[ i ]));
                        }
                        if (keys[ i ].startsWith("#"))
                            tableData.forEach(v => v.splice(i, 1));
                    }
                    const tableIds: number[] = [];
                    const { structTypes, structNames } = this.GetStructTypes(types, keys);
                    this.AddStructTypes(structTypes, structNames);
                    for (let i = 3; i < tableData.length; i++) {
                        const item = tableData[ i ];
                        tableIds.push(item[ 0 ]);
                        let itemData = table[ item[ 0 ] ] = {};
                        for (let j = 0; j < keys.length; j++) {
                            let keyNum = this.GetKeyNum(keys[ j ]);
                            itemData[ keyNum ] = this.translater[ types[ j ] ].execute(item[ j ], structTypes[ j ]);
                        }
                    }
                    this.CreateTableConfig(tableName, descs, keys, types, tableIds, structTypes, structNames, comments);
                });
            }
        });
        fs.writeFileSync(TableDataPath, JSON.stringify(this.config));
    }
    AddStructTypes(structTypes: { [ key: string ]: string }[], structNames: string[]) {
        let { allSubTypes } = this;
        structTypes.forEach((v, index) => {
            if (v != null) {
                let mark = this.CheckStructTypes(v.toString(), structNames[ index ]);
                if (mark == -1) return;
                if (mark == -2) {
                    allSubTypes.push({ type: v, name: structNames[ index ] });
                } else {
                    structNames[ index ] = allSubTypes[ mark ].name;
                }
            }
        });
    }
    /**
     * -1:有重复的
     * -2:没有重复的
     * i:有重复的，但名字不同
     */
    CheckStructTypes(flag: string, name: string) {
        let { allSubTypes } = this;
        for (let i = allSubTypes.length - 1; i >= 0; i--) {
            const ele = allSubTypes[ i ];
            if (ele.type.toString() == flag) {
                if (ele.name == name) return -1;
                else return i;
            }
        }
        return -2;
    }
    CreateStructTypesDeclare() {
        let { allSubTypes } = this;
        let result = MODIFY_TIP;
        allSubTypes.forEach(v => {
            result += `declare interface ${ v.name } {\n`;
            Object.keys(v.type).forEach(key => {
                result += `\t${ key }: ${ v.type[ key ] };\n`;
            });
            result += "}\n";
        });
        fs.writeFileSync(TableStructTypePath, result.trim());
    }
    CreateTableConfig(
        name: string, descs: string[], keys: string[], types: string[], ids: number[],
        subTypes: { [ key: string ]: string }[], subTypeNames: string[], comments: string[]
    ) {
        // let subTypeContent = "";
        // subTypes.forEach((v, index) => {
        //     if (!v) return;
        //     let subContent = `export interface ${subTypeNames[index]} {\n`;
        //     const subKeys = Object.keys(v);
        //     subKeys.forEach(subV => {
        //         subContent += `\treadonly ${subV}: ${this.translater[v[subV]].tsType};\n`;
        //     });
        //     subTypeContent += subContent + "}\n\n";
        // });

        const configName = "Config" + name;
        const configItemName = configName + "Data";
        let vars = "";
        let datas = "";
        keys.forEach((value, index) => {
            const desc = descs[ index ] ? `/**${ descs[ index ] } */\n\t` : "";
            const tsType = this.translater[ types[ index ] ].tsType || (subTypeNames[ index ] + (types[ index ] == "structArray" ? "[]" : ""));
            vars += `\t${ desc }readonly ${ value }: ${ tsType };\n`
        });
        ids.forEach((v, index) => {
            comments.length && (datas += `\t/**${ comments[ index ] || "" } */\n`);
            datas += `\treadonly ${ v }: ${ configItemName };\n`;
        });

        let configTxt = this.configTemplate.replace(/#itemNames#/g, configItemName)
            .replace(/#configName#/g, configName)
            .replace(/#vars#/g, vars)
            .replace(/#datas#/g, datas)
        // .replace(/#subTypes#/g, subTypeContent);
        fs.writeFileSync(path.resolve(TablesCfgDir, configName + ".d.ts"), configTxt);
    }
    CreateTablMgr() {
        delete this.config.keyMap;
        // let imports = "";
        let vars = "";
        Object.keys(this.config).forEach((v, index) => {
            const configName = `Config${ v }`;
            // imports += `import { ${configName} } from "./${configName}";\n`;
            vars += `\t/**${ this.tableDesc[ index ] }表 */\n\treadonly ${ v }: ${ configName };\n`;
        });
        const mgrTxt = this.tableMgrTemplate
            // .replace("#imports#", imports)
            .replace("#vars#", vars);
        fs.writeFileSync(path.resolve(TablesCfgDir, "TableManager.ts"), mgrTxt);
    }

    GetStructTypes(types: string[], keys: string[]) {
        const structTypes: { [ key: string ]: string }[] = [];
        const structNames: string[] = [];
        types.forEach((v, index) => {
            const struct = v.startsWith("struct");
            const structArray = v.startsWith("structArray");
            if (!struct && !structArray) {
                structTypes.push(null);
                structNames.push(null);
                return;
            }
            let startIndex = 0;
            struct && (types[ index ] = "struct", startIndex = 7);
            structArray && (types[ index ] = "structArray", startIndex = 12);

            const typeArr = v.substring(startIndex, v.length - 1).split("-").map(v1 => v1.split(":"));
            const typesValue = {};
            typeArr.forEach(v2 => {
                this.GetKeyNum(v2[ 0 ]);
                typesValue[ v2[ 0 ] ] = v2[ 1 ];
            });
            typesValue[ "__proto__" ][ "toString" ] = function () {
                return String(Object.keys(this).sort());
            };
            structTypes.push(typesValue);
            structNames.push(keys[ index ] + "Type");
        });
        return { structTypes, structNames };
    }

    CreateLangCode(tableData: any[][]) {
        let content = `${ MODIFY_TIP }export const enum LangCode {\n\tNone = 0,\n`;
        for (let i = 3; i < tableData.length; i++) {
            const item = tableData[ i ];
            content += `\t/**${ item[ 1 ] || "" } */\n\t_${ item[ 0 ] } = ${ item[ 0 ] },\n`;
        }
        content += "}";
        fs.writeFileSync(LangPath, content);
    }
}



