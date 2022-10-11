"use strict";
exports.__esModule = true;
var fs = require("fs");
var xlsx = require("node-xlsx");
var path = require("path");
var PathConst_1 = require("./PathConst");
var Utils_1 = require("./Utils");
var ExportTable = /** @class */ (function () {
    function ExportTable() {
        var _this = this;
        this.configTemplate = (0, Utils_1.GetTemplateContent)("ExportTableConfig");
        this.tableMgrTemplate = (0, Utils_1.GetTemplateContent)("ExportTableMgr");
        this.translater = {
            boolean: {
                tsType: "boolean",
                execute: function (value) {
                    return value == "true";
                }
            },
            number: {
                tsType: "number",
                execute: function (value) {
                    if (value == null)
                        return 0;
                    return Number(value) || 0;
                }
            },
            string: {
                tsType: "string",
                execute: function (value) {
                    if (value == null)
                        return "";
                    return String(value);
                }
            },
            numberArray: {
                tsType: "number[]",
                execute: function (value) {
                    var _a;
                    if (value == null)
                        return [];
                    return ((_a = String(value)) === null || _a === void 0 ? void 0 : _a.split(",").map(function (v) { return Number(v); })) || [];
                }
            },
            stringArray: {
                tsType: "string[]",
                execute: function (value) {
                    var _a;
                    if (value == null)
                        return [];
                    return ((_a = String(value)) === null || _a === void 0 ? void 0 : _a.split(",")) || [];
                }
            },
            struct: {
                tsType: "",
                execute: function (value, type) {
                    if (value == null)
                        return null;
                    var result = {};
                    var typeKeys = Object.keys(type);
                    var valueArr = value.split("-");
                    typeKeys.forEach(function (v, index) {
                        result[_this.GetKeyNum(v)] = _this.translater[type[v]].execute(valueArr[index]);
                    });
                    return result;
                }
            },
            structArray: {
                tsType: "",
                execute: function (value, type) {
                    if (value == null)
                        return null;
                    var result = [];
                    var valueArr = value.split("|");
                    valueArr.forEach(function (v) { return result.push(_this.translater.struct.execute(v, type)); });
                    return result;
                }
            }
        };
        this.keyIndex = 1;
        this.keyNumMap = {};
        this.tableDesc = [];
        this.config = {
            keyMap: {}
        };
        this.allSubTypes = [];
        (0, Utils_1.RemoveDir)(PathConst_1.TablesCfgDir);
        this.CreateConfig();
        this.CreateStructTypesDeclare();
        this.CreateTablMgr();
    }
    ExportTable.prototype.GetKeyNum = function (key) {
        var keyNum = this.keyNumMap[key];
        if (!keyNum) {
            keyNum = this.keyIndex++;
            this.keyNumMap[key] = keyNum;
            this.config.keyMap[keyNum] = key;
        }
        return keyNum;
    };
    ExportTable.prototype.CreateConfig = function () {
        var _this = this;
        fs.mkdirSync(PathConst_1.TablesCfgDir);
        fs.readdirSync(PathConst_1.xlsxDir).forEach(function (files) {
            if (files.endsWith(".xlsx")) {
                var tableDatas = xlsx.parse(path.resolve(PathConst_1.xlsxDir, files));
                tableDatas.forEach(function (v) {
                    var tableData = v.data;
                    if (tableData.length <= 3)
                        return;
                    var _a = v.name.split('|'), tableDesc = _a[0], tableName = _a[1];
                    if (!tableName)
                        return;
                    if (tableName == "Lang")
                        _this.CreateLangCode(tableData);
                    var table = {};
                    _this.tableDesc.push(tableDesc);
                    _this.config[tableName] = table;
                    var descs = tableData[0];
                    var keys = tableData[1];
                    var types = tableData[2];
                    var comments = [];
                    var _loop_1 = function (i) {
                        if (descs[i] && descs[i].startsWith("//")) {
                            descs[i] = descs[i].replace("//", "");
                            tableData.forEach(function (v, index) { return index >= 3 && comments.push(v[i]); });
                        }
                        if (keys[i].startsWith("#"))
                            tableData.forEach(function (v) { return v.splice(i, 1); });
                    };
                    for (var i = keys.length - 1; i >= 0; i--) {
                        _loop_1(i);
                    }
                    var tableIds = [];
                    var _b = _this.GetStructTypes(types, keys), structTypes = _b.structTypes, structNames = _b.structNames;
                    _this.AddStructTypes(structTypes, structNames);
                    for (var i = 3; i < tableData.length; i++) {
                        var item = tableData[i];
                        tableIds.push(item[0]);
                        var itemData = table[item[0]] = {};
                        for (var j = 0; j < keys.length; j++) {
                            var keyNum = _this.GetKeyNum(keys[j]);
                            itemData[keyNum] = _this.translater[types[j]].execute(item[j], structTypes[j]);
                        }
                    }
                    _this.CreateTableConfig(tableName, descs, keys, types, tableIds, structTypes, structNames, comments);
                });
            }
        });
        fs.writeFileSync(PathConst_1.TableDataPath, JSON.stringify(this.config));
    };
    ExportTable.prototype.AddStructTypes = function (structTypes, structNames) {
        var _this = this;
        var allSubTypes = this.allSubTypes;
        structTypes.forEach(function (v, index) {
            if (v != null) {
                var mark = _this.CheckStructTypes(v.toString(), structNames[index]);
                if (mark == -1)
                    return;
                if (mark == -2) {
                    allSubTypes.push({ type: v, name: structNames[index] });
                }
                else {
                    structNames[index] = allSubTypes[mark].name;
                }
            }
        });
    };
    ExportTable.prototype.CheckStructTypes = function (flag, name) {
        var allSubTypes = this.allSubTypes;
        for (var i = allSubTypes.length - 1; i >= 0; i--) {
            var ele = allSubTypes[i];
            if (ele.type.toString() == flag) {
                if (ele.name == name)
                    return -1;
                else
                    return i;
            }
        }
        return -2;
    };
    ExportTable.prototype.CreateStructTypesDeclare = function () {
        var allSubTypes = this.allSubTypes;
        var result = "/**This is automatically generated by BatMain.bat , please do not modify */\n";
        allSubTypes.forEach(function (v) {
            result += "declare interface ".concat(v.name, " {\n");
            Object.keys(v.type).forEach(function (key) {
                result += "\t".concat(key, ": ").concat(v.type[key], ";\n");
            });
            result += "}\n";
        });
        fs.writeFileSync(PathConst_1.TableStructTypePath, result.trim());
    };
    ExportTable.prototype.CreateTableConfig = function (name, descs, keys, types, ids, subTypes, subTypeNames, comments) {
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
        var _this = this;
        var configName = "Config" + name;
        var configItemName = configName + "Data";
        var vars = "";
        var datas = "";
        keys.forEach(function (value, index) {
            var desc = descs[index] ? "/**".concat(descs[index], " */\n\t") : "";
            var tsType = _this.translater[types[index]].tsType || (subTypeNames[index] + (types[index] == "structArray" ? "[]" : ""));
            vars += "\t".concat(desc, "readonly ").concat(value, ": ").concat(tsType, ";\n");
        });
        ids.forEach(function (v, index) {
            comments.length && (datas += "\t/**".concat(comments[index] || "", " */\n"));
            datas += "\treadonly ".concat(v, ": ").concat(configItemName, ";\n");
        });
        var configTxt = this.configTemplate.replace(/#itemNames#/g, configItemName)
            .replace(/#configName#/g, configName)
            .replace(/#vars#/g, vars)
            .replace(/#datas#/g, datas);
        // .replace(/#subTypes#/g, subTypeContent);
        fs.writeFileSync(path.resolve(PathConst_1.TablesCfgDir, configName + ".d.ts"), configTxt);
    };
    ExportTable.prototype.CreateTablMgr = function () {
        var _this = this;
        delete this.config.keyMap;
        // let imports = "";
        var vars = "";
        Object.keys(this.config).forEach(function (v, index) {
            var configName = "Config".concat(v);
            // imports += `import { ${configName} } from "./${configName}";\n`;
            vars += "\t/**".concat(_this.tableDesc[index], "\u8868 */\n\treadonly ").concat(v, ": ").concat(configName, ";\n");
        });
        var mgrTxt = this.tableMgrTemplate
            // .replace("#imports#", imports)
            .replace("#vars#", vars);
        fs.writeFileSync(path.resolve(PathConst_1.TablesCfgDir, "TableManager.ts"), mgrTxt);
    };
    ExportTable.prototype.GetStructTypes = function (types, keys) {
        var _this = this;
        var structTypes = [];
        var structNames = [];
        types.forEach(function (v, index) {
            var struct = v.startsWith("struct");
            var structArray = v.startsWith("structArray");
            if (!struct && !structArray) {
                structTypes.push(null);
                structNames.push(null);
                return;
            }
            var startIndex = 0;
            struct && (types[index] = "struct", startIndex = 7);
            structArray && (types[index] = "structArray", startIndex = 12);
            var typeArr = v.substring(startIndex, v.length - 1).split("-").map(function (v1) { return v1.split(":"); });
            var typesValue = {};
            typeArr.forEach(function (v2) {
                _this.GetKeyNum(v2[0]);
                typesValue[v2[0]] = v2[1];
            });
            typesValue["__proto__"]["toString"] = function () {
                return String(Object.keys(this).sort());
            };
            structTypes.push(typesValue);
            structNames.push(keys[index] + "Type");
        });
        return { structTypes: structTypes, structNames: structNames };
    };
    ExportTable.prototype.CreateLangCode = function (tableData) {
        var content = "/**This is automatically generated by BatMain.bat , please do not modify */\n";
        content += "export const enum LangCode {\n";
        content += "\tNone = 0,\n";
        for (var i = 3; i < tableData.length; i++) {
            var item = tableData[i];
            content += "\t/**".concat(item[1] || "", " */\n\t_").concat(item[0], " = ").concat(item[0], ",\n");
        }
        content += "}";
        fs.writeFileSync(PathConst_1.LangPath, content);
    };
    return ExportTable;
}());
exports["default"] = ExportTable;
