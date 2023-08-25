import BuildConfig from "./BuildConfig";
import { GetTemplateContent } from "./Utils";

export default class BuildServerConfig extends BuildConfig {
    cfgMgrTemplate = GetTemplateContent("ServerCfgMgr");
}
