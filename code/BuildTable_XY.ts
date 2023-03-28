import * as fs from "fs";
import * as xlsx from "node-xlsx";
import * as path from "path";
import { BuildBase } from "./BuildBase";
import { Logger } from "./Console";
import { LangPath, MODIFY_TIP, TableDataPath, TablesCfgDir, TableStructTypePath, xlsxDir } from "./Const";
import { GetTemplateContent, RemoveDir } from "./Utils";

const enum TableExportType {
    /** 整数型字段 */
    Export_Int = "Int",
    /** 字符型字段 */
    Export_String = "String",
    /** 布尔值字段 */
    Export_Bool = "Bool",
    /** 时间型字段 */
    Export_Date = "Date",
    /** 整数数组型字段 */
    Export_IntArray = "IntArray",
    /** 整数矩阵型字段 */
    Export_IntMatrix = "IntMatrix",
    /** 字符数组型字段 */
    Export_StringArray = "StringArray",
    /** 字符矩阵型字段 */
    Export_StringMatrix = "StringMatrix",
    /** 对象型字段 */
    Export_Object = "Object",
    /** 对象数组型字段 */
    Export_ObjectArray = "ObjectArray",
    /** 对象矩阵型字段 */
    Export_ObjectMatrix = "ObjectMatrix",
    /** 类型型字段 */
    Export_Type = "Type",
    /** 语言包编号 */
    Export_Lang = "Lang",
    /** 导出跳过字段 */
    Export_Skip = "Skip",
}

export default class BuildTable_XY extends BuildBase {
    configTemplate = GetTemplateContent("TableConfig");
    tableMgrTemplate = GetTemplateContent("TableMgr");

    translator: { [ key in TableExportType ]: Function } = {
        Int: (str: string) => {
            if (isNaN(+str)) Logger.error("非法数字: " + str);
            return +str || 0;
        },
        String: (str: string) => {
            return str || "";
        },
        Bool: (str: string) => {
            return str == "true";
        },
        Date: (str: string) => {
            const reg = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
            if (reg.test(str) == false) Logger.error("非法时间格式: " + str);
            return str;
        },
        IntArray: (str: string) => {
            if (!str) return [];
            const reg = /^(\d+)(,(\d+))*$/;
            if (reg.test(str) == false) Logger.error("非法数组格式: " + str);
            return str.split(",").map(v => +v);
        },
        IntMatrix: (str: string) => {
            if (!str) return [];
            const reg = /^(\d+)(,(\d+))*;(\d+)(,(\d+))*$/;
            if (reg.test(str) == false) Logger.error("非法数组矩阵格式: " + str);
            return str.split(";").map(v => v.split(",").map(v => +v));
        },
        StringArray: (str: string) => {
            if (!str) return [];
            const reg = /^(\w+)(,(\w+))*$/;
            if (reg.test(str) == false) Logger.error("非法字符数组格式: " + str);
            return str.split(",");
        },
        StringMatrix: (str: string) => {
            if (!str) return [];
            const reg = /^(\w+)(,(\w+))*;(\w+)(,(\w+))*$/;
            if (reg.test(str) == false) Logger.error("非法字符数组矩阵格式: " + str);
            return str.split(";").map(v => v.split(","));
        },
        Object: (str: string, type: string) => {
            if (!str) return {};
            const reg = /^(\w+)(,(\w+))*$/;
            if (reg.test(str) == false) Logger.error("非法对象格式: " + str);
            const obj = {};
            const values = str.split(",");
            type.substring(1, str.length - 1).split(",").forEach((v, index) => {
                const [ key, vType ] = v.split(":");
                obj[ key ] = this.translator[ this.GetExportType(vType) ](values[ index ], vType);
            });
        },
        ObjectArray: (str: string, type: string) => {
            if (!str) return [];

            // const reg = /^([\u4e00-\u9fa5\w]+)(,([\u4e00-\u9fa5\w]+))*;([\u4e00-\u9fa5\w]+)(,([\u4e00-\u9fa5\w]+))*$/;
            // if (reg.test(str) == false) Logger.error("非法对象数组格式: " + str);

            const values = str.split(";");
            const realType = type.replace("array", "");
            return values.map(v => this.translator[ TableExportType.Export_Object ](v, realType));
        },
        ObjectMatrix: (str: string, type: string) => {
            if (!str) return [];
            // const reg = /^(\w+)(,(\w+))*;(\w+)(,(\w+))*;(\w+)(,(\w+))*$/;
            // if (reg.test(str) == false) Logger.error("非法对象矩阵格式: " + str);
            const values = str.split("|");
            const realType = type.replace("matrix", "");
            return values.map(v => this.translator[ TableExportType.Export_ObjectArray ](v, realType));
        },
        Type: (str: string) => { return str; },
        Lang: (str: string) => void 0,
        Skip: (str: string) => void 0,
    };
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

