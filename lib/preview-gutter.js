"use babel";
import { ColorNames } from "./color-names";
import { TerminalColors } from "./xterm-colors";
import { convertAnsiToRGB } from "./color-utils";

class PreviewGutter {
  editor;
  markerLayer;
  gutter;
  typeEvent;
  changeEvent;
  decorations;

  constructor(editor) {
    this.decorations = [];
    this.editor = editor
    this.markerLayer = editor.addMarkerLayer({ id: "vertagon_layer" });
    this.gutter = this.editor.addGutter({
      name: "vertagon_gutter_" + editor.id,
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
  }

  isAttachedTo(editor) {
    return this.editor === editor;
  }

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
  }

  eliminateRowCollision(range) {
    this.decorations.forEach(deco => {
      if (range.intersectsWith(deco.getMarker().getBufferRange())) {
        deco.destroy();
      }
    });
  }

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
  }

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
      this.editor.scanInBufferRange(color.name, range, obj => {
        this.addColorDecorator(color.code, obj.range);
      });
    });
    this.editor.scanInBufferRange(
      /(repeating-)?((linear-gradient)|(radial-gradient))[(] *[a-z0-9#,% \-]* *[)]/gi,
      range,
      obj => {
        this.addImageDecorator(obj.match[0], obj.range);
      }
    );
  }

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
        this.editor.scanInBufferRange(color.regex, obj.range, match => {
          this.addColorDecorator(color.code, match.range);
        });
      });
    });
    this.editor.scan(
      /(repeating-)?((linear-gradient)|(radial-gradient))[(] *[a-z0-9#,% \-]* *[)]/gi,
      obj => {
        this.addImageDecorator(obj.match[0], obj.range);
      }
    );
  }

  show() {
    this.gutter.show();
    this.applyColors();
  }

  hide() {
    this.gutter.hide();
  }

  clearDecorations() {
    this.decorations.forEach(item => {
      item.destroy();
    });
    this.decorations = [];
  }

  destroy() {
    this.clearDecorations();
    if (this.gutter) this.gutter.destroy();
    if (this.markerLayer) this.markerLayer.destroy();
    if (this.changeEvent) this.changeEvent.dispose();
    if (this.typeEvent) this.typeEvent.dispose();
  }
}

export default PreviewGutter;
