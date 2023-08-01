import * as fs from "fs";
import * as path from "path";
import { BuildBase } from "./BuildBase";
import { Logger } from "./Console";
import { BaseProxyPath, BaseViewCtrlPath, ResPathPathNoExt, UiDir, ViewDir, ViewIDPath, ViewRegisterPath } from "./Const";
import { GetAllFile, GetTemplateContent, MakeDir, UpperFirst } from "./Utils";
export default class BuildView extends BuildBase {
    private viewTemplate = GetTemplateContent("View");
    private ctrlTemplate = GetTemplateContent("ViewCtrl");
    private proxyTemplate = GetTemplateContent("ViewProxy");
    private viewIDTemplate = GetTemplateContent("ViewID");
    private viewRegisterTemplate = GetTemplateContent("ViewRegister");

    protected buildFilter = [
        { sign: "UI", funcs: [ this.BuildView, this.BuildCtrl, this.BuildProxy ] },
        { sign: "Com", funcs: [ this.BuildView, this.BuildCtrl ], subDir: "Coms" },
        { sign: "Btn", funcs: [ this.BuildView, this.BuildCtrl ], subDir: "Btns" },
        { sign: "Render", funcs: [ this.BuildView, this.BuildCtrl ], subDir: "Renders" },
    ];

    doBuild() {
        this.CheckBuild(UiDir);
        this.RemoveUnused();
        this.BuildViewID();
        this.BuildViewRegister();
    }

    private CheckBuild(dirPath: string) {
        fs.readdirSync(dirPath).forEach(filename => {
            const filePath = path.resolve(dirPath, filename);
            const info = fs.statSync(filePath);
            if (info.isDirectory()) {
                this.CheckBuild(filePath);
            }
            else if (info.isFile()) {
                this.buildFilter.forEach(filter => {
                    if (filename.endsWith(".ts") && filename.startsWith(filter.sign))
                        filter.funcs.forEach(func => func.call(this, dirPath, filename.replace(".ts", ""), filter.subDir || ""));
                });
            }
        })
    }

