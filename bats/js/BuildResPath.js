"use strict";
exports.__esModule = true;
var fs_1 = require("fs");
var path = require("path");
var Const_1 = require("./Const");
var Utils_1 = require("./Utils");
var BuildResPath = /** @class */ (function () {
    function BuildResPath() {
        var content = this.buildOther(Const_1.ResDir, "res/");
        content = "".concat(Const_1.MODIFY_TIP, "export const enum ResPath{").concat(content, "}");
        // console.log(content);
        (0, fs_1.writeFileSync)(Const_1.ResPathPath, content);
    }
    BuildResPath.prototype.buildOther = function (dirPath, dirName, baseContent) {
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
        files.forEach(function (fileName) {
            var tempName = fileName.split(".")[0];
            var temp = "";
            if (isUI) {
                if (fileName.endsWith(".zip"))
                    fileName = tempName;
                else
                    return;
            }
            if (isFont)
                fileName = tempName;
            if (isUI || isFont)
                temp = "\t".concat(fileName, " = \"").concat(fileName, "\",\n");
            temp += "\t".concat((0, Utils_1.UpperFirst)(dirName.replace("res/", ""), ["/"]) + tempName, " = \"").concat(dirName + fileName, "\",\n");
            content += temp;
        });
        dirs.forEach(function (fileName) {
            var filePath = path.resolve(dirPath, fileName);
            var subDir = dirName + fileName + "/";
            content = _this.buildOther(filePath, subDir, content + "\n\t// ".concat(subDir, "\n"));
        });
        // allFiles.forEach(fileName => {
        //     const filePath = path.resolve(dirPath, fileName);
        //     const info = statSync(filePath);
        //     if (info.isDirectory()) {
        //         let subDir = dirName + fileName + "/";
        //         content = this.buildOther(filePath, subDir, content + `\n\t//${subDir}\n`);
        //     } else {
        //         let tempName = fileName.split(".")[0];
        //         let temp: string = "";
        //         if (isUI) {
        //             if (fileName.endsWith(".zip")) fileName = tempName;
        //             else return;
        //         }
        //         temp = `\t${UpperFirst(dirName.replace("res/", ""), ["/"]) + tempName} = "${dirName + fileName}",\n`;
        //         content += temp;
        //     }
        // });
        return content;
    };
    return BuildResPath;
}());
exports["default"] = BuildResPath;
