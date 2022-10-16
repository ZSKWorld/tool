"use strict";
exports.__esModule = true;
var fs = require("fs");
var path = require("path");
var Const_1 = require("./Const");
var Utils_1 = require("./Utils");
var BuildView = /** @class */ (function () {
    function BuildView() {
        this.viewTemplate = (0, Utils_1.GetTemplateContent)("View");
        this.ctrlTemplate = (0, Utils_1.GetTemplateContent)("ViewCtrl");
        this.netProcessorTemplate = (0, Utils_1.GetTemplateContent)("ViewNetProcessor");
        this.viewIDTemplate = (0, Utils_1.GetTemplateContent)("ViewID");
        this.viewRegisterTemplate = (0, Utils_1.GetTemplateContent)("ViewRegister");
        this.buildFilter = [
            { sign: "UI", funcs: [this.BuildView, this.BuildCtrl] },
            { sign: "Com", funcs: [this.BuildView, this.BuildCtrl], subDir: "Coms" },
            { sign: "Render", funcs: [this.BuildComponent], subDir: "Renders" },
        ];
        (0, Utils_1.MakeDir)(Const_1.UiDir);
        (0, Utils_1.MakeDir)(Const_1.ViewDir);
        (0, Utils_1.MakeDir)(Const_1.ViewCtrlDir);
        this.CheckBuild(Const_1.UiDir);
        this.BuildViewID();
        this.BuildViewRegister();
    }
    BuildView.prototype.CheckBuild = function (dirPath) {
        var _this = this;
        fs.readdirSync(dirPath).forEach(function (filename) {
            var filePath = path.resolve(dirPath, filename);
            var info = fs.statSync(filePath);
            if (info.isDirectory()) {
                _this.CheckBuild(filePath);
            }
            else if (info.isFile()) {
                _this.buildFilter.forEach(function (filter) {
                    if (filename.endsWith(".ts") && filename.startsWith(filter.sign))
                        filter.funcs.forEach(function (func) { return func.call(_this, dirPath, filename.replace(".ts", ""), filter.subDir || ""); });
                });
            }
        });
    };
    BuildView.prototype.BuildView = function (dirPath, filename, subDir) {
        if (subDir === void 0) { subDir = ""; }
        var viewDir = path.resolve(Const_1.ViewDir, path.basename(dirPath) + "/" + subDir);
        (0, Utils_1.MakeDir)(viewDir);
        var _a = [
            filename + "View",
            path.resolve(viewDir, filename + "View.ts"),
            path.basename(dirPath),
        ], viewCls = _a[0], viewPath = _a[1], pkgName = _a[2];
        if (!fs.existsSync(viewPath)) {
            var content = this.viewTemplate;
            content = content.replace(/#subDir#/g, subDir ? "../" : "")
                .replace(/#className#/g, viewCls)
                .replace(/#packageName#/g, pkgName)
                .replace(/#fileName#/g, filename);
            var _b = ["", "", "\n", "", ""], sendContent_1 = _b[0], compContent = _b[1], compExtension_1 = _b[2], imports = _b[3], messages_1 = _b[4];
            var matches = fs.readFileSync(path.resolve(dirPath, filename + ".ts")).toString().match(/public.*:.*;/g);
            var uiComps = matches ? matches.filter(function (v) { return !v.includes("static"); }) : [];
            // const uiComps = fs.readFileSync(path.resolve(dirPath, filename + ".ts")).toString().match(/public((?!static).)*;/g);
            if (uiComps.length > 0) {
                var msgEnumName_1 = "".concat(filename, "Msg");
                var useComps_1 = [];
                var addViewIDImport_1 = false;
                uiComps.forEach(function (v, index) {
                    var _a = v.substring(7, v.length - 1).split(":"), varName = _a[0], varType = _a[1];
                    if (varName.startsWith("Btn")) {
                        var msgName = "On".concat(varName, "Click");
                        var msgValue = "\"".concat(filename, "_").concat(msgName, "\"");
                        messages_1 += "\t".concat(msgName, " = ").concat(msgValue, ",\n");
                        sendContent_1 += "\n\t    ".concat(varName, ".onClick(this, this.sendMessage, [ ").concat(msgEnumName_1, ".").concat(msgName, " ]);");
                    }
                    else if (varType.startsWith("Com")) {
                        addViewIDImport_1 = true;
                        !useComps_1.includes("listener") && useComps_1.unshift("listener");
                        compExtension_1 += "\n\t\tthis.initView(".concat(varName, ", listener);");
                    }
                    else
                        return;
                    useComps_1.push(varName);
                });
                var resPathPath = path.relative(viewDir, Const_1.ResPathPathNoExt);
                imports += "import { ResPath } from \"".concat(resPathPath.replace(/\\/g, "/"), "\";\n");
                if (addViewIDImport_1) {
                    var viewIDRelativePath = path.relative(viewDir, Const_1.ViewIDPath.replace(".ts", ""));
                    imports += "import { ViewID } from \"".concat(viewIDRelativePath.replace(/\\/g, "/"), "\";\n");
                }
                compContent = useComps_1.length > 0 ? "const { ".concat(useComps_1.join(", "), " } = this;").concat(sendContent_1) : sendContent_1;
            }
            content = content.replace(/#allComp#/g, compContent)
                .replace(/#messages#/g, messages_1.trimEnd())
                .replace(/#imports#/g, imports)
                .replace(/#compExtension#/g, compExtension_1.trimEnd());
            console.log(viewCls);
            fs.writeFileSync(viewPath, content);
        }
    };
    BuildView.prototype.BuildCtrl = function (dirPath, filename, subDir) {
        var _ctrlDir = path.resolve(Const_1.ViewCtrlDir, path.basename(dirPath) + "/" + subDir);
        (0, Utils_1.MakeDir)(_ctrlDir);
        var _a = [
            filename + "View",
            filename + "Msg",
            filename + "Ctrl",
            filename + "Data",
            path.resolve(_ctrlDir, filename + "Ctrl.ts"),
            path.basename(dirPath),
        ], viewCls = _a[0], viewMsg = _a[1], ctrlCls = _a[2], dataName = _a[3], ctrlPath = _a[4], pkgName = _a[5];
        if (!fs.existsSync(ctrlPath)) {
            var content = this.ctrlTemplate;
            content = content.replace(/#hasSubDir#/g, subDir ? "../" : "")
                .replace(/#subDir#/g, subDir ? "".concat(subDir, "/") : "")
                .replace(/#className#/g, ctrlCls)
                .replace(/#packageName#/g, pkgName)
                .replace(/#viewClass#/g, viewCls)
                .replace(/#viewMsg#/g, viewMsg)
                .replace(/#dataName#/g, dataName);
            var _b = ["", ""], msgContent_1 = _b[0], funcContent_1 = _b[1];
            var matches = fs.readFileSync(path.resolve(dirPath, filename + ".ts")).toString().match(/public.*:.*;/g);
            var uiComps = matches ? matches.filter(function (v) { return !v.includes("static"); }) : [];
            if (uiComps.length > 0) {
                uiComps.forEach(function (v) {
                    v = v.split(" ")[1].split(":")[0];
                    if (v.startsWith("Btn")) {
                        msgContent_1 += "\t\tthis.addMessageListener(".concat(viewMsg, ".On").concat(v, "Click, this.on").concat(v, "Click);\n");
                        funcContent_1 += "\tprivate on".concat(v, "Click(): void {\n\t\n\t}\n\n");
                    }
                });
                msgContent_1 = msgContent_1 ? msgContent_1.trimEnd() : msgContent_1;
                funcContent_1 = funcContent_1 ? funcContent_1.trimEnd() + "\n" : funcContent_1;
            }
            content = content.replace(/#btnMessage#/g, msgContent_1);
            content = content.replace(/#btnFunctions#/g, funcContent_1);
            console.log(ctrlCls);
            fs.writeFileSync(ctrlPath, content);
        }
        this.BuildProcessor(dirPath, filename, subDir);
    };
    BuildView.prototype.BuildProcessor = function (dirPath, filename, subDir) {
        var _ctrlDir = path.resolve(Const_1.ViewCtrlDir, path.basename(dirPath) + "/" + subDir);
        var _processorDir = path.resolve(Const_1.ViewNetProcessorDir, path.basename(dirPath) + "/" + subDir);
        (0, Utils_1.MakeDir)(_processorDir);
        var _a = [
            filename + "Ctrl",
            filename + "NetProcessor",
            path.resolve(_ctrlDir, filename + "Ctrl"),
            path.resolve(_processorDir, filename + "NetProcessor.ts"),
        ], ctrlCls = _a[0], processorCls = _a[1], ctrlPath = _a[2], processorPath = _a[3];
        if (!fs.existsSync(processorPath)) {
            var content = this.netProcessorTemplate;
            content = content.replace(/#hasSubDir#/g, subDir ? "../" : "")
                .replace(/#viewCtrlPath#/g, path.relative(_processorDir, ctrlPath).replace(/\\/g, "/"))
                .replace(/#processorName#/g, processorCls)
                .replace(/#viewCtrl#/g, ctrlCls);
            fs.writeFileSync(processorPath, content);
        }
    };
    BuildView.prototype.BuildComponent = function (dirPath, filename, subDir) {
        var compDir = path.resolve(Const_1.ViewDir, path.basename(dirPath) + "/" + subDir);
        (0, Utils_1.MakeDir)(compDir);
        var compCls = filename + "View";
        var compPath = path.resolve(compDir, compCls + ".ts");
        if (!fs.existsSync(compPath)) {
            var filePath = path.resolve(dirPath, filename);
            var content = "import ".concat(filename, " from \"").concat(path.relative(compDir, filePath).replace(/\\/g, "/"), "\";\nimport { ExtensionClass } from \"").concat(path.relative(compDir, Const_1.UtilPath.replace(".ts", "")).replace(/\\/g, "/"), "\";\nimport { GComponentExtend } from \"").concat(path.relative(compDir, Const_1.ViewInterfacePath.replace(".ts", "")).replace(/\\/g, "/"), "\";\n\nexport class ").concat(compCls, " extends ExtensionClass<GComponentExtend, ").concat(filename, ">(").concat(filename, ") {\n\n}");
            console.log(compCls);
            fs.writeFileSync(compPath, content);
        }
    };
    BuildView.prototype.BuildViewID = function () {
        var _a = ["\t/**Coms */\n", "\t/**Views */\n"], coms = _a[0], views = _a[1];
        var viewNames = (0, Utils_1.GetAllFile)(Const_1.ViewDir, false, function (filename) { return (filename.startsWith("UI") || filename.startsWith("Com")) && filename.endsWith("View.ts"); }, function (filename) { return filename.replace(".ts", ""); });
        var viewCount = 0;
        viewNames.forEach(function (v) {
            if (v.startsWith("UI")) {
                v = v.replace("UI", "");
                views += "\t".concat(v, " = \"").concat(v, "\",\n");
                viewCount++;
            }
            else if (v.startsWith("Com")) {
                coms += "\t".concat(v, " = \"").concat(v, "\",\n");
                viewCount++;
            }
        });
        if (viewCount == 0)
            coms = "\tNone = \"\",\n" + coms;
        var content = this.viewIDTemplate.replace("#content#", coms + "\n" + views);
        fs.writeFileSync(Const_1.ViewIDPath, content);
    };
    BuildView.prototype.BuildViewRegister = function () {
        var viewRegisterDir = path.dirname(Const_1.ViewRegisterPath);
        var binderNames = (0, Utils_1.GetAllFile)(Const_1.UiDir, true, function (filename) { return filename.endsWith("Binder.ts"); }, function (filename) { return filename.replace(".ts", ""); });
        var uiNames = (0, Utils_1.GetAllFile)(Const_1.UiDir, true, function (filename) { return filename.startsWith("UI") && filename.endsWith(".ts"); }, function (filename) { return filename.replace(".ts", ""); });
        var comNames = (0, Utils_1.GetAllFile)(Const_1.UiDir, true, function (filename) { return filename.startsWith("Com") && filename.endsWith(".ts"); }, function (filename) { return filename.replace(".ts", ""); });
        var renderNames = (0, Utils_1.GetAllFile)(Const_1.UiDir, true, function (filename) { return filename.startsWith("Render") && filename.endsWith(".ts"); }, function (filename) { return filename.replace(".ts", ""); });
        var uiViewNames = (0, Utils_1.GetAllFile)(Const_1.ViewDir, true, function (filename) { return filename.startsWith("UI") && filename.endsWith("View.ts"); }, function (filename) { return filename.replace(".ts", ""); });
        var comViewNames = (0, Utils_1.GetAllFile)(Const_1.ViewDir, true, function (filename) { return filename.startsWith("Com") && filename.endsWith(".ts"); }, function (filename) { return filename.replace(".ts", ""); });
        var renderViewNames = (0, Utils_1.GetAllFile)(Const_1.ViewDir, true, function (filename) { return filename.startsWith("Render") && filename.endsWith(".ts"); }, function (filename) { return filename.replace(".ts", ""); });
        var ctrlNames = (0, Utils_1.GetAllFile)(Const_1.ViewCtrlDir, true, function (filename) { return filename.endsWith("Ctrl.ts"); }, function (filename) { return filename.replace(".ts", ""); });
        var netProcessorNames = (0, Utils_1.GetAllFile)(Const_1.ViewNetProcessorDir, true, function (filename) { return filename.endsWith("NetProcessor.ts"); }, function (filename) { return filename.replace(".ts", ""); });
        var _a = ["", "", ""], BinderCode = _a[0], ExtensionCode = _a[1], RegisterCode = _a[2];
        binderNames.forEach(function (v) {
            var basename = path.basename(v);
            BinderCode += "\t\t".concat(basename, ".bindAll();\n");
        });
        var addExtAndRegistCode = function (arr, desc, sign, hasRegist) {
            ExtensionCode += "\n\t\t//".concat(desc, "\n");
            hasRegist && (RegisterCode += "\n\t\t//".concat(desc, "\n"));
            arr.forEach(function (v) {
                var basename = path.basename(v);
                ExtensionCode += "\t\tfgui.UIObjectFactory.setExtension(".concat(basename, ".URL, ").concat(basename, "View);\n");
                if (hasRegist)
                    RegisterCode += "\t\tregister(ViewID.".concat(basename.replace(sign, ""), "View, ").concat(basename, "View, ").concat(basename + "Ctrl", ", ").concat(basename + "NetProcessor", ");\n");
            });
        };
        addExtAndRegistCode(comNames, "Coms", "", true);
        addExtAndRegistCode(renderNames, "Renders", "Render", false);
        addExtAndRegistCode(uiNames, "Views", "UI", true);
        var Import = [
            "import { ViewID } from \"./ViewID\";\n",
            "import { ViewClass, NetProcessorClass, CtrlClass } from \"./UIGlobal\";\n",
            "import { INetProcessor_Class, IViewCtrl_Class, IView_Class } from \"./Interfaces\";\n",
            "import { Logger } from \"../../libs/utils/Logger\";\n"
        ];
        var addImport = function (arr, has) {
            arr.forEach(function (v) {
                var basename = path.basename(v);
                Import.push("import ".concat(has ? "{ " : "").concat(basename, " ").concat(has ? "} " : "", "from \"").concat(path.relative(viewRegisterDir, v).replace(/\\/g, "/"), "\";\n"));
            });
        };
        addImport(binderNames, false);
        addImport(uiNames, false);
        addImport(comNames, false);
        addImport(renderNames, false);
        addImport(uiViewNames, true);
        addImport(comViewNames, true);
        addImport(renderViewNames, true);
        addImport(ctrlNames, true);
        addImport(netProcessorNames, true);
        var content = this.viewRegisterTemplate
            .replace("#import#", Import.sort().join(""))
            .replace("#binderCode#", BinderCode + "\t")
            .replace("#extensionCode#", ExtensionCode + "\t")
            .replace("#registerCode#", RegisterCode + "\t");
        fs.writeFileSync(Const_1.ViewRegisterPath, content);
    };
    return BuildView;
}());
exports["default"] = BuildView;
