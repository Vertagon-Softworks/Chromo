'use babel';

import { CompositeDisposable, DisplayMarkerLayer} from 'atom';
import {ColorNames} from './color-names';

export default {

  colorPreviewView: null,
  modalPanel: null,
  subscriptions: null,
  marketLayer: null,
  editor: null,
  gutter: null,
  isActive: true,
  decorations: [],

  activate(state) {
    this.assignRegex();
    this.isActive = state.isActive;

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'color-preview:toggle': () => this.toggle()
    }));

    this.editor = atom.workspace.getActiveTextEditor();
    this.markerLayer = this.editor.addMarkerLayer({id: "vertagon_layer"});
    this.gutter = this.editor.addGutter({name: 'vertagon_gutter', priority: '100', type: 'decorated'});

    this.applyColors();

    this.editor.onDidChange(() => {
      this.applyColors();
    });

    atom.workspace.observeActivePaneItem((pane) => {
        if(pane.constructor.name === 'TextEditor') {
          try {
              if(this.gutter) this.gutter.destroy();
              if(this.markerLayer) this.markerLayer.destroy();
              this.editor = atom.workspace.getActiveTextEditor();
              this.markerLayer = this.editor.addMarkerLayer({id: "vertagon_layer"});
              this.gutter = this.editor.addGutter({name: 'vertagon_gutter', priority: '100', type: 'decorated'});
              this.applyColors();
              this.editor.onDidChange(() => {
                this.applyColors();
              });
            } catch(exception){
              console.log(exception)
            }
        }
      })

      if(!this.isActive) this.gutter.hide();

  },

  deactivate() {
    this.modalPanel.destroy();
    this.markerLayer.destroy();
    this.gutter.destroy();
    this.subscriptions.dispose();
    this.colorPreviewView.destroy();
  },

  serialize() {
    return {
      isActive: this.isActive
    };
  },

  clearDecorations(){
    this.decorations.forEach((item) => {
      item.destroy();
    })
    this.decorations = [];
  },

  assignRegex(){
    ColorNames.forEach((color) => {
      let regex = new RegExp("(\\b|\\W)" + color.name +"(\\b|\\W)", "gi")
      color.regex = regex;
    });
  },

  addColorDecorator(color, range){
    let item = document.createElement('div');
    item.classList.add('color-preview');
    item.style.cssText = "background-color: " + color;
    let deco = this.gutter.decorateMarker(this.markerLayer.markBufferRange(range, {}), {type: 'gutter', class: 'color-preview', item: item});
    this.decorations.push(deco);
  },

  applyColors(){
    this.clearDecorations();
    this.editor.scan(/([#][0-9a-fA-F]{3,6}) ?/gi, (obj) => {
      this.addColorDecorator(obj.match[1], obj.range);
    });
    this.editor.scan(/(rgb[a]?[(] ?[0-9]{1,3} ?, ?[0-9]{1,3} ?, ?[0-9]{1,3} ?(, ?[0-1](\.[0-9]{1,3})?)? ?[)]) ?/gi, (obj) => {
      this.addColorDecorator(obj.match[1], obj.range);
    });
    ColorNames.forEach((color) => {
      this.editor.scan(color.regex, (obj) => {
        this.addColorDecorator(color.code, obj.range);
      })
    });
  },

  toggle() {

    this.isActive = !this.isActive;

    if(this.isActive){
      this.gutter.show();
    } else {
      this.gutter.hide();
    }

  }

};
