"use strict";
exports.__esModule = true;
exports.UpperFirst = exports.GetTemplateContent = exports.GetAllFile = exports.RemoveDir = exports.MakeDir = void 0;
var fs = require("fs");
var path = require("path");
/**创建目录，递归创建 */
function MakeDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}
exports.MakeDir = MakeDir;
/**删除目录，包括目录中所有文件和子目录 */
function RemoveDir(dir) {
    if (fs.existsSync(dir) == false)
        return;
    var files = fs.readdirSync(dir);
    for (var i = 0; i < files.length; i++) {
        var newPath = path.join(dir, files[i]);
        var stat = fs.statSync(newPath);
        if (stat.isDirectory()) {
            //如果是文件夹就递归下去
            this.RemoveDir(newPath);
        }
        else {
            //删除文件
            fs.unlinkSync(newPath);
        }
    }
    fs.rmdirSync(dir);
}
exports.RemoveDir = RemoveDir;
/**
 * 获取目录中的所有文件
 * @param dirPath 路径
 * @param absolute 是否返回文件绝对路径
 * @param filter 过滤函数
 * @param map 修改函数
 * @returns
 */
function GetAllFile(dirPath, absolute, filter, map) {
    var names = [];
    fs.readdirSync(dirPath).forEach(function (filename) {
        var filePath = path.resolve(dirPath, filename);
        var state = fs.statSync(filePath);
        if (state.isDirectory()) {
            names.push.apply(names, GetAllFile(filePath, absolute, filter, map));
        }
        else if (state.isFile()) {
            if (!filter || filter(filename)) {
                var temp = map ? map(filename) : filename;
                absolute ? names.push(path.resolve(dirPath, temp)) : names.push(temp);
            }
        }
    });
    return names;
}
exports.GetAllFile = GetAllFile;
/**获取模板内容 */
function GetTemplateContent(templateName) {
    return fs.readFileSync(__dirname + "../../template/" + templateName + ".template").toString();
}
exports.GetTemplateContent = GetTemplateContent;
function UpperFirst(str, splits) {
    if (!str)
        return str;
    if (str.length == 1)
        return str.toUpperCase();
    else {
        var temp = str[0].toUpperCase() + str.substring(1);
        if (splits && splits.length) {
            var resultArr_1 = [temp];
            splits.forEach(function (v) {
                var count = resultArr_1.length;
                while (count--) {
                    resultArr_1.push.apply(resultArr_1, resultArr_1.shift().split(v).map(function (v1) { return UpperFirst(v1); }));
                }
            });
            return resultArr_1.join("_");
        }
        else {
            return temp;
        }
    }
}
exports.UpperFirst = UpperFirst;
