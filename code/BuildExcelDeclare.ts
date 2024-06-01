import * as fs from "fs";
import * as xlsx from "node-xlsx";
import * as path from "path";
import { BuildBase } from "./BuildBase";

// const xlsxDir = "../../../paihun-excel/data";
// const modify_tip = "---This script is generated automatically, Please do not any modify!"
// const outputPath = "../../../paihun_unity_project/Assets/Lua/LuaScript/GameUtility/ExcelEnum.lua";

const xlsxDir = "C:\\Users\\Administrator\\Desktop\\Assets\\excel";
const modify_tip = "---This script is generated automatically, Please do not any modify!"
const outputPath = "C:\\Users\\Administrator\\Desktop\\Assets\\Lua\\LuaScript\\Net\\ExcelDeclare.lua";

const enum ExportType {
    Group = "group",
    Unique = "unique",
    NoKey = "nokey",
}

export default class BuildExcelDeclare extends BuildBase{
    private typeMap = {
        "float": "number",
        "int32": "number",
        "uint32": "number",
        "string": "string",
    };

    doBuild(): void {
        this.createTableEnum();
    }

    private createTableEnum() {
        let declareContent = "";
        const tableNameMap = {}, tableSheetNameInfo = {}, sheetNameRepeatInfo = {};
        fs.readdirSync(xlsxDir).forEach(file => {
            if (file.endsWith(".xlsx")) {
                const fileName = file.replace(".xlsx", "");
                const tableName = this.upperFirst(fileName, ["_"], "");
                tableNameMap[tableName] = fileName;
                const sheetNameMap = tableSheetNameInfo[fileName] = tableSheetNameInfo[fileName] || {};
                const sheets: { name: string, data: string[][] }[] = xlsx.parse(path.resolve(xlsxDir, file)).filter(v => !this.hasChinese(v.name)) as any;
                const exportSheet = sheets.shift();
                //导出类型映射
                const exportTypeMap: { [tableName: string]: { exportKey: string, exportType: ExportType, exportComment: string } } = {};
                exportSheet.data.forEach((v, i) => {
                    if (i <= 0) return;
                    exportTypeMap[v[0]] = { exportKey: v[1], exportType: v[2] as ExportType, exportComment: v[3] ? v[3].replace(new RegExp("\n", "g"), "。") : "" };
                });
                sheets.forEach(sheet => {
                    const sheetName = this.upperFirst(sheet.name, ["_"], "");
                    sheetNameMap[sheetName] = { name: sheet.name, type: `Table_${ tableName }_${ sheetName }`, repeat: sheetNameRepeatInfo[sheetName] };
                    sheetNameRepeatInfo[sheetName] = true;

                    const fieldIndex = sheet.data.findIndex(sdv => sdv[0] == "##");
                    const commentIndex = sheet.data.findIndex(sdv => sdv[0] == "#comment");
                    const typeIndex = sheet.data.findIndex(sdv => sdv[0] == "#type");
                    const modeIndex = sheet.data.findIndex(sdv => sdv[0] == "#mode");

                    const fields = sheet.data[fieldIndex];
                    const types = sheet.data[typeIndex];
                    const comments = commentIndex >= 0 ? sheet.data[commentIndex] : null;
                    fields.shift();
                    types.shift();
                    comments && comments.shift();

                    //表导出类型 group， unique
                    const tableExportType = exportTypeMap[sheet.name].exportType;
                    const tableComment = exportTypeMap[sheet.name].exportComment;
                    if (tableExportType == ExportType.Unique) {
                        declareContent += `---unique table\n---@class Table_${ tableName }_${ sheetName }${ tableComment ? " " + tableComment : "" }\n`;
                        declareContent += this.getSheetFieldsContent(fields, types, comments);
                        declareContent += "\n";
                    } else if (tableExportType == ExportType.Group || tableExportType == ExportType.NoKey) {
                        const sheetDataTypeName = `Sheet_${ tableName }_${ sheetName }`;
                        declareContent += `---group sheet\n---@class ${ sheetDataTypeName }${ tableComment ? " " + tableComment : "" }\n`;
                        declareContent += this.getSheetFieldsContent(fields, types, comments);
                        declareContent += `\n---group table\n---@alias Table_${ tableName }_${ sheetName } ${ sheetDataTypeName }[]\n\n`;
                    } else {
                        console.log("未知的表导出类型", tableExportType, fileName);
                    }
                });
            }
        });
        let enumContent = `${ modify_tip }\n\n---表名枚举\n---@enum ExcelName\nExcelName = {\n`;
        Object.keys(tableNameMap).forEach(v => {
            enumContent += `\t${ v } = "${ tableNameMap[v] }",\n`
        });
        enumContent += "}\n\n---表sheet名枚举\n---@enum SheetName\nSheetName = {\n";
        Object.keys(tableSheetNameInfo).forEach(tv => {
            enumContent += `\t---${ tv }表\n\n`;
            const tvData = tableSheetNameInfo[tv];
            Object.keys(tvData).forEach(v => {
                enumContent += `\t---@see ${ tvData[v].type }\n`;
                enumContent += tvData[v].repeat ? "\t---" : "\t";
                enumContent += `${ v } = "${ tvData[v].name }",${ tvData[v].repeat ? "\t重复\n" : "" }\n`
            });
            enumContent += "\n";
        });
        enumContent = enumContent.trim() + "\n}";
        const content = enumContent + "\n\n" + declareContent;
        fs.writeFileSync(outputPath, content.trim());
    }
    private hasChinese(str: string) {
        const reg = /[\u4e00-\u9fa5|\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]/;
        return reg.test(str);
    }

    private upperFirst(str: string, splits?: string[], joinStr = "_") {
        if (!str) return str;
        if (str.length == 1) return str.toUpperCase();
        else {
            let temp = str[0].toUpperCase() + str.substring(1);
            if (splits && splits.length) {
                let resultArr = [temp];
                splits.forEach(v => {
                    let count = resultArr.length;
                    while (count--) {
                        const resultEle = resultArr.shift();
                        resultEle && resultArr.push(...resultEle.split(v).map(v1 => this.upperFirst(v1)));
                    }
                });
                return resultArr.join(joinStr);
            } else {
                return temp;
            }
        }
    }

    private getSheetFieldsContent(fields: string[], types: string[], comments: string[]) {
        const result: { [fieldName: string]: { type: string, comments: string[] } } = {};
        fields.forEach((v, i) => {
            const realFieldName = v.replace(/\[\d+\]/g, "");
            result[realFieldName] ||= { type: "", comments: [] };
            result[realFieldName].type ||= this.typeMap[types[i]] ? this.typeMap[types[i]] + (v == realFieldName ? "" : "[]") : "";
            comments && comments[i] && result[realFieldName].comments.push(comments[i]);
        });
        let content = "";
        Object.keys(result).forEach(v => {
            if (!result[v].type) {
                result[v].type = "any";
                result[v].comments.push("unknown field type");
            }
            content += `---@field public ${ v } ${ result[v].type }${ result[v].comments.length ? " " + result[v].comments.join(", ") : "" }\n`;
        });
        return content;
    }
}

new BuildExcelDeclare();