"use strict";
exports.__esModule = true;
var colors = require("colors");
var readline = require("readline");
var BuildNet_1 = require("./BuildNet");
var BuildResPath_1 = require("./BuildResPath");
var BuildTable_1 = require("./BuildTable");
var BuildUserDataEvent_1 = require("./BuildUserDataEvent");
var BuildView_1 = require("./BuildView");
var BatMain = /** @class */ (function () {
    function BatMain() {
        var act = [
            { desc: "创建UI", cls: BuildView_1["default"] },
            { desc: "导出表配置", cls: BuildTable_1["default"] },
            { desc: "更新资源路径", cls: BuildResPath_1["default"] },
            { desc: "更新网络相关", cls: BuildNet_1["default"] },
            { desc: "用户数据事件", cls: BuildUserDataEvent_1["default"] },
        ];
        var tip = "选择要进行的操作：\n0. 全部执行\n";
        act.forEach(function (v, index) { return tip += "".concat(index + 1, ". ").concat(v.desc, "\n"); });
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        var question = function () {
            rl.question(tip, function (prompt) {
                var index = +prompt;
                if (Number.isNaN(index) == false && (index && act[index - 1] || !index)) {
                    index -= 1;
                    var acts = [];
                    if (index == -1)
                        acts.push.apply(acts, act);
                    else
                        acts.push(act[index]);
                    acts.length && acts.forEach(function (v) {
                        console.log(colors.yellow("正在执行 => " + v.desc));
                        new v.cls();
                        console.log(colors.green(v.desc + " => 执行完毕！"));
                    });
                }
                else {
                    console.log(colors.red("错误的选项！"));
                }
                rl.close();
                process.exit();
                // question();
            });
        };
        question();
        //动态require js
        // const util = require("../js/Utils").GetTemplateContent("View");
        //文件名或者目录名
        //path.basename
        //文件或目录所在目录
        //path.dirname
        //文件后缀，目录为空
        //path.extname
    }
    return BatMain;
}());
exports["default"] = BatMain;
new BatMain();
