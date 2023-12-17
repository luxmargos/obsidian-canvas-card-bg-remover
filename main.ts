import { App, Plugin, PluginManifest, PluginSettingTab, Setting, ToggleComponent } from 'obsidian';
import { CCBgRemoverPluginContext } from 'plugin_context';

// Remember to rename these classes and interfaces!


type EmbedNodeType = 'image-embed'|'canvas-embed'|'markdown-embed';
type EmbedNodeTypeDisplay = 'Image'|'Canvas'|'Markdown';


const CSSClassAll = 'ccbgrm-plugin';
const CSSClassImage = 'ccbgrm-plugin-img';
const CSSClassCanvas = 'ccbgrm-plugin-cnvs';
const CSSClassMarkdown = 'ccbgrm-plugin-md';

interface Embed {
	type:EmbedNodeType;
	display:EmbedNodeTypeDisplay;
	cls:string;
}

interface CCBgRemoverPluginSettings {
	applyAllEmbed:boolean;
	targets:Embed[];
}

const CSSClassMap:Record<EmbedNodeType,string> = {
	'image-embed':CSSClassImage,
	'canvas-embed':CSSClassCanvas,
	'markdown-embed':CSSClassMarkdown
};

const ImageNode:Embed = {
	type:'image-embed',
	display:'Image',
	cls:CSSClassImage
}

const CanvasNode:Embed = {
	type:'canvas-embed',
	display:'Canvas',
	cls:CSSClassCanvas
}

const MarkdownNode:Embed = {
	type:'markdown-embed',
	display:'Markdown',
	cls:CSSClassMarkdown
}

const AllEmbeds = [ImageNode, CanvasNode, MarkdownNode];

const DEFAULT_SETTINGS: CCBgRemoverPluginSettings = {
	applyAllEmbed:false,
	targets:[ImageNode, CanvasNode]
}

export default class CCBgRemoverPlugin extends Plugin {
	settings: CCBgRemoverPluginSettings;
	context: CCBgRemoverPluginContext;

	constructor(app: App, manifest: PluginManifest){
		super(app, manifest);
	}

	clearStyle(){
		this.app.workspace.containerEl.removeClasses([
			CSSClassAll,
			CSSClassImage,
			CSSClassCanvas,
			CSSClassMarkdown,
		]);
	}

	generateStyle(){
		if(this.settings.applyAllEmbed){
			this.app.workspace.containerEl.addClass(CSSClassAll);
		}else{
			const clsList = this.settings.targets.map((item:Embed)=>{
				return item.cls ? item.cls : CSSClassMap[item.type]}
			);
			this.app.workspace.containerEl.addClasses(clsList);
		}
	}

	async onload() {
		this.context = { plugin: this };

		await this.loadSettings();
		
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new CCBgRemoverPluginSettingsTab(this.app, this));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		this.applySettings();
	}
	
	async applySettings(){
		this.clearStyle();
		this.generateStyle();
	}
	
	onunload() {
		this.clearStyle();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	saveAndReload() {
		this.saveSettings().then(()=>{
			this.applySettings();
		}, ()=>{});
	}
}

class CCBgRemoverPluginSettingsTab extends PluginSettingTab {
	plugin: CCBgRemoverPlugin;

	constructor(app: App, plugin: CCBgRemoverPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	allTargetFields:Setting[];

	_refreshTargetFields():void{
		const p = this.plugin;
		if(p.settings.applyAllEmbed){
			for(const field of this.allTargetFields){
				field.setDisabled(true);
				field.settingEl.style.setProperty('savedDisplay',field.settingEl.style.display);
				field.settingEl.style.display = 'none';
				
			}
		}else{
			for(const field of this.allTargetFields){
				field.setDisabled(false);
				field.settingEl.style.display = field.settingEl.style.getPropertyValue('savedDisplay');
			}
		}
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		const p = this.plugin;

		const targetSet = new Setting(containerEl);
		targetSet.setName("Cards");

		const applyAll = new Setting(containerEl);
		applyAll.setName("Apply to all cards");
		applyAll.addToggle((comp:ToggleComponent)=>{
			comp.setValue(p.settings.applyAllEmbed);
			comp.onChange((value:boolean)=>{
				p.settings.applyAllEmbed = value;
				this._refreshTargetFields();
				p.saveAndReload();
			});
		});

		this.allTargetFields = [];
		for(const target of AllEmbeds){
			const isEnabled:boolean = this.hasType(target, p.settings.targets);
			const setting = new Setting(containerEl);
			setting.setName(target.display);
			setting.addToggle((comp:ToggleComponent)=>{
				comp.setValue(isEnabled);
				comp.onChange((value:boolean)=>{
					if(value){
						if(!this.hasType(target, p.settings.targets)){
							p.settings.targets.push(target);
							p.saveAndReload();
						}
					}else{
						if(this.hasType(target, p.settings.targets)){
							p.settings.targets.splice(this.indexInArr(target, p.settings.targets),1);
							p.saveAndReload();
						}
					}
				});
			});
			this.allTargetFields.push(setting);
		}

		this._refreshTargetFields();

		const labelsDesc = new Setting(containerEl);
		labelsDesc.setName("How to change the label's visibility");
		labelsDesc.setDesc("Change it in the Settings > Canvas > Display Card Label");
	}

	hasType(target:Embed, arr:Embed[]): boolean {
		return this.indexInArr(target, arr) >= 0;
	}

	indexInArr(target:Embed, arr:Embed[]): number {
		return arr.findIndex((value,index)=>{
			return value.type === target.type
		});
	}
}


