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
var fs = require("fs");
var path = require("path");
var BuildBase_1 = require("./BuildBase");
var Const_1 = require("./Const");
var Utils_1 = require("./Utils");
var BuildView = /** @class */ (function (_super) {
    __extends(BuildView, _super);
    function BuildView() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.viewTemplate = (0, Utils_1.GetTemplateContent)("View");
        _this.ctrlTemplate = (0, Utils_1.GetTemplateContent)("ViewCtrl");
        _this.proxyTemplate = (0, Utils_1.GetTemplateContent)("ViewProxy");
        _this.viewIDTemplate = (0, Utils_1.GetTemplateContent)("ViewID");
        _this.viewRegisterTemplate = (0, Utils_1.GetTemplateContent)("ViewRegister");
        _this.buildFilter = [
            { sign: "UI", funcs: [_this.BuildView, _this.BuildCtrl] },
            { sign: "Com", funcs: [_this.BuildView, _this.BuildCtrl], subDir: "Coms" },
            { sign: "Render", funcs: [_this.BuildComponent], subDir: "Renders" },
        ];
        return _this;
    }
    BuildView.prototype.doBuild = function () {
        (0, Utils_1.MakeDir)(Const_1.UiDir);
        (0, Utils_1.MakeDir)(Const_1.ViewDir);
        (0, Utils_1.MakeDir)(Const_1.ViewCtrlDir);
        this.CheckBuild(Const_1.UiDir);
        this.BuildViewID();
        this.BuildViewRegister();
    };
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
                uiComps.forEach(function (v, index) {
                    var _a = v.substring(7, v.length - 1).split(":"), varName = _a[0], varType = _a[1];
                    if (varName.startsWith("Btn")) {
                        var msgName = "On".concat(varName, "Click");
                        var msgValue = "\"".concat(filename, "_").concat(msgName, "\"");
                        messages_1 += "\t".concat(msgName, " = ").concat(msgValue, ",\n");
                        sendContent_1 += "\n\t    ".concat(varName, ".onClick(this, this.sendMessage, [ ").concat(msgEnumName_1, ".").concat(msgName, " ]);");
                    }
                    else if (varType.startsWith("Com")) {
                        compExtension_1 += "\n\t\tthis.initView(".concat(varName, ");");
                    }
                    else
                        return;
                    useComps_1.push(varName);
                });
                var resPathPath = path.relative(viewDir, Const_1.ResPathPathNoExt);
                imports += "import { ResPath } from \"".concat(resPathPath.replace(/\\/g, "/"), "\";\n");
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
                        msgContent_1 += "\t\tthis.addMessage(".concat(viewMsg, ".On").concat(v, "Click, this.on").concat(v, "Click);\n");
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
        this.BuildProxy(dirPath, filename, subDir);
    };
    BuildView.prototype.BuildProxy = function (dirPath, filename, subDir) {
        var _ctrlDir = path.resolve(Const_1.ViewCtrlDir, path.basename(dirPath) + "/" + subDir);
        var _proxyDir = path.resolve(Const_1.ViewProxyDir, path.basename(dirPath) + "/" + subDir);
        (0, Utils_1.MakeDir)(_proxyDir);
        var _a = [
            filename + "Ctrl",
            filename + "Proxy",
            path.resolve(_ctrlDir, filename + "Ctrl"),
            path.resolve(_proxyDir, filename + "Proxy.ts"),
        ], ctrlCls = _a[0], proxyCls = _a[1], ctrlPath = _a[2], proxyPath = _a[3];
        if (!fs.existsSync(proxyPath)) {
            var content = this.proxyTemplate;
            content = content.replace(/#hasSubDir#/g, subDir ? "../" : "")
                .replace(/#viewCtrlPath#/g, path.relative(_proxyDir, ctrlPath).replace(/\\/g, "/"))
                .replace(/#proxyName#/g, proxyCls)
                .replace(/#viewCtrl#/g, ctrlCls);
            fs.writeFileSync(proxyPath, content);
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
        var proxyNames = (0, Utils_1.GetAllFile)(Const_1.ViewProxyDir, true, function (filename) { return filename.endsWith("Proxy.ts"); }, function (filename) { return filename.replace(".ts", ""); });
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
                    RegisterCode += "\t\tregister(ViewID.".concat(basename.replace(sign, ""), "View, ").concat(basename, "View, ").concat(basename + "Ctrl", ", ").concat(basename + "Proxy", ");\n");
            });
        };
        addExtAndRegistCode(comNames, "Coms", "", true);
        addExtAndRegistCode(renderNames, "Renders", "Render", false);
        addExtAndRegistCode(uiNames, "Views", "UI", true);
        var Import = [
            "import { ViewID } from \"./ViewID\";\n",
            "import { uiMgr } from \"./UIManager\";\n",
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
        addImport(proxyNames, true);
        var content = this.viewRegisterTemplate
            .replace("#import#", Import.sort().join(""))
            .replace("#binderCode#", BinderCode + "\t")
            .replace("#extensionCode#", ExtensionCode + "\t")
            .replace("#registerCode#", RegisterCode + "\t");
        fs.writeFileSync(Const_1.ViewRegisterPath, content);
    };
    return BuildView;
}(BuildBase_1.BuildBase));
exports["default"] = BuildView;
