"use babel";
import { ColorNames } from "./color-names";
import { TerminalColors } from "./xterm-colors";
import {
  convertAnsiToRGB,
  rgbRegex,
  hslRegex,
  ansiRegex,
  hexRegex,
  gradientRegex
} from "./color-utils";

class PreviewGutter {
  editor;
  markerLayer;
  gutter;
  typeEvent;
  changeEvent;
  markedLines;
  maxPills;

  constructor(editor) {
    this.maxPills = 2;
    this.markedLines = [];
    this.editor = editor;
    this.markerLayer = editor.addMarkerLayer({
      id: "vertagon_layer_" + editor.id
    });
    this.gutter = this.editor.addGutter({
      name: "vertagon-gutter-" + editor.id,
      priority: "100",
      type: "decorated"
    });
    this.applyColors();
    this.changeEvent = this.editor.onDidStopChanging(() => {
      this.applyColors();
    });
  }

  isAttachedTo(editor) {
    return this.editor === editor;
  }

  updateGutterSize() {
    const newWidth = ( this.maxPills * 7 ) + 2;
    this.gutter.element.style.width = newWidth + "px";
  }

  checkAndExpandGutter(numPills) {
    if (numPills > this.maxPills) {
      this.maxPills += 2;
      this.updateGutterSize();
    }
  }

  getMarkedLineForRow(row) {
    let markedLine = null;
    this.markedLines.forEach(line => {
      if (line.line == row) markedLine = line;
    });
    return markedLine;
  }

  addColorDecorator(color, range, prevDeco = null) {
    if (prevDeco) prevDeco.destroy();
    try {
      let pill = document.createElement("div");
      pill.classList.add("color-preview");
      pill.style.cssText = "background-color: " + color;

      let container = null;
      let markedLine = this.getMarkedLineForRow(range.start.row);

      if (markedLine) {
        container = markedLine.container;
      } else {
        container = document.createElement("div");
        container.classList.add("color-preview-container");

        let deco = this.gutter.decorateMarker(
          this.markerLayer.markBufferRange(range, {}),
          { type: "gutter", class: "color-preview-container", item: container }
        );
        markedLine = {
          container: container,
          deco: deco,
          line: range.start.row,
          colors: []
        };
      }

      if (container) {
        let min = 9999999;
        let before = null;
        markedLine.colors.forEach(c => {
          if (c.range.start.column > range.start.column) {
            if(c.range.start.column < min) {
              min = c.range.start.column
              before = c.element
            }
          }
        });
        if( before != null) {
          container.insertBefore(pill, before);
        } else {
          container.appendChild(pill);
        }

        markedLine.colors.push({
          color: color,
          range: range,
          element: pill
        });
        this.checkAndExpandGutter(markedLine.colors.length);
      }

      this.markedLines.push(markedLine);

      return markedLine;
    } catch (error) {
      console.log(error);
      console.warn(
        "Chromo failed to create a new marker. This may be because a gutter no longer exists. If the problem persists, please open an issue on the Chromo Github repository"
      );
    }
  }

  eliminateRowCollision(range) {
    this.markedLines.forEach(line => {
      if (range.intersectsWith(line.deco.getMarker().getBufferRange())) {
        line.deco.destroy();
      }
    });
  }

  addImageDecorator(image, range) {
    setTimeout(() => {
      try {
        this.eliminateRowCollision(range);
        let item = document.createElement("div");
        item.classList.add("color-preview");
        item.style.cssText = "background-image: " + image;
        let deco = this.gutter.decorateMarker(
          this.markerLayer.markBufferRange(range, {}),
          { type: "gutter", class: "color-preview", item: item }
        );
        markedLine = {
          deco: deco,
          line: range.start.row,
          colors: [
            {
              image: image,
              range: range
            }
          ]
        };
        this.markedLines.push(markedLine);
      } catch (error) {
        console.warn(
          "Chromo failed to create a new marker. This may be because a gutter no longer exists. If the problem persists, please open an issue on the Chromo Github repository"
        );
      }
    }, 50);
  }

  applyColors() {
    this.clearDecorations();
    this.editor.scan(hexRegex, obj => {
      this.addColorDecorator(obj.match[1], obj.range);
    });
    this.editor.scan(
      rgbRegex,
      obj => {
        this.addColorDecorator(obj.match[1], obj.range);
      }
    );
    this.editor.scan(
      hslRegex,
      obj => {
        this.addColorDecorator(obj.match[1], obj.range);
      }
    );
    this.editor.scan(
      ansiRegex,
      obj => {
        this.addColorDecorator(
          convertAnsiToRGB(obj.match[1], obj.match[2], obj.match[6]),
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
      gradientRegex,
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
    this.markedLines.forEach(line => {
      line.deco.destroy();
    });
    this.maxPills = 2;
    this.updateGutterSize();
    this.markedLines = [];
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
