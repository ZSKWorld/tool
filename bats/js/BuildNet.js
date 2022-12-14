"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var fs = require("fs");
var path = require("path");
var BuildBase_1 = require("./BuildBase");
var Const_1 = require("./Const");
var Utils_1 = require("./Utils");
var BuildNet = /** @class */ (function (_super) {
    __extends(BuildNet, _super);
    function BuildNet() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this._allCtrls = {};
        _this._serviceObjTemp = (0, Utils_1.GetTemplateContent)("ServiceObj");
        _this._servicesTemp = (0, Utils_1.GetTemplateContent)("Services");
        return _this;
    }
    BuildNet.prototype.doBuild = function () {
        this.getAllController();
        this.buildResponse();
        this.buildServiceObj();
        this.buildServices();
        this.buildUserDataEvent();
    };
    BuildNet.prototype.getAllController = function () {
        var _this = this;
        if (!fs.existsSync(Const_1.NetInterfaceDir))
            return console.log("目录不存在 " + Const_1.NetInterfaceDir);
        var netCtrls = fs.readdirSync(Const_1.NetInterfaceDir).filter(function (v) { return v.endsWith(".d.ts"); });
        netCtrls.forEach(function (fileName) {
            var name = fileName.replace(".d.ts", "");
            var filePath = path.resolve(Const_1.NetInterfaceDir, fileName);
            var fileContent = fs.readFileSync(filePath).toString();
            var matches = fileContent.match(/[\S].*void/g);
            if (matches === null || matches === void 0 ? void 0 : matches.length) {
                _this._allCtrls[name] = matches;
            }
        });
    };
    BuildNet.prototype.buildResponse = function () {
        var _this = this;
        var matches = [];
        Object.keys(this._allCtrls).forEach(function (v) { return matches.push.apply(matches, _this._allCtrls[v]); });
        var data = "/**The class is automatically generated by BatMain.bat , please do not modify */\nexport const enum NetResponse {\n";
        matches.unshift("syncInfo(data: IUserData): void");
        matches.forEach(function (match) {
            var name = match.substring(0, match.trim().indexOf("("));
            var type = match.substring(match.indexOf("(") + 1, match.indexOf(")")).replace("Input", "Output").split(":")[1];
            var temp = (0, Utils_1.UpperFirst)(name);
            var param1 = "参数类型：{@link " + type.trim() + "}";
            var param2 = type.includes("Output") ? " & {@link " + type.replace("Output", "Input") + "}" : "";
            data += "\t/** ".concat(type ? param1 + param2 : "无参", " */\n");
            data += "\tResponse_".concat(temp, " = \"Response_").concat(temp, "\",\n\n");
        });
        data = data.trim() + "\n}";
        fs.writeFileSync(Const_1.NetResponsePath, data);
    };
    BuildNet.prototype.buildServiceObj = function () {
        var _this = this;
        var ctrlType = "";
        var content = "";
        Object.keys(this._allCtrls).forEach(function (v, index) {
            ctrlType += index ? " & " + v : v;
            _this._allCtrls[v].forEach(function (func) {
                content += "\t".concat(func, " { throw new Error(\"Method not implemented.\"); }\n");
            });
        });
        var data = this._serviceObjTemp.replace(/#controller#/g, ctrlType).replace(/#content#/g, content);
        fs.writeFileSync(Const_1.ServiceObjPath, data.trim());
    };
    BuildNet.prototype.buildServices = function () {
        var content = "";
        Object.keys(this._allCtrls).forEach(function (v) {
            var name = v.substring(1) + "Service";
            content += "export const ".concat(name, " = ServiceInst<").concat(v, ">();\n");
        });
        var data = this._servicesTemp.replace(/#content#/g, content);
        fs.writeFileSync(Const_1.ServicesPath, data.trim());
    };
    BuildNet.prototype.buildUserDataEvent = function () {
        if (fs.existsSync(Const_1.UserDataPath) == false)
            return console.error("文件不存在=>" + Const_1.UserDataPath);
        var content = fs.readFileSync(Const_1.UserDataPath).toString();
        var startIndex = content.indexOf("interface IUserData");
        if (startIndex == -1)
            return console.error("没有找到IUserData");
        var endIndex = content.indexOf("}", startIndex);
        var data = content.substring(startIndex, endIndex);
        var matches = data.match(/.*;/g).map(function (match) { return match.trim().split(":")[0].replace("?", ""); });
        var result = "/**The class is automatically generated by BatMain.bat , please do not modify */\nexport const enum UserDataEvent {\n";
        matches.forEach(function (v) { return result += "\t".concat((0, Utils_1.UpperFirst)(v), "_Changed = \"").concat((0, Utils_1.UpperFirst)(v), "_Changed\",\n"); });
        result += "}";
        fs.writeFileSync(Const_1.UserDataEventPath, result);
    };
    return BuildNet;
}(BuildBase_1.BuildBase));
exports["default"] = BuildNet;
