import { writeFileSync } from 'fs';
import { join } from 'path';
import { MarkdownEvent } from 'typedoc';

export interface DoctestRecord {
	sourceFileUrl: string;
	testHtml: string;
}

export default class DoctestHandler {
	private doctests: DoctestRecord[] = [];
	public constructor() {}

	public addDoctestFromEvent(doctestHtml: string, event: MarkdownEvent) {
		this.doctests.push({
			testHtml: doctestHtml,
			sourceFileUrl: event.page.url,
		});
	}

	public render(outputFilepath: string) {
		const baseUrl = '../';
		writeFileSync(
			outputFilepath,
			`<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
					<meta charset="utf-8"/>
					<script>
						window.assetsURL = './';
						window.baseURL = ${JSON.stringify(baseUrl)};
					</script>
					<script src="./js-draw-typedoc-extension--browser.js"></script>
					<style>
						:root {
							font-family: sans;
						}

						main {
							max-width: 600px;
							margin-left: auto;
							margin-right: auto;
						}
					</style>
				</head>
				<body>
					<main>
						<h1>All examples</h1>
						<p>
							This page contains an index of all runnable examples in the main
							<a href=${JSON.stringify(baseUrl)}>documentation</a>. Additional
							examples can be found
							<a href="https://github.com/personalizedrefrigerator/js-draw/tree/main/docs/examples">on GitHub</a>.
						</p>
						<p>
							Part of the goal of this page is to easily find broken examples.
						</p>
						${this.doctests
							.map(
								(test, index) => `
								<h2>Example ${index + 1}</h2>
								<div>
									<p>
										From page: <a href=${JSON.stringify(join('../', test.sourceFileUrl))}>${test.sourceFileUrl}</a>
									</p>
									${test.testHtml}
								</div>
							`,
							)
							.join('')}
					</main>
				</body>
			</html>
		`,
		);
	}
}
