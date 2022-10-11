import * as colors from "colors";
import * as readline from "readline";
import BuildNet from "./BuildNet";
import BuildResPath from "./BuildResPath";
import ExportTable from "./BuildTable";
import BuildUserDataEvent from "./BuildUserDataEvent";
import BuildView from "./BuildView";

export default class BatMain {
    constructor() {
        const act = [
            { desc: "创建UI", cls: BuildView },
            { desc: "导出表配置", cls: ExportTable },
            { desc: "更新资源路径", cls: BuildResPath },
            { desc: "更新网络相关", cls: BuildNet },
            { desc: "用户数据事件", cls: BuildUserDataEvent },
        ];
        let tip = "选择要进行的操作：\n";
        act.forEach((v, index) => tip += `${ index }. ${ v.desc }\n`);
        let rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(tip, function (prompt) {
            const index = +prompt;
            if (Number.isNaN(index) == false && act[ index ]) {
                console.log(colors.yellow("执行中..."));
                new (act[ index ].cls)();
                console.log(colors.green("执行完毕！！！"));
            } else {
                console.log(colors.red("错误的选项！"));
            }
            rl.close();
            process.exit();
        });


        //动态require js
        // const util = require("../js/Utils").GetTemplateContent("View");

        //文件名或者目录名
        //path.basename
        //文件或目录所在目录
        //path.dirname
        //文件后缀，目录为空
        //path.extname
    }
}
new BatMain();