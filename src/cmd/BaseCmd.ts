import { getLanguageType } from "../arkfbp";
import JavascriptCmd from "./JavascriptCmd";
import * as vscode from 'vscode';
import PythonCmd from "./PythonCmd";
import TypescriptCmd from "./TypescriptCmd";

export default abstract class BaseCmd {
  protected static  _instance:BaseCmd;
  static get instance():BaseCmd{
    switch(getLanguageType()){
      case 'javascript':
        BaseCmd._instance = new JavascriptCmd();
        break;
      case 'typescript':
        BaseCmd._instance = new TypescriptCmd();
        break;
      case 'python':
        BaseCmd._instance = new PythonCmd();
        break;
    }
    return BaseCmd._instance;
  }

  abstract create(workspaceRoot: string, terminal?: vscode.Terminal);
}