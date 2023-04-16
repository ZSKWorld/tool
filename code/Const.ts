import { resolve } from "path";

export const __workname = process.cwd();

export const ResDir = resolve(__workname, "bin/res");
export const UiDir = resolve(__workname, "src/core/ui/ui");
export const ViewDir = resolve(__workname, "src/core/ui/view");
export const ViewCtrlDir = resolve(__workname, "src/core/ui/viewCtrl");
export const ViewProxyDir = resolve(__workname, "src/core/ui/viewProxy");
export const ResPathPath = resolve(__workname, "src/core/common/ResPath.ts");
export const ResPathPathNoExt = resolve(__workname, "src/core/common/ResPath");
export const ViewIDPath = resolve(__workname, "src/core/ui/core/ViewID.ts");
export const ViewRegisterPath = resolve(__workname, "src/core/ui/core/ViewRegister.ts");
export const xlsxDir = resolve(__workname, "../策划");
export const TableDataPath = resolve(__workname, "bin/res/table/Config.json");
export const TablesCfgDir = resolve(__workname, "src/core/table");
export const TableStructTypePath = resolve(__workname, "src/core/table/TableStructTypes.d.ts");
export const LangPath = resolve(__workname, "src/core/table/LangCode.ts");

export const UserDataDir = resolve(__workname, "src/core/userData");
export const UserDataInterfaceDir = resolve(__workname, "src/core/userData/interface");
export const UserDataEventPath = resolve(UserDataDir, "UserDataEvent.ts");

export const MODIFY_TIP = "/** This script is generated automatically, Please do not any modify! */\r";