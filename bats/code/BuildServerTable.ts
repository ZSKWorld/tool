import ExportTable from "./BuildTable";
import { GetTemplateContent } from "./Utils";

export default class ExportServerTable extends ExportTable {
    tableMgrTemplate = GetTemplateContent("TableMgr_Server");
}



