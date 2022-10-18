import * as colors from "colors";
import * as readline from "readline";
import BuildNet from "./BuildNet";
import BuildResPath from "./BuildResPath";
import ExportTable from "./BuildTable";
import BuildUserDataEvent from "./BuildUserDataEvent";
import BuildView from "./BuildView";

interface Act {
    desc: string,
    cls: new () => any;
}

export default class BatMain {
    constructor() {
        const act: Act[] = [
            { desc: "创建UI", cls: BuildView },
            { desc: "导出表配置", cls: ExportTable },
            { desc: "更新资源路径", cls: BuildResPath },
            { desc: "更新网络相关", cls: BuildNet },
            { desc: "用户数据事件", cls: BuildUserDataEvent },
        ];
        let tip = "选择要进行的操作：\n0. 全部执行\n";
        act.forEach((v, index) => tip += `${ index + 1 }. ${ v.desc }\n`);
        let rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = () => {
            rl.question(tip, function (prompt) {
                let index = +prompt;
                if (Number.isNaN(index) == false && (index && act[ index - 1 ] || !index)) {
                    index -= 1;
                    const acts: Act[] = [];
                    if (index == -1) acts.push(...act);
                    else acts.push(act[ index ]);
                    acts.length && acts.forEach(v => {
                        console.log(colors.yellow("正在执行 => " + v.desc));
                        new v.cls();
                        console.log(colors.green(v.desc + " => 执行完毕！"));
                    });
                } else {
                    console.log(colors.red("错误的选项！"));
                }
                rl.close();
                process.exit();
                // question();
            });
        }
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
}
new BatMain();