"use babel";
import { CompositeDisposable, DisplayMarkerLayer } from "atom"
import PreviewGutter from "./preview-gutter"
import {assignRegexToColorNames} from "./color-utils"

export default {
  colorPreviewView: null,
  subscriptions: null,
  isActive: true,
  paneEvent: null,
  previewGutters: [],

  doesEditorHaveColorPreviews(editor){
    return this.previewGutters.find(gutter => gutter.isAttachedTo(editor))
  },

  constructPreviewGutter(editor) {
    const existing = this.doesEditorHaveColorPreviews(editor)
    if(existing) return existing;
    const newGutter = new PreviewGutter(editor);
    this.previewGutters.push(newGutter);
    return newGutter;
  },

  destructPreviewGutter(gutter) {
    this.previewGutters.find(gut => gut === gutter).destroy();
  },

  destructAllPreviewGutters() {
    this.previewGutters().forEach(gutter => gutter.destroy());
  },

  activate(state) {
    this.previewGutters = [];
    assignRegexToColorNames()

    if (state) {
      this.isActive = state.isActive
    }

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(
      atom.commands.add("atom-workspace", {
        "color-preview:toggle": () => this.toggle()
      })
    );

    atom.workspace.getTextEditors().forEach((editor) => {
        try {
          let gutter = this.constructPreviewGutter(editor);
          if (!this.isActive) gutter.hide();
        } catch (e) {
          console.warn('Unable to construct a new color-preview gutter!\n',e);
        }
      })

    // When we switch editor panes, make sure if its a new one to add
    // color previews to it
    this.paneEvent = atom.workspace.observeActivePaneItem(pane => {
      if (pane && pane.constructor.name === "TextEditor") {
        try {
          let editor = atom.workspace.getActiveTextEditor();
          let gutter = this.constructPreviewGutter(editor);
          if (!this.isActive) gutter.hide();
        } catch (e) {
          console.warn('Unable to construct a new color-preview gutter!\n',e);
        }
      }
    });

  },

  deactivate() {
    this.destructAllPreviewGutters()
    if (this.paneEvent) this.paneEvent.dispose();
    if (this.subscriptions) this.subscriptions.dispose();
    if (this.colorPreviewView) this.colorPreviewView.destroy();
  },

  serialize() {
    return {
      isActive: this.isActive
    };
  },

  toggle() {
    this.isActive = !this.isActive;

    if (this.isActive) {
      this.previewGutters.forEach(gutter => gutter.show())
    } else {
      this.previewGutters.forEach(gutter => gutter.hide())
    }
  }
};
