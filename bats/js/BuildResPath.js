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
var fs_1 = require("fs");
var path = require("path");
var BuildBase_1 = require("./BuildBase");
var Const_1 = require("./Const");
var Utils_1 = require("./Utils");
var BuildResPath = /** @class */ (function (_super) {
    __extends(BuildResPath, _super);
    function BuildResPath() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    BuildResPath.prototype.doBuild = function () {
        var content = this.buildResEnum(Const_1.ResDir, "res/");
        content = "".concat(Const_1.MODIFY_TIP, "export namespace ResPath {\n").concat(content, "}");
        (0, fs_1.writeFileSync)(Const_1.ResPathPath, content);
    };
    BuildResPath.prototype.buildResEnum = function (dirPath, dirName, baseContent) {
        var _this = this;
        var content = baseContent || "";
        var isUI = dirName.startsWith("res/ui/");
        var isFont = dirName.startsWith("res/font/");
        var allFiles = (0, fs_1.readdirSync)(dirPath);
        var dirs = [];
        var files = [];
        allFiles.forEach(function (fileName) {
            var filePath = path.resolve(dirPath, fileName);
            var info = (0, fs_1.statSync)(filePath);
            if (info.isDirectory()) {
                dirs.push(fileName);
            }
            else {
                files.push(fileName);
            }
        });
        // files.forEach(fileName => {
        //     let tempName = fileName.split(".")[ 0 ];
        //     let temp: string = "";
        //     if (isUI && fileName.endsWith(".zip") == false) return;
        //     if (isUI) fileName = tempName;
        //     if (isUI || isFont) temp = `\t${ tempName } = "${ tempName }",\n`;
        //     temp += `\t${ UpperFirst(dirName.replace("res/", ""), [ "/" ]) + tempName } = "${ dirName + fileName }",\n`;
        //     content += temp;
        // });
        if (isUI) {
            content += this.buildEnum("UIName", false, dirName, files, ".zip");
            content += "\n" + this.buildEnum("UIPath", true, dirName, files, ".zip");
        }
        else if (isFont) {
            content += this.buildEnum("FontName", false, dirName, files);
            content += "\n" + this.buildEnum("FontPath", true, dirName, files);
        }
        else {
            if (!baseContent)
                content += this.buildEnum("UnclassifiedPath", true, dirName, files);
            else {
                var dirs_1 = dirName.split("/");
                content += this.buildEnum((0, Utils_1.UpperFirst)(dirs_1[dirs_1.length - 2] + "Path"), true, dirName, files);
            }
        }
        dirs.forEach(function (fileName) {
            var filePath = path.resolve(dirPath, fileName);
            var subDir = dirName + fileName + "/";
            content = _this.buildResEnum(filePath, subDir, content + "\n\t// ".concat(subDir, "\n"));
        });
        return content;
    };
    BuildResPath.prototype.buildEnum = function (name, path, dir, files, include) {
        var content = "";
        files.forEach(function (v) {
            if (include && v.endsWith(include) == false)
                return;
            var fileName = v.split(".")[0];
            if (path)
                content += "\n\t\t".concat((0, Utils_1.UpperFirst)(fileName), " = \"").concat(dir + (include ? fileName : v), "\",");
            else
                content += "\n\t\t".concat((0, Utils_1.UpperFirst)(fileName), " = \"").concat(fileName, "\",");
        });
        if (content)
            return "\texport const enum ".concat(name, " {").concat(content, "\n\t}\n");
        else
            return "\texport const enum ".concat(name, " {}\n");
    };
    return BuildResPath;
}(BuildBase_1.BuildBase));
exports["default"] = BuildResPath;