    GetTSType(type: string, typeDesc?: string) {
        switch (type) {
            case "int": return "number";
            case "string": return "string";
            case "bool": return "boolean";
            case "date": return "Date";
            case "intarray": return "number[]";
            case "intmatrix": return "number[][]";
            case "stringarray": return "string[]";
            case "stringmatrix": return "string[][]";
            default:
                if (type.startsWith("[") && type.endsWith("]")) return "$TYPE$";
                else if (type.startsWith("array[") && type.endsWith("]")) return "$TYPE$[]";
                else if (type.startsWith("matrix[") && type.endsWith("]")) return "$TYPE$[][]";
                else if (type.startsWith("type")) return this.GetTSType(typeDesc);
                else if (type.startsWith("lang")) return "any";
                else if (type.startsWith("skip")) return "any";
                break;
        }
    }

    GetExportType(str: string): TableExportType {
        switch (str) {
            case "int": return TableExportType.Export_Int;
            case "string": return TableExportType.Export_String;
            case "bool": return TableExportType.Export_Bool;
            case "date": return TableExportType.Export_Date;
            case "intarray": return TableExportType.Export_IntArray;
            case "intmatrix": return TableExportType.Export_IntMatrix;
            case "stringarray": return TableExportType.Export_StringArray;
            case "stringmatrix": return TableExportType.Export_StringMatrix;
            default:
                if (str.startsWith("[") && str.endsWith("]")) return TableExportType.Export_Object;
                else if (str.startsWith("array[") && str.endsWith("]")) return TableExportType.Export_ObjectArray;
                else if (str.startsWith("matrix[") && str.endsWith("]")) return TableExportType.Export_ObjectMatrix;
                else if (str.startsWith("type")) return TableExportType.Export_Type;
                else if (str.startsWith("lang")) return TableExportType.Export_Lang;
                else if (str.startsWith("skip")) return TableExportType.Export_Skip;
                break;
        }
    }

    CreateConfig() {
        fs.mkdirSync(TablesCfgDir);
        fs.readdirSync(xlsxDir).forEach(files => {
            if (files.endsWith(".xlsx")) {
                let sheets: { name: string, data: string[][] }[] = xlsx.parse(path.resolve(xlsxDir, files)) as any;
                sheets.forEach(v => {
                    const tableData = v.data;
                    const ignoreLines = 4;
                    if (tableData.length <= ignoreLines) return;
                    const [ tableName, tableDesc ] = v.name.split('|');
                    if (!tableName) return;
                    // if (tableName == "Lang") this.CreateLangCode(tableData);
                    const table = {};
                    this.tableDesc.push(tableDesc);
                    this.config[ tableName ] = table;
                    const [ types, keys, descs, descs2 ] = tableData;
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
                    for (let i = ignoreLines; i < tableData.length; i++) {
                        const item = tableData[ i ];
                        tableIds.push(+item[ 0 ]);
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



