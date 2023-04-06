import { resolve } from "path";

export const __workname = process.cwd();

export const UtilPath = resolve(__workname, "src/core/libs/utils/Util.ts");
export const ResDir = resolve(__workname, "bin/res");
export const UiDir = resolve(__workname, "src/core/ui/ui");
export const ViewDir = resolve(__workname, "src/core/ui/view");
export const ViewCtrlDir = resolve(__workname, "src/core/ui/viewCtrl");
export const ViewProxyDir = resolve(__workname, "src/core/ui/viewProxy");
export const ResPathPath = resolve(__workname, "src/core/common/ResPath.ts");
export const ResPathPathNoExt = resolve(__workname, "src/core/common/ResPath");
export const ViewIDPath = resolve(__workname, "src/core/ui/core/ViewID.ts");
export const ViewRegisterPath = resolve(__workname, "src/core/ui/core/ViewRegister.ts");
export const ViewInterfacePath = resolve(__workname, "src/core/ui/core/Interfaces.ts");
export const xlsxDir = resolve(__workname, "../策划");
export const TableDataPath = resolve(__workname, "bin/res/table/Config.json");
export const TablesCfgDir = resolve(__workname, "src/core/table");
export const TableStructTypePath = resolve(__workname, "src/core/table/TableStructTypes.d.ts");
export const LangPath = resolve(__workname, "src/core/table/LangCode.ts");

export const NetDir = resolve(__workname, "src/core/net");
export const NetInterfaceDir = resolve(NetDir, "interface");
export const ServicesPath = resolve(NetDir, "Services.ts");
export const ServiceObjPath = resolve(NetDir, "ServiceObj.ts");
export const NetResponsePath = resolve(NetDir, "enum/NetMessage.ts");
export const UserDataPath = resolve(NetInterfaceDir, "userdata/IUserData.d.ts");
export const UserDataEventPath = resolve(__workname, "src/core/userData/UserDataEvent.ts");

export const MODIFY_TIP = "/** This script is generated automatically, Please do not any modify! */\r";