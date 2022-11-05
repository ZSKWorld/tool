import * as fs from "fs";
import * as path from "path";
import { BuildBase } from "./BuildBase";
import { ResPathPathNoExt, UiDir, UtilPath, ViewCtrlDir, ViewDir, ViewIDPath, ViewInterfacePath, ViewNetProcessorDir, ViewRegisterPath } from "./Const";
import { GetAllFile, GetTemplateContent, MakeDir } from "./Utils";
export default class BuildView extends BuildBase{
    private viewTemplate = GetTemplateContent("View");
    private ctrlTemplate = GetTemplateContent("ViewCtrl");
    private netProcessorTemplate = GetTemplateContent("ViewNetProcessor");
    private viewIDTemplate = GetTemplateContent("ViewID");
    private viewRegisterTemplate = GetTemplateContent("ViewRegister");

    private buildFilter = [
        { sign: "UI", funcs: [ this.BuildView, this.BuildCtrl ] },
        { sign: "Com", funcs: [ this.BuildView, this.BuildCtrl ], subDir: "Coms" },
        { sign: "Render", funcs: [ this.BuildComponent ], subDir: "Renders" },
    ]

    doBuild() {
        MakeDir(UiDir);
        MakeDir(ViewDir);
        MakeDir(ViewCtrlDir);
        this.CheckBuild(UiDir);
        this.BuildViewID();
        this.BuildViewRegister()
    }

