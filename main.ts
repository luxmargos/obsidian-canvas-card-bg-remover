import { App, Plugin, PluginManifest, PluginSettingTab, Setting, ToggleComponent } from 'obsidian';

// Remember to rename these classes and interfaces!


type EmbedNodeType = 'image-embed'|'canvas-embed'|'markdown-embed';
type EmbedNodeTypeDisplay = 'Image'|'Canvas'|'Markdown';

const PluginStyleId = 'plugin-canvas-card-bg-remover';

interface Embed {
	type:EmbedNodeType;
	display:EmbedNodeTypeDisplay;
}

interface MyPluginSettings {
	isEnabled:boolean;
	applyAllEmbed:boolean;
	targets:Embed[];
}

const ImageNode:Embed = {
	type:'image-embed',
	display:'Image'
}

const CanvasNode:Embed = {
	type:'canvas-embed',
	display:'Canvas'
}

const MarkdownNode:Embed = {
	type:'markdown-embed',
	display:'Markdown'
}

const AllEmbeds = [ImageNode, CanvasNode, MarkdownNode];

const DEFAULT_SETTINGS: MyPluginSettings = {
	isEnabled:true,
	applyAllEmbed:false,
	targets:[ImageNode, CanvasNode]
}

const buildStyle = function(nodeType:EmbedNodeType | '', applyNormal:boolean, applyFocus:boolean, applyHover:boolean) {
	let result = '';
	const nodeTypeClass = nodeType && nodeType.length > 0 ? `.${nodeType}`:'';
	const nodeTypeText = nodeType && nodeType.length > 0 ? `.${nodeType}`:'ALL';
	if(applyNormal){
		const styleText = `
		/* ${nodeTypeText}: Normal State */
		.canvas-node:not(.is-focused):not(:hover):has(.canvas-node-content${nodeTypeClass}) .canvas-node-container{
			background-color: transparent;
			border-color: transparent;
			box-shadow: none;
		}
		
		.canvas-node:not(.is-focused):not(:hover):has(.canvas-node-content${nodeTypeClass}) .canvas-node-content{
			background-color: transparent;
		}
		`;

		result = `${result}\n${styleText}`;
	}

	if(applyFocus){
		const styleText = `
		/* ${nodeTypeText}: Focus State */
		.canvas-node.is-focused:has(.canvas-node-content${nodeTypeClass}) .canvas-node-container{
			background-color: transparent;
		}
		
		.canvas-node.is-focused:has(.canvas-node-content${nodeTypeClass}) .canvas-node-content{
			background-color: transparent;
		}
		`;
		result = `${result}\n${styleText}`;
	}

	if(applyHover){
		const styleText = `
		/* ${nodeTypeText}: Hover State */
		.canvas-node:hover:has(.canvas-node-content${nodeTypeClass}) .canvas-node-container{
			background-color: transparent;
		}

		.canvas-node:hover:has(.canvas-node-content${nodeTypeClass}) .canvas-node-content{
			background-color: transparent;
		}
		`;
		result = `${result}\n${styleText}`;
	}
	return result;
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	constructor(app: App, manifest: PluginManifest){
		super(app, manifest);
	}

	getGlobalStyleEl():HTMLElement{
		let found:HTMLElement | null = document.head.querySelector(`#${PluginStyleId}`);
		if(found){
			return found;
		}

		found = document.createElement('style');
		found.setAttribute('type', 'text/css');
		found.setAttribute('id', PluginStyleId);
		document.head.appendChild(found);

		return found;
	}

	clearStyle(){
		var styleEl:HTMLElement = this.getGlobalStyleEl();
		styleEl.innerHTML = '';
	}

	generateStyle(targets:Embed[]){
		var styleEl:HTMLElement = this.getGlobalStyleEl();
		var innerHtml:string = '';
		if(this.settings.applyAllEmbed){
			innerHtml = `${innerHtml}\n${buildStyle('', true,true,true)}`;
		}else{
			for(const target of targets){
				innerHtml = `${innerHtml}\n${buildStyle(target.type, true,true,true)}`;
			}
		}
		
		styleEl.innerHTML = innerHtml;
	}

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MySettingsTab(this.app, this));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		this.applySettings();

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'canvas-sub-styler-enable',
			name: 'Turn on',
			callback:()=>{
				this.settings.isEnabled = true;
				this.saveAndReload();
			}
		});
		this.addCommand({
			id: 'canvas-sub-styler-disable',
			name: 'Turn off',
			callback:()=>{
				this.settings.isEnabled = false;
				this.saveAndReload();
			}
		});
	}

	async applySettings(){
		this.clearStyle();

		if(this.settings.isEnabled){
			this.generateStyle(this.settings.targets);
		}
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

class MySettingsTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
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

		
		const globalSet = new Setting(containerEl);
		globalSet.setName("Settings");

		const setEnabled = new Setting(containerEl);
		setEnabled.setName("Enabled");
		setEnabled.setDesc("Toggle enables of plugin feature")
		setEnabled.addToggle((comp:ToggleComponent)=>{
			comp.setValue(p.settings.isEnabled);	
			comp.onChange((value:boolean)=>{
				p.settings.isEnabled = value;
				p.saveAndReload();
			});
		});

		const targetSet = new Setting(containerEl);
		targetSet.setName("Cards");

		const applyAll = new Setting(containerEl);
		applyAll.setName("Apply to All Cards");
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
