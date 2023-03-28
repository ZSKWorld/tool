import * as fs from "fs";
import * as xlsx from "node-xlsx";
import * as path from "path";
import { BuildBase } from "./BuildBase";
import { Logger } from "./Console";
import { TableDataPath, TablesCfgDir, xlsxDir } from "./Const";
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
            return +str || 0;
        },
        String: (str: string) => {
            return str == null ? "" : String(str);
        },
        Bool: (str: string) => {
            return String(str).toLowerCase() == "true";
        },
        Date: (str: string) => {
            return str;
        },
        IntArray: (str: string) => {
            if (str == "" || str == null) return [];
            return String(str).split(",").map(v => this.translator.Int(v));
        },
        IntMatrix: (str: string) => {
            if (str == "" || str == null) return [];
            return String(str).split(";").map(v => this.translator.IntArray(v));
        },
        StringArray: (str: string) => {
            str = str == null ? "" : String(str);
            return str.split(",").map(v => this.translator.String(v));
        },
        StringMatrix: (str: string) => {
            str = str == null ? "" : String(str);
            return str.split(";").map(v => this.translator.StringArray(v));
        },
        Object: (str: string, type: string) => {
            str = str == null ? "" : String(str);
            type = type.replace(/\"/g, "");
            const obj = {};
            const values = str.split(",");
            type.substring(1, type.length - 1).split(",").forEach((v, index) => {
                const [ key, vType ] = v.split(":");
                obj[ this.GetKeyNum(key) ] = this.translator[ this.GetExportType(vType) ](values[ index ], vType);
            });
            return obj;
        },
        ObjectArray: (str: string, type: string) => {
            str = str == null ? "" : String(str);
            const values = str.split(";");
            const realType = type.replace("array", "");
            return values.map(v => this.translator.Object(v, realType));
        },
        ObjectMatrix: (str: string, type: string) => {
            str = str == null ? "" : String(str);
            const values = str.split("|");
            const realType = type.replace("matrix", "");
            return values.map(v => this.translator.ObjectArray(v, realType));
        },
        Type: (str: string) => { return str; },
        Lang: (str: string) => void 0,
        Skip: (str: string) => void 0,
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
    }

    GetKeyNum(key: string) {
        let keyNum = this.keyNumMap[ key ];
        if (!keyNum) {
            keyNum = this.keyIndex++;
            this.keyNumMap[ key ] = keyNum;
            this.keyNumMap[ keyNum ] = key;
            this.config.keyMap[ keyNum ] = key;
        }
        return keyNum;
    }

    GetTSType(type: string) {
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
                else if (type.startsWith("type")) return "string";//this.GetTSType(typeDesc);
                else if (type.startsWith("lang")) return "any";
                else if (type.startsWith("skip")) return "any";
                else throw new Error("unknown type: " + type);
        }
    }

    GetExportType(str: string) {
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
                else throw new Error("unknown type: " + str);
        }
    }

    CreateConfig() {
        const Sign_Types = "$";
        const Sign_Keys = "!";
        const Sign_Descs = "#";
        const Sign_Ignore = "*";
        const Sign_Skip = "skip";
        const translator = this.translator;
        fs.mkdirSync(TablesCfgDir);
        fs.readdirSync(xlsxDir).forEach(files => {
            if (files.endsWith(".xlsm")) {
                let sheets: { name: string, data: string[][] }[] = xlsx.parse(path.resolve(xlsxDir, files)) as any;
                //第一个sheet是使用说明,不要
                sheets.shift();
                sheets.forEach(sht => {
                    const table = {};
                    const datas = sht.data;
                    const types = datas.shift();
                    const keys = datas.shift();
                    const descs = datas.shift();
                    const descs2 = datas.shift();
                    const typeCnt = types.length;
                    const dataCnt = datas.length;
                    let hasData = false;
                    for (let i = 1; i < typeCnt; i++) {
                        const type = types[ i ];
                        if (type == Sign_Skip) continue;
                        const key = keys[ i ];
                        const desc = descs[ i ];
                        const desc2 = descs2[ i ];
                        for (let j = 0; j < dataCnt; j++) {
                            const row = datas[ j ];
                            if (!row[ 2 ]) continue;
                            if (row[ 0 ] == Sign_Ignore) continue;
                            const item = table[ row[ 2 ] ] = table[ row[ 2 ] ] || {};
                            const value = translator[ this.GetExportType(type) ](row[ i ], type);
                            item[ this.GetKeyNum(key) ] = value;
                            hasData = true;
                        }
                    }
                    if(hasData)
                        this.config[ sht.name ] = table;
                });
            }
        });
        fs.writeFileSync(TableDataPath, JSON.stringify(this.config));
    }
}



