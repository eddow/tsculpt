import { Node, Project, SyntaxKind } from 'ts-morph'
import type {
	ArrowFunction,
	ExportAssignment,
	Expression,
	FunctionDeclaration,
	FunctionExpression,
	SourceFile,
	VariableDeclaration,
} from 'ts-morph'
import { Plugin } from 'vite'
import { metaKey } from '../meta'

function givenConstant(value: any) {
	const text = typeof value === 'string' ? value : value.getText()
	try {
		// biome-ignore lint: From coder to coder
		return (0, eval)(text)
	} catch (e) {
		return { raw: text }
	}
}
function listExports(sourceFile: SourceFile) {
	const out: [string, Expression | Node][] = []
	for (const [name, decls] of sourceFile.getExportedDeclarations()) {
		for (const decl of decls) {
			let value: Expression | Node | undefined

			if (Node.isExportAssignment(decl)) value = (decl as ExportAssignment).getExpression()
			else if (Node.isVariableDeclaration(decl))
				value = (decl as VariableDeclaration).getInitializer() ?? decl
			else value = decl // functions, classes, enums, etc.

			out.push([name, value ?? decl])
		}
	}
	return out // names include "default" for export default
}
export default function paramMetadataInjector(): Plugin {
	return {
		name: 'vite-plugin-param-metadata',
		enforce: 'pre',
		async transform(code, id) {
			if (!id.endsWith('.sculpt.ts')) return

			const project = new Project()
			const sourceFile = project.createSourceFile('sculpt.ts', code, { overwrite: true })

			const exportedFns = Object.fromEntries(
				listExports(sourceFile)
					.map(([name, val]) => {
						const kind = val.getKind()
						return (
							[
								SyntaxKind.FunctionExpression,
								SyntaxKind.ArrowFunction,
								SyntaxKind.FunctionDeclaration,
							].includes(kind) && [name, val.asKind(kind)!]
						)
					})
					.filter(Boolean) as [string, FunctionExpression | ArrowFunction | FunctionDeclaration][]
			)
			const functionsMetadata: Record<string, any> = {}
			for (const fnName in exportedFns) {
				const fn = exportedFns[fnName]
				const params = fn.getParameters()
				if (!params.length) continue

				const firstParam = params[0]
				const parametersMetadata: Record<string, any> = {}

				const bindingPattern = firstParam.getNameNode().asKind(SyntaxKind.ObjectBindingPattern)
				if (!bindingPattern) continue

				const elements = bindingPattern.getElements()
				for (const el of elements) {
					const prop = el.getPropertyNameNode()
					let name: string
					if (!prop) name = el.getName()
					else
						switch (prop.getKind()) {
							case SyntaxKind.StringLiteral:
								name = (prop as import('ts-morph').StringLiteral).getLiteralText()
								break
							case SyntaxKind.NoSubstitutionTemplateLiteral:
								name = (prop as import('ts-morph').NoSubstitutionTemplateLiteral).getLiteralText()
								break
							case SyntaxKind.ComputedPropertyName: {
								const expr = (prop as import('ts-morph').ComputedPropertyName).getExpression()
								const evaluated = givenConstant(expr)
								name =
									typeof evaluated === 'string' ? evaluated : (evaluated?.raw ?? expr.getText())
								break
							}
							default:
								name = prop.getText()
								break
						}

					const initializer = el.getInitializer()
					if (!initializer) continue

					if (initializer.getKind() === SyntaxKind.AsExpression) {
						const asExpr = initializer.asKindOrThrow(SyntaxKind.AsExpression)
						const thisParam: Record<string, any> = {
							default: givenConstant(asExpr.getExpression()),
						}
						const typeNode = asExpr.getTypeNode()
						const typeRef = typeNode?.asKind(SyntaxKind.TypeReference)
						if (typeRef && typeNode!.getKind() === SyntaxKind.TypeReference) {
							const kind = typeRef.getTypeName().getText()
							thisParam.type = kind
							thisParam.args = typeRef.getTypeArguments().map(givenConstant)
						} else if (typeNode?.getKind() === SyntaxKind.UnionType) {
							thisParam.type = 'Union'
							thisParam.args = typeNode
								.getText()
								.split('|')
								.map((t) => givenConstant(t.trim()))
						} else if (typeNode) thisParam.type = typeNode.getText()
						parametersMetadata[name] = thisParam
					}
				}

				if (Object.keys(parametersMetadata).length > 0) {
					functionsMetadata[fnName] = parametersMetadata
				}
			}

			if (Object.keys(functionsMetadata).length > 0) {
				const insertText = `\nexport const ${metaKey} = ${JSON.stringify(functionsMetadata, null, 2)};\n`
				code += insertText
			}

			return code
		},
	}
}
