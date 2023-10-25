import {
	App,
	Editor,
	MarkdownView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import { addIcons } from "src/icon";
import { Upload2Notion } from "src/Upload2Notion";
import { NoticeMConfig } from "src/Message";

// Remember to rename these classes and interfaces!

interface PluginSettings {
	notionAPI: string;
	databaseID: string;
	bannerUrl: string;
	notionID: string;
	proxy: string;
	allowTags: boolean;
	notionLink: boolean;
}

const langConfig = NoticeMConfig(
	window.localStorage.getItem("language") || "en"
);

const DEFAULT_SETTINGS: PluginSettings = {
	notionAPI: "",
	databaseID: "",
	bannerUrl: "",
	notionID: "",
	proxy: "",
	allowTags: false,
	notionLink: false,
};

export default class ObsidianSyncNotionPlugin extends Plugin {
	settings: PluginSettings;
	async onload() {
		await this.loadSettings();
		addIcons();
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"notion-logo",
			"Share to NotionNext",
			async (evt: MouseEvent) => {
				// Called when the user clicks the icon.
				await this.upload();
			}
		);

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText("share to notion");

		this.addCommand({
			id: "share-to-notionnext",
			name: "share to notionnext",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.upload();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ObsidianSettingTab(this.app, this));
	}

	onunload() {}

	async upload() {
		const { notionAPI, databaseID, allowTags } = this.settings;
		if (notionAPI === "" || databaseID === "") {
			new Notice(
				"Please set up the notion API and database ID in the settings tab."
			);
			return;
		}
		const {
			markDownData,
			nowFile,
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
		} = await this.getNowFileMarkdownContent(this.app);

		if (markDownData) {
			const { basename } = nowFile;
			const upload = new Upload2Notion(this);
			const res = await upload.syncMarkdownToNotion(
				basename,
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
				markDownData,
				nowFile,
				this.app,
				this.settings
			);
			if (res.status === 200) {
				new Notice(`${langConfig["sync-success"]}${basename}`);
			} else {
				new Notice(`${langConfig["sync-fail"]}${basename}`, 5000);
			}
		}
	}

	async getNowFileMarkdownContent(app: App) {
		const nowFile = app.workspace.getActiveFile();
		const { allowTags } = this.settings;
		let emoji = "";
		let cover = "";
		let tags = [];
		let type = "";
		let slug = "";
		let stats = "";
		let category = "";
		let summary = "";
		let paword = "";
		let favicon = "";
		let datetime = "";

		const FileCache = app.metadataCache.getFileCache(nowFile);
		try {
			if (allowTags) {
				emoji = FileCache.frontmatter.titleicon;
				cover = FileCache.frontmatter.coverurl;
				tags = FileCache.frontmatter.tags;
				type = FileCache.frontmatter.type;
				slug = FileCache.frontmatter.slug;
				stats = FileCache.frontmatter.stats;
				category = FileCache.frontmatter.category;
				summary = FileCache.frontmatter.summary;
				paword = FileCache.frontmatter.password;
				favicon = FileCache.frontmatter.icon;
				datetime = FileCache.frontmatter.date;
			}
		} catch (error) {
			new Notice(langConfig["set-tags-fail"]);
		}
		if (nowFile) {
			const markDownData = await nowFile.vault.read(nowFile);
			return {
				markDownData,
				nowFile,
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
			};
		} else {
			new Notice(langConfig["open-file"]);
			return;
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ObsidianSettingTab extends PluginSettingTab {
	plugin: ObsidianSyncNotionPlugin;

	constructor(app: App, plugin: ObsidianSyncNotionPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Notion API Token")
			.setDesc("It's a secret")
			.addText((text) => {
				text.inputEl.type = "password";
				return text
					.setPlaceholder("Enter your Notion API Token")
					.setValue(this.plugin.settings.notionAPI)
					.onChange(async (value) => {
						this.plugin.settings.notionAPI = value;
						await this.plugin.saveSettings();
					});
			});

		const notionDatabaseID = new Setting(containerEl)
			.setName("Database ID")
			.setDesc("It's a secret")
			.addText((text) => {
				text.inputEl.type = "password";
				return text
					.setPlaceholder("Enter your Database ID")
					.setValue(this.plugin.settings.databaseID)
					.onChange(async (value) => {
						this.plugin.settings.databaseID = value;
						await this.plugin.saveSettings();
					});
			});

		// notionDatabaseID.controlEl.querySelector('input').type='password'

		new Setting(containerEl)
			.setName("Banner url(optional)")
			.setDesc(
				"page banner url(optional), default is empty, if you want to show a banner, please enter the url(like:https://raw.githubusercontent.com/EasyChris/obsidian-to-notion/ae7a9ac6cf427f3ca338a409ce6967ced9506f12/doc/2.png)"
			)
			.addText((text) =>
				text
					.setPlaceholder("Enter banner pic url: ")
					.setValue(this.plugin.settings.bannerUrl)
					.onChange(async (value) => {
						this.plugin.settings.bannerUrl = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Notion ID(optional)")
			.setDesc(
				"Your notion ID(optional),share link likes:https://username.notion.site/,your notion id is [username]"
			)
			.addText((text) =>
				text
					.setPlaceholder("Enter notion ID(options) ")
					.setValue(this.plugin.settings.notionID)
					.onChange(async (value) => {
						this.plugin.settings.notionID = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Notion Link(optional)")
			.setDesc("Add Your notion Link(optional)")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.notionLink)
					.onChange(async (value) => {
						this.plugin.settings.notionLink = value;
						await this.plugin.saveSettings();
					})
			);

		// new Setting(containerEl)
		// .setName("Convert tags(optional)")
		// .setDesc("Transfer the Obsidian tags to the Notion table. It requires the column with the name 'Tags'")
		// .addToggle((toggle) =>
		// 	toggle
		// 		.setValue(this.plugin.settings.allowTags)
		// 		.onChange(async (value) => {
		// 			this.plugin.settings.allowTags = value;
		// 			await this.plugin.saveSettings();
		// 		})
		// );
	}
}
