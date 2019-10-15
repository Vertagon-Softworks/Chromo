"use babel";

import { CompositeDisposable, DisplayMarkerLayer } from "atom";
import { ColorNames } from "./color-names";
import { TerminalColors } from "./xterm-colors";

export default {
  colorPreviewView: null,
  modalPanel: null,
  subscriptions: null,
  marketLayer: null,
  editor: null,
  gutter: null,
  isActive: true,
  changeEvent: null,
  typeEvent: null,
  paneEvent: null,
  decorations: [],

  activate(state) {
    this.assignRegex();

    if (state) {
      this.isActive = state.isActive;
    }

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(
      atom.commands.add("atom-workspace", {
        "color-preview:toggle": () => this.toggle()
      })
    );

    try {
      this.editor = atom.workspace.getActiveTextEditor();
      this.markerLayer = this.editor.addMarkerLayer({ id: "vertagon_layer" });
      this.gutter = this.editor.addGutter({
        name: "vertagon_gutter",
        priority: "100",
        type: "decorated"
      });
      this.applyColors();
      this.typeEvent = this.editor.onDidChange(() => {
        let range = this.editor.getSelectedBufferRange();
        if (range) {
          range.start.column = 0;
          this.applyColorsToRange(range);
        }
      });
      this.changeEvent = this.editor.onDidStopChanging(() => {
        this.applyColors();
      });
      if (!this.isActive) this.gutter.hide();
    } catch (e) {
      //nothing for now
    }

    this.paneEvent = atom.workspace.observeActivePaneItem(pane => {
      if (pane && pane.constructor.name === "TextEditor") {
        try {
          if (this.gutter) this.gutter.destroy();
          if (this.markerLayer) this.markerLayer.destroy();
          if (this.changeEvent) this.changeEvent.dispose();
          if (this.typeEvent) this.typeEvent.dispose();
          this.editor = atom.workspace.getActiveTextEditor();
          this.markerLayer = this.editor.addMarkerLayer({
            id: "vertagon_layer"
          });
          this.gutter = this.editor.addGutter({
            name: "vertagon_gutter",
            priority: "100",
            type: "decorated"
          });
          this.applyColors();
          this.typeEvent = this.editor.onDidChange(() => {
            if (this.isActive) {
              let range = this.editor.getSelectedBufferRange();
              if (range) {
                range.start.column = 0;
                this.applyColorsToRange(range);
              }
            }
          });
          this.changeEvent = this.editor.onDidStopChanging(() => {
            if (this.isActive) this.applyColors();
          });
        } catch (exception) {
          console.log(exception);
        }
      }
    });
  },

  deactivate() {
    this.clearDecorations();
    if (this.typeEvent) this.typeEvent.dispose();
    if (this.paneEvent) this.paneEvent.dispose();
    if (this.changeEvent) this.changeEvent.dispose();
    if (this.modalPanel) this.modalPanel.destroy();
    if (this.markerLayer) this.markerLayer.destroy();
    if (this.gutter) this.gutter.destroy();
    if (this.subscriptions) this.subscriptions.dispose();
    if (this.colorPreviewView) this.colorPreviewView.destroy();
  },

  serialize() {
    return {
      isActive: this.isActive
    };
  },

  clearDecorations() {
    this.decorations.forEach(item => {
      item.destroy();
    });
    this.decorations = [];
  },

  assignRegex() {
    ColorNames.forEach(color => {
      let regex = new RegExp(
        "(^|(\s+)|\'|\"|\A|[: ])(" + color.name + ")($|(\s+)|\"|\'|\z|[, ;])",
        "gi"
      );
      color.regex = regex;
    });
  },

  addColorDecorator(color, range, prevDeco = null) {
    if (prevDeco) prevDeco.destroy();
    let item = document.createElement("div");
    item.classList.add("color-preview");
    item.style.cssText = "background-color: " + color;
    let deco = this.gutter.decorateMarker(
      this.markerLayer.markBufferRange(range, {}),
      { type: "gutter", class: "color-preview", item: item }
    );
    this.decorations.push(deco);
    return deco;
  },

  eliminateRowCollision(range) {
    this.decorations.forEach(deco => {
      if (range.intersectsWith(deco.getMarker().getBufferRange())) {
        deco.destroy();
      }
    });
  },

  addImageDecorator(image, range) {
    setTimeout(() => {
      this.eliminateRowCollision(range);
      let item = document.createElement("div");
      item.classList.add("color-preview");
      item.style.cssText = "background-image: " + image;
      let deco = this.gutter.decorateMarker(
        this.markerLayer.markBufferRange(range, {}),
        { type: "gutter", class: "color-preview", item: item }
      );
      this.decorations.push(deco);
    }, 50);
  },

  convertAnsiToRGB(colorCode, bold, extension) {
    let code = parseInt(colorCode);
    if (bold === ";1m") code += 8;
    if (extension && colorCode == 8) code = extension;
    if (extension && colorCode != 8) return null;
    return TerminalColors[code];
  },

  applyColorsToRange(range) {
    this.editor.scanInBufferRange(/([#][0-9a-fA-F]{3,6})/gi, range, obj => {
      this.addColorDecorator(obj.match[1], obj.range);
    });
    this.editor.scanInBufferRange(
      /(rgb[a]?[(] *[0-9]{1,3} *, *[0-9]{1,3} *, *[0-9]{1,3} *(, *[0-1]?(\.[0-9]{1,3})?)? *[)])/gi,
      range,
      obj => {
        this.addColorDecorator(obj.match[1], obj.range);
      }
    );
    this.editor.scanInBufferRange(
      /(hsl[a]?[(] ?[0-9]{1,3} ?, *[0-9]{1,3} *[%] *, *[0-9]{1,3} *[%] *(, ?[0-1]?(\.[0-9]{1,3})?)? *[)])/gi,
      range,
      obj => {
        this.addColorDecorator(obj.match[1], obj.range);
      }
    );
    this.editor.scanInBufferRange(
      /\\u001b\[[3-4]([0-8])((m)|([;]1m)|([;]5[;]([0-2]?[0-9]?[0-9])m))/gi,
      range,
      obj => {
        this.addColorDecorator(
          this.convertAnsiToRGB(obj.match[1], obj.match[2], obj.match[6]),
          obj.range
        );
      }
    );
    ColorNames.forEach(color => {
      this.editor.scanInBufferRange(
        color.name,
        range,
        obj => {
          this.addColorDecorator(color.code, obj.range);
        }
      );
    });
    this.editor.scanInBufferRange(
      /(repeating-)?((linear-gradient)|(radial-gradient))[(] *[a-z0-9#,% \-]* *[)]/gi,
      range,
      obj => {
        this.addImageDecorator(obj.match[0], obj.range);
      }
    );
  },

  applyColors() {
    this.clearDecorations();
    this.editor.scan(/([#][0-9a-fA-F]{3,6})/gi, obj => {
      this.addColorDecorator(obj.match[1], obj.range);
    });
    this.editor.scan(
      /(rgb[a]?[(] *[0-9]{1,3} *, *[0-9]{1,3} *, *[0-9]{1,3} *(, *[0-1]?(\.[0-9]{1,3})?)? *[)])/gi,
      obj => {
        this.addColorDecorator(obj.match[1], obj.range);
      }
    );
    this.editor.scan(
      /(hsl[a]?[(] ?[0-9]{1,3} ?, *[0-9]{1,3} *[%] *, *[0-9]{1,3} *[%] *(, ?[0-1]?(\.[0-9]{1,3})?)? *[)])/gi,
      obj => {
        this.addColorDecorator(obj.match[1], obj.range);
      }
    );
    this.editor.scan(
      /\\u001b\[[3-4]([0-8])((m)|([;]1m)|([;]5[;]([0-2]?[0-9]?[0-9])m))/gi,
      obj => {
        this.addColorDecorator(
          this.convertAnsiToRGB(obj.match[1], obj.match[2], obj.match[6]),
          obj.range
        );
      }
    );
    ColorNames.forEach(color => {
      this.editor.scan(color.regex, obj => {
        this.editor.scanInBufferRange(
          color.regex,
          obj.range,
          match => {
            this.addColorDecorator(color.code, match.range);
          }
        );
      });
    });
    this.editor.scan(
      /(repeating-)?((linear-gradient)|(radial-gradient))[(] *[a-z0-9#,% \-]* *[)]/gi,
      obj => {
        this.addImageDecorator(obj.match[0], obj.range);
      }
    );
  },

  toggle() {
    this.isActive = !this.isActive;

    if (this.isActive) {
      this.gutter.show();
    } else {
      this.gutter.hide();
    }
  }
};
