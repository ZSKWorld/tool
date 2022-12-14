"use strict";
exports.__esModule = true;
var fs = require("fs");
var Const_1 = require("./Const");
var Utils_1 = require("./Utils");
var BuildNetResponse = /** @class */ (function () {
    function BuildNetResponse() {
        this.build();
    }
    BuildNetResponse.prototype.build = function () {
        if (!fs.existsSync(Const_1.ServiceObjsPath)) {
            return console.log("文件不存在" + Const_1.ServiceObjsPath);
        }
        var content = fs.readFileSync(Const_1.ServiceObjsPath).toString();
        var matches = content.match(/.*void {/g).map(function (match) { return match.trim(); });
        var data = "/**The class is automatically generated by BatMain.bat , please do not modify */\nexport const enum NetResponse {\n\t/**\n\t * @param { IUserData }\n\t */\n\tSyncInfo = \"SyncInfo\",\n";
        matches.forEach(function (match) {
            var name = match.substring(0, match.trim().indexOf("("));
            var type = match.substring(match.indexOf("(") + 1, match.indexOf(")")).replace("Input", "Output").split(":")[1];
            var temp = (0, Utils_1.UpperFirst)(name);
            data += "\t/**\n\t * @param ".concat(type ? "{ " + type.trim() + " }" : "无参", "\n\t */\n");
            data += "\tResponse_".concat(temp, " = \"Response_").concat(temp, "\",\n");
        });
        data += "}";
        fs.writeFileSync(Const_1.NetResponsePath, data);
    };
    return BuildNetResponse;
}());
exports["default"] = BuildNetResponse;
// export const enum NetResponse {
//     Response_Login = "Response_Login",
//     Response_Register = "Response_Register",
// }
