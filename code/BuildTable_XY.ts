import * as fs from "fs";
import * as xlsx from "node-xlsx";
import * as path from "path";
import { BuildBase } from "./BuildBase";
import { MODIFY_TIP, TableDataPath, TablesCfgDir, xlsxDir } from "./Const";
import { GetTemplateContent, RemoveDir } from "./Utils";
class ObjectDeclare {
    name: string;
    keys: string[];
    types: string[];
    descs?: string[];
    constructor(name: string, keys: string[], types: string[], descs?: string[]) {
        this.name = name;
        this.keys = keys;
        this.types = types;
        this.descs = descs;
    }
}

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
    static readonly Sign_Types = "$";
    static readonly Sign_Keys = "!";
    static readonly Sign_Descs = "#";
    static readonly Sign_Ignore = "*";
    static readonly Sign_Skip = "skip";
    keyIndex = 1;
    keyNumMap = {};
    config = { keyMap: {} };
    configTemplate = GetTemplateContent("TableConfig");
    tableMgrTemplate = GetTemplateContent("TableMgr");

    /** 表数据转换器 */
    translator: { [ key in TableExportType ]: (...args) => any } = {
        Bool: (str: string) => {
            return String(str).toLowerCase() == "true";
        },
        Date: (str: string) => {
            return str;
        },
        Int: (str: string) => {
            return +str || 0;
        },
        IntArray: (str: string) => {
            if (str == "" || str == null) return [];
            return String(str).split(",").map(v => this.translator.Int(v));
        },
        IntMatrix: (str: string) => {
            if (str == "" || str == null) return [];
            return String(str).split(";").map(v => this.translator.IntArray(v));
        },
        String: (str: string) => {
            return str == null ? "" : String(str);
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
            type = type.replace(/\"/g, "").substring(1, type.length - 1);
            const obj = {};
            const values = str.split("_");
            type.split("_").forEach((v, index) => {
                const [ key, vType ] = v.split(":");
                obj[ this.GetKeyNum(key) ] = this.translator[ this.GetExportType(vType) ](values[ index ], vType);
            });
            return obj;
        },
        ObjectArray: (str: string, type: string) => {
            str = str == null ? "" : String(str);
            const values = str.split("|");
            const realType = type.replace("array", "");
            return values.map(v => this.translator.Object(v, realType));
        },
        ObjectMatrix: (str: string, type: string) => {
            str = str == null ? "" : String(str);
            const values = str.split("^");
            const realType = type.replace("matrix", "");
            return values.map(v => this.translator.ObjectArray(v, realType));
        },
        Type: (str: string) => { return str; },
        Lang: (str: string) => void 0,
        Skip: (str: string) => void 0,
    };

    doBuild() {
        RemoveDir(TablesCfgDir);
        this.CreateConfig();
        this.CreateTableMgr();
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
                    const [ types, keys, descs, descs2 ] = datas.splice(0, 4);
                    const typeCnt = types.length;
                    const dataCnt = datas.length;
                    let hasData = false;
                    const ids: string[] = [];
                    //第一列是描述符，从第二列开始遍历
                    for (let i = 1; i < typeCnt; i++) {
                        const type = types[ i ];
                        //跳过忽略的列
                        if (type == BuildTable_XY.Sign_Skip) continue;
                        const key = keys[ i ];
                        const desc = descs[ i ];
                        const desc2 = descs2[ i ];
                        for (let j = 0; j < dataCnt; j++) {
                            const row = datas[ j ];
                            //跳过没有id的行
                            if (!row[ 2 ]) continue;
                            //跳过忽略的行
                            if (row[ 0 ] == BuildTable_XY.Sign_Ignore) continue;
                            i == 2 && ids.push(row[ 2 ]);
                            const item = table[ row[ 2 ] ] = table[ row[ 2 ] ] || {};
                            try {
                                const value = translator[ this.GetExportType(type) ](row[ i ], type);
                                item[ this.GetKeyNum(key) ] = value;
                            } catch (error) {
                                throw new Error(sht.name + "===" + i);
                            }
                            hasData = true;
                        }
                    }
                    if (hasData)
                        this.config[ sht.name ] = table;
                    keys.splice(0, 2);
                    types.splice(0, 2);
                    descs.splice(0, 2);
                    this.CreateTableType(ids, keys, types, descs, sht.name);
                });
            }
        });
        fs.writeFileSync(TableDataPath, JSON.stringify(this.config));
    }

    /** 创建表类型接口 */
    CreateTableType(ids: string[], keys: string[], types: string[], descs: string[], tableName: string) {
        const tableTypes = this.GetTableType(keys, types, tableName);
        const baseType = tableTypes[ 0 ];
        baseType.descs = descs;
        tableTypes.splice(1, 0, new ObjectDeclare(`Cfg${ tableName }`, ids, new Array(ids.length).fill(baseType.name)));
        let typeContent = MODIFY_TIP;
        tableTypes.forEach(type => {
            typeContent += `declare interface ${ type.name } {\r`;
            type.keys.forEach((key, index) => {
                if (key == BuildTable_XY.Sign_Skip || type.types[ index ] == BuildTable_XY.Sign_Skip) return;
                if (type.descs) typeContent += `\t/** ${ type.descs[ index ] } */\r`;
                typeContent += `\treadonly ${ key }: ${ type.types[ index ] };\r`;
            });
            typeContent += `}\r\r`;
        });
        fs.writeFileSync(TablesCfgDir + "/Cfg" + tableName + ".d.ts", typeContent);
    }

    /** 获取表所有字段类型集合 */
    GetTableType(keys: string[], types: string[], tableName: string) {
        const dec = new ObjectDeclare(`Cfg${ tableName }Data`, [], []);
        const declares = [ dec ];
        keys.forEach((key, index) => {
            dec.keys.push(key);
            dec.types.push(this.GetTSType(types[ index ], declares, tableName));
        });
        return declares;
    }

    /** 获取字段类型 */
    GetTSType(typeStr: string, declares: ObjectDeclare[], tableName: string): string {
        switch (typeStr) {
            case "int": return "number";
            case "string": return "string";
            case "bool": return "boolean";
            case "date": return "Date";
            case "intarray": return "number[]";
            case "intmatrix": return "number[][]";
            case "stringarray": return "string[]";
            case "stringmatrix": return "string[][]";
            default:
                if (typeStr.startsWith("[") && typeStr.endsWith("]")) {
                    const dec = new ObjectDeclare(`Cfg${ tableName }Data${ declares.length }`, [], []);
                    declares.push(dec);
                    const typeDesc = typeStr.substring(1, typeStr.length - 1);
                    const typeDescs = typeDesc.split("_");
                    typeDescs.forEach(typeDesc => {
                        const [ key, type ] = typeDesc.split(":");
                        dec.keys.push(key);
                        dec.types.push(this.GetTSType(type, declares, tableName));
                    });
                    return dec.name;
                }
                else if (typeStr.startsWith("array[") && typeStr.endsWith("]"))
                    return this.GetTSType(typeStr.substring(5), declares, tableName) + "[]";
                else if (typeStr.startsWith("matrix[") && typeStr.endsWith("]"))
                    return this.GetTSType(typeStr.substring(6), declares, tableName) + "[][]";
                else if (typeStr.startsWith("type")) return "string";//this.GetTSType(typeDesc);
                else if (typeStr.startsWith("lang")) return "any";
                else if (typeStr.startsWith("skip")) return "any";
                else throw new Error("unknown type: " + typeStr + " " + tableName);
        }

    }

    /** 创建表管理类 */
    CreateTableMgr() {
        delete this.config.keyMap;
        let vars = "";
        Object.keys(this.config).forEach((v, index) => {
            const configName = `Cfg${ v }`;
            vars += `\treadonly ${ v }: ${ configName };\n`;
        });
        const mgrTxt = this.tableMgrTemplate
            .replace("#vars#", vars);
        fs.writeFileSync(path.resolve(TablesCfgDir, "TableManager.ts"), mgrTxt);
    }
}


