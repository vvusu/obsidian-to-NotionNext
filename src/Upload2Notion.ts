import { App, Notice, requestUrl, TFile } from "obsidian";
import { Client } from '@notionhq/client';
import { markdownToBlocks, } from "@tryfabric/martian";
import * as yamlFrontMatter from "yaml-front-matter";
// import * as yaml from "yaml"
import MyPlugin from "src/main";

export class Upload2Notion {
	plugin: MyPlugin;
	notion: Client;
	agent: any;
	constructor(plugin: MyPlugin) {
		this.plugin = plugin;
	}

	async deletePage(notionID: string) {
		return requestUrl({
			url: `https://api.notion.com/v1/blocks/${notionID}`,
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + this.plugin.settings.notionAPI,
				'Notion-Version': '2022-06-28',
			},
			body: ''
		});
	}

	async getDataBase(databaseID: string) {
		const response = await requestUrl({
			url: `https://api.notion.com/v1/databases/${databaseID}`,
			method: 'GET',
			headers: {
				'Authorization': 'Bearer ' + this.plugin.settings.notionAPI,
				'Notion-Version': '2022-06-28',
			}
		}
		)

		// Check if cover is present in the JSON response and then get the URL
		if (response.json.cover && response.json.cover.external) {
			return response.json.cover.external.url;
		} else {
			return null;  // or some other default value, if you prefer
		}
	}

	// 因为需要解析notion的block进行对比，非常的麻烦，
	// 暂时就直接删除，新建一个page
	async updatePage(notionID: string, title: string, emoji: string, cover: string, tags: string[], type: string, slug: string, stats: string, category: string, summary: string, paword: string, favicon: string, datetime: string, childArr: any) {
		await this.deletePage(notionID)

		const databasecover = await this.getDataBase(this.plugin.settings.databaseID)

		if (cover == null) {
			cover = databasecover
		}

		return await this.createPage(title,
			emoji,
			cover,
			tags,
			type,
			slug,
			stats,
			category,
			summary,
			paword,
			favicon,
			datetime,
			childArr)
	}

	async createPage(title: string, emoji: string, cover: string, tags: string[], type: string, slug: string, stats: string, category: string, summary: string, pawrod: string, favicon: string, datetime: string, childArr: any) {
		const bodyString: any = {
			parent: {
				database_id: this.plugin.settings.databaseID
			},
			icon: {
				emoji: emoji || '📜'
			},
			properties: {
				title: {
					title: [
						{
							text: {
								content: title
							},
						},
					],
				},
				tags: {
					multi_select: tags && true ? tags.map(tag => {
						return { "name": tag }
					}) : [],
				},
				type: {
					select: {
						name: type || 'Post'
					}
				},
				slug: {
					rich_text: [
						{
							text: {
								content: slug || ''
							}
						}
					]
				},
				status: {
					select: {
						name: stats || 'Draft'
					}
				},
				category: {
					select: {
						name: category || 'Obsidian'
					}
				},
				summary: {
					rich_text: [
						{
							text: {
								content: summary || ''
							}
						}
					]
				},
				password: {
					rich_text: [
						{
							text: {
								content: pawrod || ''
							}
						}
					]
				},
				icon: {
					rich_text: [
						{
							text: {
								content: favicon || ''
							}
						}
					]
				},
				date: {
					date: {
						start: datetime || new Date().toISOString()
					}
				}
			},
			children: childArr,
		}
		if (cover) {
			bodyString.cover = {
				type: "external",
				external: {
					url: cover
				}
			}
		}

		if (!bodyString.cover && this.plugin.settings.bannerUrl) {
			bodyString.cover = {
				type: "external",
				external: {
					url: this.plugin.settings.bannerUrl
				}
			}
		}

		try {
			return await requestUrl({
				url: `https://api.notion.com/v1/pages`,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					// 'User-Agent': 'obsidian.md',
					'Authorization': 'Bearer ' + this.plugin.settings.notionAPI,
					'Notion-Version': '2022-06-28',
				},
				body: JSON.stringify(bodyString),
			})
		} catch (error) {
			new Notice(`network error ${error}`)
		}
	}

	async syncMarkdownToNotion(title: string, emoji: string, cover: string, tags: string[], type: string, slug: string, stats: string, category: string, summary: string, paword: string, favicon: string, datetime: string, markdown: string, nowFile: TFile, app: App, settings: any): Promise<any> {
		let res: any
		const yamlContent: any = yamlFrontMatter.loadFront(markdown);
		const __content = yamlContent.__content
		const file2Block = markdownToBlocks(__content);
		const frontmasster = app.metadataCache.getFileCache(nowFile)?.frontmatter
		const notionID = frontmasster ? frontmasster.notionID : null

		if (notionID) {
			res = await this.updatePage(notionID, title, emoji, cover, tags, type, slug, stats, category, summary, paword, favicon, datetime, file2Block);
		} else {
			res = await this.createPage(title, emoji, cover, tags, type, slug, stats, category, summary, paword, favicon, datetime, file2Block);
		}
		if (res.status === 200) {
			await this.updateYamlInfo(markdown, nowFile, res, app, settings)
		} else {
			new Notice(`${res.text}`)
		}
		return res
	}
	
	async updateYamlInfo(yamlContent: string, nowFile: TFile, res: any, app: App, settings: any) {
		let { url, id } = res.json
		// replace www to notionID
		const { notionID, notionLink } = settings;
		if (notionID !== "") {
			// replace url str "www" to notionID
			url = url.replace("www.notion.so", `${notionID}.notion.site`)
		}
		await app.fileManager.processFrontMatter(nowFile, yamlContent => {
			if (yamlContent['notionID']) {
				delete yamlContent['notionID']
			}
			if (yamlContent['link']) {
				delete yamlContent['link']
			}
			// add new notionID and link 
			yamlContent.notionID = id;
			if (notionLink) {
				yamlContent.link = url;
			} else {
				yamlContent.link = null;
			}
		});

		try {
			await navigator.clipboard.writeText(url)
		} catch (error) {
			new Notice(`复制链接失败，请手动复制${error}`)
		}
		// const __content = yamlContent.__content;
		// delete yamlContent.__content
		// const yamlhead = yaml.stringify(yamlContent)
		// //  if yamlhead hava last \n  remove it
		// const yamlhead_remove_n = yamlhead.replace(/\n$/, '')
		// // if __content have start \n remove it
		// const __content_remove_n = __content.replace(/^\n/, '')
		// const content = '---\n' +yamlhead_remove_n +'\n---\n' + __content_remove_n;
		// try {
		// 	await nowFile.vault.modify(nowFile, content)
		// } catch (error) {
		// 	new Notice(`write file error ${error}`)
		// }
	}
}
