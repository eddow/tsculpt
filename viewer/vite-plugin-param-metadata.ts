import { Project, SyntaxKind } from 'ts-morph'
import { Plugin } from 'vite'

function givenConstant(value: any) {
	const text = typeof value === 'string' ? value : value.getText()
	try {
		// biome-ignore lint/security/noGlobalEval: From coder to coder
		return (0, eval)(text)
	} catch (e) {
		return { raw: text }
	}
}

export default function paramMetadataInjector(): Plugin {
	return {
		name: 'vite-plugin-param-metadata',
		enforce: 'pre',
		async transform(code, id) {
			if (!id.endsWith('.sculpt.ts') && !id.endsWith('sphere.ts')) return

			const project = new Project()
			const sourceFile = project.createSourceFile('sculpt.ts', code, { overwrite: true })

			const exportedFns = sourceFile.getFunctions().filter((fn) => fn.isExported())

			for (const fn of exportedFns) {
				const fnName = fn.getName()
				const params = fn.getParameters()
				if (!params.length) continue

				const firstParam = params[0]
				const metadata: Record<string, any> = {}

				const bindingPattern = firstParam.getNameNode().asKind(SyntaxKind.ObjectBindingPattern)
				if (!bindingPattern) continue

				const elements = bindingPattern.getElements()
				for (const el of elements) {
					const name = el.getName()
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
						metadata[name] = thisParam
					}
				}

				if (Object.keys(metadata).length > 0) {
					const insertText = `\n${fnName}.params = ${JSON.stringify(metadata, null, 2)};\n`
					code += insertText
				}
			}

			return code
		},
	}
}