    private BuildView(dirPath: string, filename: string, subDir: string = "") {
        const viewDir = path.resolve(ViewDir, path.basename(dirPath) + "/view/" + subDir);
        MakeDir(viewDir);
        const [ viewCls, viewPath, pkgName ] = [
            filename + "View",
            path.resolve(viewDir, filename + "View.ts"),
            path.basename(dirPath),
        ];
        if (!fs.existsSync(viewPath)) {
            let content = this.viewTemplate;
            content = content.replace(/#viewPath#/g, path.relative(viewDir, path.resolve(dirPath, filename)).replace(/\\/g, "/").replace(/\.ts/g, ""))
                .replace(/#className#/g, viewCls)
                .replace(/#packageName#/g, pkgName)
                .replace(/#fileName#/g, filename);

            let [ sendContent, compContent, compExtension, imports, messages ] = [ "", "", "\n", "", "" ];

            const matches = fs.readFileSync(path.resolve(dirPath, filename + ".ts")).toString().match(/public.*:.*;/g);
            const uiComps = matches ? matches.filter(v => !v.includes("static")) : [];
            // const uiComps = fs.readFileSync(path.resolve(dirPath, filename + ".ts")).toString().match(/public((?!static).)*;/g);
            if (uiComps.length > 0) {
                let msgEnumName = `${ filename }Msg`;
                let useComps = [];
                uiComps.forEach((v, index) => {
                    const [ varName, varType ] = v.substring(7, v.length - 1).split(":");
                    if (varName.toLowerCase().startsWith("btn")) {
                        let msgName = `On${ UpperFirst(varName, [ "_" ], "") }Click`;
                        let msgValue = `"${ filename }_${ msgName }"`;
                        messages += `\t${ msgName } = ${ msgValue },\n`;
                        sendContent += `\n\t\t${ varName }.onClick(this, this.sendMessage, [ ${ msgEnumName }.${ msgName } ]);`;
                    } else return;
                    useComps.push(varName);
                });

                let resPathPath = path.relative(viewDir, ResPathPathNoExt);
                imports += `import { ResPath } from "${ resPathPath.replace(/\\/g, "/") }";\n`;
                compContent = useComps.length > 0 ? `const { ${ useComps.join(", ") } } = this;${ sendContent }` : sendContent;
            }

            content = content.replace(/#allComp#/g, compContent)
                .replace(/#messages#/g, messages.trimEnd())
                .replace(/#imports#/g, imports)
                .replace(/#compExtension#/g, compExtension.trimEnd());
            console.log(viewCls);
            fs.writeFileSync(viewPath, content);
        }
    }

    private BuildCtrl(dirPath: string, filename: string, subDir: string) {
        const _viewDir = path.resolve(ViewDir, path.basename(dirPath) + "/view/" + subDir);
        const _ctrlDir = path.resolve(ViewDir, path.basename(dirPath) + "/controller/" + subDir);
        MakeDir(_ctrlDir);
        const [ viewCls, viewMsg, ctrlCls, dataName, viewPath, ctrlPath, pkgName ] = [
            filename + "View",
            filename + "Msg",
            filename + "Ctrl",
            filename + "Data",
            path.resolve(_viewDir, filename + "View.ts"),
            path.resolve(_ctrlDir, filename + "Ctrl.ts"),
            path.basename(dirPath),
        ];
        if (!fs.existsSync(ctrlPath)) {
            let content = this.ctrlTemplate;
            content = content.replace(/#baseViewCtrlPath#/g, path.relative(_ctrlDir, BaseViewCtrlPath).replace(/\\/g, "/").replace(/\.ts/g, ""))
                .replace(/#viewPath#/g, path.relative(_ctrlDir, viewPath).replace(/\\/g, "/").replace(/\.ts/g, ""))
                .replace(/#className#/g, ctrlCls)
                .replace(/#packageName#/g, pkgName)
                .replace(/#viewClass#/g, viewCls)
                .replace(/#viewMsg#/g, viewMsg)
                .replace(/#dataName#/g, dataName);
            let [ msgContent, funcContent ] = [ "", "" ];
            const matches = fs.readFileSync(path.resolve(dirPath, filename + ".ts")).toString().match(/public.*:.*;/g);
            const uiComps = matches ? matches.filter(v => !v.includes("static")) : [];
            if (uiComps.length > 0) {
                uiComps.forEach(v => {
                    v = v.split(" ")[ 1 ].split(":")[ 0 ];
                    if (v.toLowerCase().startsWith("btn")) {
                        const btnName = UpperFirst(v, [ "_" ], "");
                        msgContent += `\t\tthis.addMessage(${ viewMsg }.On${ btnName }Click, this.on${ btnName }Click);\n`;
                        funcContent += `\tprivate on${ btnName }Click(): void {\n\t\n\t}\n\n`;
                    }
                })
                msgContent = msgContent ? msgContent.trimEnd() : msgContent;
                funcContent = funcContent ? funcContent.trimEnd() + "\n" : funcContent;
            }
            content = content.replace(/#btnMessage#/g, msgContent);
            content = content.replace(/#btnFunctions#/g, funcContent);
            console.log(ctrlCls);
            fs.writeFileSync(ctrlPath, content);
        }
    }

    private BuildProxy(dirPath: string, filename: string, subDir: string) {
        const _ctrlDir = path.resolve(ViewDir, path.basename(dirPath) + "/controller/" + subDir);
        const _proxyDir = path.resolve(ViewDir, path.basename(dirPath) + "/proxy/" + subDir);
        MakeDir(_proxyDir);
        const [ ctrlCls, proxyCls, ctrlPath, proxyPath ] = [
            filename + "Ctrl",
            filename + "Proxy",
            path.resolve(_ctrlDir, filename + "Ctrl"),
            path.resolve(_proxyDir, filename + "Proxy.ts"),
        ];
        if (!fs.existsSync(proxyPath)) {
            let content = this.proxyTemplate;
            content = content.replace(/#baseProxyPath#/g, path.relative(_proxyDir, BaseProxyPath).replace(/\\/g, "/").replace(/\.ts/g, ""))
                .replace(/#viewCtrlPath#/g, path.relative(_proxyDir, ctrlPath).replace(/\\/g, "/"))
                .replace(/#proxyName#/g, proxyCls)
                .replace(/#viewCtrl#/g, ctrlCls);
            fs.writeFileSync(proxyPath, content);
        }
    }

    private RemoveUnused() {
        GetAllFile(
            ViewDir,
            true,
            filename => filename.endsWith("View.ts") || filename.endsWith("Ctrl.ts") || filename.endsWith("Proxy.ts")
        ).forEach(filepath => {
            const relative = path.relative(ViewDir, filepath);
            const pkgname = relative.split("\\")[ 0 ];
            const filename = path.basename(relative, ".ts");
            let uiname = "";
            if (filename.endsWith("View")) uiname = filename.substring(0, filename.length - 4);
            else if (filename.endsWith("Ctrl")) uiname = filename.substring(0, filename.length - 4);
            else if (filename.endsWith("Proxy")) uiname = filename.substring(0, filename.length - 5);
            else return;
            const uipath = path.resolve(UiDir, pkgname, uiname + ".ts");
            if (!fs.existsSync(uipath)) {
                Logger.error("删除=>" + filepath);
                fs.unlinkSync(filepath);
            }
        });
    }

    private GetViewIDContent() {
        let [ btns, renders, coms, views ] = [
            "\t/**Btns */\n",
            "\t/**Renders */\n",
            "\t/**Coms */\n",
            "\t/**UIs */\n"
        ];
        const viewNames = GetAllFile(
            ViewDir, false,
            filename => (filename.startsWith("Btn")
                || filename.startsWith("Render")
                || filename.startsWith("Com")
                || filename.startsWith("UI")) && filename.endsWith("View.ts"),
            filename => filename.replace(".ts", ""),
        );
        let viewCount = 0;
        viewNames.forEach(v => {
            if (v.startsWith("UI")) {
                views += `\t${ v } = "${ v }",\n`;
            } else if (v.startsWith("Com")) {
                coms += `\t${ v } = "${ v }",\n`;
            } else if (v.startsWith("Btn")) {
                btns += `\t${ v } = "${ v }",\n`;
            } else if (v.startsWith("Render")) {
                renders += `\t${ v } = "${ v }",\n`;
            }
            else
                return;
            viewCount++;
        });
        let combine = btns + "\n" + renders + "\n" + coms + "\n" + views;
        if (viewCount == 0) combine = "\tNone = \"\",\n" + combine;
        return combine;
    }

    private BuildViewID() {
        let content = this.GetViewIDContent();
        content = this.viewIDTemplate.replace("#content#", content);
        fs.writeFileSync(ViewIDPath, content);
    }

    private BuildViewRegister() {
        const viewRegisterDir = path.dirname(ViewRegisterPath);
        const mapFunc = (fileName: string) => fileName.replace(".ts", "");
        const filterFunc = (start: string, end: string) => (fileName: string) => (!start || fileName.startsWith(start)) && (!end || fileName.endsWith(end));

        const binderNames = GetAllFile(UiDir, true, filterFunc("", "Binder.ts"), mapFunc);

        const uiNames = GetAllFile(UiDir, true, filterFunc("UI", ".ts"), mapFunc);
        const btnNames = GetAllFile(UiDir, true, filterFunc("Btn", ".ts"), mapFunc);
        const comNames = GetAllFile(UiDir, true, filterFunc("Com", ".ts"), mapFunc);
        const renderNames = GetAllFile(UiDir, true, filterFunc("Render", ".ts"), mapFunc);

        const uiViewNames = GetAllFile(ViewDir, true, filterFunc("UI", ".ts"), mapFunc);
        const btnViewNames = GetAllFile(ViewDir, true, filterFunc("Btn", ".ts"), mapFunc);
        const comViewNames = GetAllFile(ViewDir, true, filterFunc("Com", ".ts"), mapFunc);
        const renderViewNames = GetAllFile(ViewDir, true, filterFunc("Render", ".ts"), mapFunc);

        const ctrlNames = GetAllFile(ViewDir, true, filterFunc("", "Ctrl.ts"), mapFunc);
        const proxyNames = GetAllFile(ViewDir, true, filterFunc("", "Proxy.ts"), mapFunc);

        let [ BinderCode, ExtensionCode, RegisterCode ] = [ "", "", "" ];
        binderNames.forEach(v => {
            const basename = path.basename(v);
            BinderCode += `\t\t${ basename }.bindAll();\n`
        });
        const addExtAndRegistCode = (arr: string[], desc: string) => {
            ExtensionCode += `\n\t\t//${ desc }\n`;
            RegisterCode += `\n\t\t//${ desc }\n`;
            arr.forEach(v => {
                const basename = path.basename(v);
                ExtensionCode += `\t\tfgui.UIObjectFactory.setExtension(${ basename }.URL, ${ basename }View);\n`;
                let proxyName = basename + "Proxy";
                proxyName = proxyNames.find(v1 => v1.endsWith(proxyName)) ? ", " + proxyName : "";
                RegisterCode += `\t\tregister(ViewID.${ basename }View, ${ basename }View, ${ basename + "Ctrl" }${ proxyName });\n`;
            });
        }
        addExtAndRegistCode(btnNames, "Btns");
        addExtAndRegistCode(renderNames, "Renders");
        addExtAndRegistCode(comNames, "Coms");
        addExtAndRegistCode(uiNames, "UIs");

        let Import = [
            `import { uiMgr } from "./UIManager";\n`,
        ];
        const addImport = (arr: string[], hasDefault: boolean) => {
            arr.forEach(v => {
                const basename = path.basename(v);
                Import.push(`import ${ hasDefault ? "{ " : "" }${ basename } ${ hasDefault ? "} " : "" }from "${ path.relative(viewRegisterDir, v).replace(/\\/g, "/") }";\n`);
            });
        }
        addImport(binderNames, false);
        addImport(uiNames, false);
        addImport(btnNames, false);
        addImport(comNames, false);
        addImport(renderNames, false);

        addImport(uiViewNames, true);
        addImport(btnViewNames, true);
        addImport(comViewNames, true);
        addImport(renderViewNames, true);

        let content = this.viewRegisterTemplate
            .replace("#import#", Import.sort().join(""))
            .replace("#binderCode#", BinderCode + "\t")
            .replace("#extensionCode#", ExtensionCode + "\t")
            .replace("#registerCode#", RegisterCode + "\t");
        content = content.replace("#ViewIDContent#", this.GetViewIDContent());
        fs.writeFileSync(ViewRegisterPath, content);
    }
}