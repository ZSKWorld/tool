import BuildTable from "./BuildTable";
import { GetTemplateContent } from "./Utils";

export default class ExportServerTable extends BuildTable {
    tableMgrTemplate = GetTemplateContent("TableMgr_Server");
}