    CheckBuild(dirPath: string) {
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

    BuildView(dirPath: string, filename: string, subDir: string = "") {
        const viewDir = path.resolve(ViewDir, path.basename(dirPath) + "/" + subDir);
        MakeDir(viewDir);
        const [ viewCls, viewPath, pkgName ] = [
            filename + "View",
            path.resolve(viewDir, filename + "View.ts"),
            path.basename(dirPath),
        ];
        if (!fs.existsSync(viewPath)) {
            let content = this.viewTemplate;
            content = content.replace(/#subDir#/g, subDir ? "../" : "")
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
                let addViewIDImport = false;
                uiComps.forEach((v, index) => {
                    const [ varName, varType ] = v.substring(7, v.length - 1).split(":");
                    if (varName.startsWith("Btn")) {
                        let msgName = `On${ varName }Click`;
                        let msgValue = `"${ filename }_${ msgName }"`;
                        messages += `\t${ msgName } = ${ msgValue },\n`;
                        sendContent += `\n\t    ${ varName }.onClick(this, this.sendMessage, [ ${ msgEnumName }.${ msgName } ]);`;
                    } else if (varType.startsWith("Com")) {
                        addViewIDImport = true;
                        !useComps.includes("listener") && useComps.unshift("listener");
                        compExtension += `\n\t\tthis.initView(${ varName }, listener);`;
                    } else return;
                    useComps.push(varName);
                });

                let resPathPath = path.relative(viewDir, ResPathPathNoExt);
                imports += `import { ResPath } from "${ resPathPath.replace(/\\/g, "/") }";\n`;
                if (addViewIDImport) {
                    let viewIDRelativePath = path.relative(viewDir, ViewIDPath.replace(".ts", ""));
                    imports += `import { ViewID } from "${ viewIDRelativePath.replace(/\\/g, "/") }";\n`;
                }
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

    BuildCtrl(dirPath: string, filename: string, subDir: string) {
        const _ctrlDir = path.resolve(ViewCtrlDir, path.basename(dirPath) + "/" + subDir);
        MakeDir(_ctrlDir);
        const [ viewCls, viewMsg, ctrlCls, dataName, ctrlPath, pkgName ] = [
            filename + "View",
            filename + "Msg",
            filename + "Ctrl",
            filename + "Data",
            path.resolve(_ctrlDir, filename + "Ctrl.ts"),
            path.basename(dirPath),
        ];
        if (!fs.existsSync(ctrlPath)) {
            let content = this.ctrlTemplate;
            content = content.replace(/#hasSubDir#/g, subDir ? "../" : "")
                .replace(/#subDir#/g, subDir ? `${ subDir }/` : "")
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
                    if (v.startsWith("Btn")) {
                        msgContent += `\t\tthis.addMessageListener(${ viewMsg }.On${ v }Click, this.on${ v }Click);\n`;
                        funcContent += `\tprivate on${ v }Click(): void {\n\t\n\t}\n\n`;
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
        this.BuildProcessor(dirPath, filename, subDir);
    }

    BuildProcessor(dirPath: string, filename: string, subDir: string) {
        const _ctrlDir = path.resolve(ViewCtrlDir, path.basename(dirPath) + "/" + subDir);
        const _processorDir = path.resolve(ViewNetProcessorDir, path.basename(dirPath) + "/" + subDir);
        MakeDir(_processorDir);
        const [ ctrlCls, processorCls, ctrlPath, processorPath ] = [
            filename + "Ctrl",
            filename + "NetProcessor",
            path.resolve(_ctrlDir, filename + "Ctrl"),
            path.resolve(_processorDir, filename + "NetProcessor.ts"),
        ];
        if (!fs.existsSync(processorPath)) {
            let content = this.netProcessorTemplate;
            content = content.replace(/#hasSubDir#/g, subDir ? "../" : "")
                .replace(/#viewCtrlPath#/g, path.relative(_processorDir, ctrlPath).replace(/\\/g, "/"))
                .replace(/#processorName#/g, processorCls)
                .replace(/#viewCtrl#/g, ctrlCls);
            fs.writeFileSync(processorPath, content);
        }
    }

    BuildComponent(dirPath: string, filename: string, subDir: string) {
        var compDir = path.resolve(ViewDir, path.basename(dirPath) + "/" + subDir);
        MakeDir(compDir);
        const compCls = filename + "View";
        const compPath = path.resolve(compDir, compCls + ".ts");
        if (!fs.existsSync(compPath)) {
            const filePath = path.resolve(dirPath, filename);
            let content = `import ${ filename } from "${ path.relative(compDir, filePath).replace(/\\/g, "/") }";
import { ExtensionClass } from "${ path.relative(compDir, UtilPath.replace(".ts", "")).replace(/\\/g, "/") }";
import { GComponentExtend } from "${ path.relative(compDir, ViewInterfacePath.replace(".ts", "")).replace(/\\/g, "/") }";
\nexport class ${ compCls } extends ExtensionClass<GComponentExtend, ${ filename }>(${ filename }) {\n\n}`;
            console.log(compCls);
            fs.writeFileSync(compPath, content);
        }
    }

    BuildViewID() {
        let [ coms, views ] = [ "\t/**Coms */\n", "\t/**Views */\n" ];
        const viewNames = GetAllFile(
            ViewDir, false,
            filename => (filename.startsWith("UI") || filename.startsWith("Com")) && filename.endsWith("View.ts"),
            filename => filename.replace(".ts", ""),
        );
        let viewCount = 0;
        viewNames.forEach(v => {
            if (v.startsWith("UI")) {
                v = v.replace("UI", "");
                views += `\t${ v } = "${ v }",\n`;
                viewCount++;
            } else if (v.startsWith("Com")) {
                coms += `\t${ v } = "${ v }",\n`;
                viewCount++;
            }
        });
        if (viewCount == 0) coms = "\tNone = \"\",\n" + coms;
        const content = this.viewIDTemplate.replace("#content#", coms + "\n" + views);
        fs.writeFileSync(ViewIDPath, content);
    }

    BuildViewRegister() {
        const viewRegisterDir = path.dirname(ViewRegisterPath);

        const binderNames = GetAllFile(UiDir, true, filename => filename.endsWith("Binder.ts"), filename => filename.replace(".ts", ""));
        const uiNames = GetAllFile(UiDir, true, filename => filename.startsWith("UI") && filename.endsWith(".ts"), filename => filename.replace(".ts", ""));
        const comNames = GetAllFile(UiDir, true, filename => filename.startsWith("Com") && filename.endsWith(".ts"), filename => filename.replace(".ts", ""));
        const renderNames = GetAllFile(UiDir, true, filename => filename.startsWith("Render") && filename.endsWith(".ts"), filename => filename.replace(".ts", ""));

        const uiViewNames = GetAllFile(ViewDir, true, filename => filename.startsWith("UI") && filename.endsWith("View.ts"), filename => filename.replace(".ts", ""));
        const comViewNames = GetAllFile(ViewDir, true, filename => filename.startsWith("Com") && filename.endsWith(".ts"), filename => filename.replace(".ts", ""));
        const renderViewNames = GetAllFile(ViewDir, true, filename => filename.startsWith("Render") && filename.endsWith(".ts"), filename => filename.replace(".ts", ""));
        const ctrlNames = GetAllFile(ViewCtrlDir, true, filename => filename.endsWith("Ctrl.ts"), filename => filename.replace(".ts", ""));
        const netProcessorNames = GetAllFile(ViewNetProcessorDir, true, filename => filename.endsWith("NetProcessor.ts"), filename => filename.replace(".ts", ""));

        let [ BinderCode, ExtensionCode, RegisterCode ] = [ "", "", "" ];
        binderNames.forEach(v => {
            const basename = path.basename(v);
            BinderCode += `\t\t${ basename }.bindAll();\n`
        });
        const addExtAndRegistCode = (arr: string[], desc: string, sign: string, hasRegist: boolean) => {
            ExtensionCode += `\n\t\t//${ desc }\n`;
            hasRegist && (RegisterCode += `\n\t\t//${ desc }\n`);
            arr.forEach(v => {
                const basename = path.basename(v);
                ExtensionCode += `\t\tfgui.UIObjectFactory.setExtension(${ basename }.URL, ${ basename }View);\n`;
                if (hasRegist)
                    RegisterCode += `\t\tregister(ViewID.${ basename.replace(sign, "") }View, ${ basename }View, ${ basename + "Ctrl" }, ${ basename + "NetProcessor" });\n`;
            });
        }
        addExtAndRegistCode(comNames, "Coms", "", true);
        addExtAndRegistCode(renderNames, "Renders", "Render", false);
        addExtAndRegistCode(uiNames, "Views", "UI", true);

        let Import = [
            `import { ViewID } from "./ViewID";\n`,
            `import { ViewClass, NetProcessorClass, CtrlClass } from "./UIGlobal";\n`,
            `import { INetProcessor_Class, IViewCtrl_Class, IView_Class } from "./Interfaces";\n`,
            `import { Logger } from "../../libs/utils/Logger";\n`
        ];
        const addImport = (arr: string[], has: boolean) => {
            arr.forEach(v => {
                const basename = path.basename(v);
                Import.push(`import ${ has ? "{ " : "" }${ basename } ${ has ? "} " : "" }from "${ path.relative(viewRegisterDir, v).replace(/\\/g, "/") }";\n`);
            });
        }
        addImport(binderNames, false);
        addImport(uiNames, false);
        addImport(comNames, false);
        addImport(renderNames, false);

        addImport(uiViewNames, true);
        addImport(comViewNames, true);
        addImport(renderViewNames, true);
        addImport(ctrlNames, true);
        addImport(netProcessorNames, true);

        let content = this.viewRegisterTemplate
            .replace("#import#", Import.sort().join(""))
            .replace("#binderCode#", BinderCode + "\t")
            .replace("#extensionCode#", ExtensionCode + "\t")
            .replace("#registerCode#", RegisterCode + "\t");
        fs.writeFileSync(ViewRegisterPath, content);
    }
}