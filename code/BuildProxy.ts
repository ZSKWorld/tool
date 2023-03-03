import BuildView from "./BuildView";
import { UiDir } from "./Const";

export class BuildProxy extends BuildView {
    protected buildFilter = [
        { sign: "UI", funcs: [  this.BuildProxy ] },
        { sign: "Com", funcs: [  this.BuildProxy ], subDir: "Coms" },
    ];
    

    doBuild() {
        this.CheckBuild(UiDir);
        this.BuildViewRegister();
    }
}