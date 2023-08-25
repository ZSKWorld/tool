import { resolve } from "path";

export const __workname = process.cwd();

export const ResDir = resolve(__workname, "bin/res");
export const UiDir = resolve(__workname, "src/core/ui/ui");
export const ViewDir = resolve(__workname, "src/core/ui/view");
export const ResPathPath = resolve(__workname, "src/core/common/ResPath.ts");
export const ResPathPathNoExt = resolve(__workname, "src/core/common/ResPath");
export const ViewIDPath = resolve(__workname, "src/core/ui/core/ViewID.ts");
export const BaseViewCtrlPath = resolve(__workname, "src/core/ui/core/BaseViewCtrl.ts");
export const BaseProxyPath = resolve(__workname, "src/core/ui/core/BaseProxy.ts");
export const ViewRegisterPath = resolve(__workname, "src/core/ui/core/ViewRegister.ts");
export const xlsxDir = resolve(__workname, "../策划");
export const CfgDataPath = resolve(__workname, "bin/res/config/Config.json");
export const CfgDir = resolve(__workname, "src/core/config");

export const NetDir = resolve(__workname, "src/core/net");
export const NetInterfaceDir = resolve(NetDir, "interface");
export const ServicesPath = resolve(NetDir, "Services.ts");
export const ServiceObjPath = resolve(NetDir, "ServiceObj.ts");
export const NetResponsePath = resolve(NetDir, "enum/NetMessage.ts");
export const UserDataDir = resolve(__workname, "src/core/userData");
export const UserDataInterfaceDir = resolve(UserDataDir, "interface");
export const UserDataEventPath = resolve(UserDataDir, "UserDataEvent.ts");

export const MODIFY_TIP = "/** This script is generated automatically, Please do not any modify! */\r";