import * as fs from "fs";
import * as path from "path";
/**创建目录，递归创建 */
export function MakeDir(dirPath: string) {
    fs.mkdirSync(dirPath, { recursive: true });
}
/**删除目录，包括目录中所有文件和子目录 */
export function RemoveDir(dir: string) {
    if (fs.existsSync(dir) == false) return;
    let files = fs.readdirSync(dir)
    for (var i = 0; i < files.length; i++) {
        let newPath = path.join(dir, files[i]);
        let stat = fs.statSync(newPath)
        if (stat.isDirectory()) {
            //如果是文件夹就递归下去
            this.RemoveDir(newPath);
        } else {
            //删除文件
            fs.unlinkSync(newPath);
        }
    }
    fs.rmdirSync(dir)
}
/**
 * 获取目录中的所有文件
 * @param dirPath 路径
 * @param absolute 是否返回文件绝对路径
 * @param filter 过滤函数
 * @param map 修改函数
 * @returns 
 */
export function GetAllFile(dirPath: string, absolute?: boolean, filter?: (name: string) => boolean, map?: (name: string) => string) {
    const names: string[] = [];
    fs.readdirSync(dirPath).forEach(filename => {
        const filePath = path.resolve(dirPath, filename);
        const state = fs.statSync(filePath);
        if (state.isDirectory()) {
            names.push(...GetAllFile(filePath, absolute, filter, map));
        } else if (state.isFile()) {
            if (!filter || filter(filename)) {
                let temp = map ? map(filename) : filename;
                absolute ? names.push(path.resolve(dirPath, temp)) : names.push(temp);
            }
        }
    });
    return names;
}
/**获取模板内容 */
export function GetTemplateContent(templateName: string) {
    return fs.readFileSync(__dirname + "../../template/" + templateName + ".template").toString();
}

export function UpperFirst(str: string, splits?: string[]) {
    if (!str) return str;
    if (str.length == 1) return str.toUpperCase();
    else {
        let temp = str[0].toUpperCase() + str.substring(1);
        if (splits && splits.length) {
            let resultArr = [temp];
            splits.forEach(v => {
                let count = resultArr.length;
                while (count--) {
                    resultArr.push(...resultArr.shift().split(v).map(v1 => UpperFirst(v1)));
                }
            });
            return resultArr.join("_");
        } else {
            return temp;
        }
    }
}