import * as fs from 'fs';
import * as babel from '@babel/core';
import * as babelTypes from "@babel/types"

export function updateFile(path: string, node: {
  id: string,
  cls: string,
  filename: string,
  next?: string,
}) {
  debugger
  const code = fs.readFileSync(path).toString();
  const result = babel.transform(code, {
      plugins: [
          myImportInjector,
          myImportInjector2,
      ],
  });

  debugger

  function myImportInjector({ type, template }: { type: any, template: any}) {
    debugger
    const myImport = template(`import { ${node.cls} } from "./nodes/${node.filename}";`, { sourceType: "module" });
    return {
        visitor: {
            Program(path: any, state: any) {
                const lastImport = path.get("body").filter((p: any) => p.isImportDeclaration()).pop();
                if (lastImport) {
                    lastImport.insertAfter(myImport());
                }

            },
        },
    };
  }

  function myImportInjector2({ types, template }: {types: any, template: any}) {
    debugger
    return {
        visitor: {
            ClassMethod(path: any, state: any) {
                if (path.node.key.name === 'createNodes') {
                    const returnStatement = path.node.body.body[0];
                    const arrayExpression = returnStatement.argument as babelTypes.ArrayExpression;
                    const o1 = babelTypes.objectProperty(babelTypes.identifier('cls'), babelTypes.identifier(node.cls));
                    const o2 = babelTypes.objectProperty(babelTypes.identifier('id'), babelTypes.stringLiteral(node.id));
                    const o3 = babelTypes.objectProperty(babelTypes.identifier('x'), babelTypes.numericLiteral(30));
                    const o4 = babelTypes.objectProperty(babelTypes.identifier('y'), babelTypes.numericLiteral(30));
                    arrayExpression.elements.push(
                        babelTypes.objectExpression([o1, o2, o3, o4])
                    );
                }
            }
        },
    };
  }

  if (result){
    fs.writeFileSync(path, result.code);
  } 
}