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

const getHighlightType = () =>
  atom.config.get("Chromo-Color-Previews.hoverHighlight");
const getShowHex = () =>
  atom.config.get("Chromo-Color-Previews.supportedTypes.hex");
const getShowRGB = () =>
  atom.config.get("Chromo-Color-Previews.supportedTypes.rgba");
const getShowNames = () =>
  atom.config.get("Chromo-Color-Previews.supportedTypes.colorName");
const getShowHSL = () =>
  atom.config.get("Chromo-Color-Previews.supportedTypes.hsl");
const getShowANSI = () =>
  atom.config.get("Chromo-Color-Previews.supportedTypes.ansi");
const getShowGradients = () =>
  atom.config.get("Chromo-Color-Previews.supportedTypes.gradients");
const getMaxPills = () => atom.config.get("Chromo-Color-Previews.maxPreviews");
const getAllowComposites = () =>
  atom.config.get("Chromo-Color-Previews.compositeColors");

class PreviewGutter {
  editor;
  markerLayer;
  gutter;
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
    this.editor.onDidDestroy(() => {
      this.destroy();
    });
  }

  isAttachedTo(editor) {
    return this.editor === editor;
  }

  updateGutterSize() {
    const newWidth = this.maxPills * 7 + 2;
    this.gutter.element.style.width = newWidth + "px";
  }

  checkAndExpandGutter(numPills) {
    if (numPills > this.maxPills && this.maxPills < getMaxPills()) {
      this.maxPills += 2;
      if (this.maxPills > getMaxPills()) this.maxPills = getMaxPills();
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

  eliminateRowCollisions(markedLine) {
    markedLine.colors.forEach(c1 => {
      markedLine.colors.forEach((c2, i) => {
        if (c1 !== c2) {
          if (
            c2.range.start.column > c1.range.start.column &&
            c2.range.end.column < c1.range.end.column
          ) {
            markedLine.container.removeChild(c2.element);
            delete markedLine.colors[i];
          }
        }
      });
    });
  }

  addColorDecorator(color, range, prevDeco = null, isImage = false) {
    if (prevDeco) prevDeco.destroy();
    if (this.markerLayer.isDestroyed()) return;
    try {
      let pill = document.createElement("div");
      pill.classList.add("color-preview");
      pill.style.cssText =
        (isImage ? "background-image: " : "background-color:") + color;
      //TODO replace with bind
      let context = this;
      pill.addEventListener("mouseenter", e => {
        if (getHighlightType() !== "none") {
          let marker = this.markerLayer.markBufferRange(range, {});
          context.editor.decorateMarker(marker, {
            type: "text",
            class: "color-preview-highlight",
            style: getHighlightType() == "color" ? (isImage
              ? { backgroundImage: color }
              : { backgroundColor: color }) : {}
          });
          let leaveEvent = pill.addEventListener("mouseleave", e => {
            marker.destroy();
            pill.removeEventListener("mouseleave", leaveEvent);
          });
        }
      });

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
            if (c.range.start.column < min) {
              min = c.range.start.column;
              before = c.element;
            }
          }
        });
        if (before != null) {
          container.insertBefore(pill, before);
        } else {
          container.appendChild(pill);
        }

        markedLine.colors.push({
          color: color,
          range: range,
          element: pill,
          isImage: isImage
        });
        if (!getAllowComposites()) this.eliminateRowCollisions(markedLine);
        this.checkAndExpandGutter(markedLine.colors.length);
      }

      this.markedLines.push(markedLine);

      return markedLine;
    } catch (error) {
      console.warn(
        "Chromo failed to create a new marker. This may be because a gutter no longer exists. If the problem persists, please open an issue on the Chromo Github repository"
      );
      console.log(error);
    }
  }

  trimMatchRange(match, r) {
    let range = r;
    if (match[1].length > 0) {
      r.start.column++;
    }
    if (match[4].length > 0) {
      r.end.column--;
    }
    return r;
  }

  applyColors() {
    this.clearDecorations();
    if (getShowHex()) {
      this.editor.scan(hexRegex, obj => {
        this.addColorDecorator(obj.match[1], obj.range);
      });
    }
    if (getShowRGB()) {
      this.editor.scan(rgbRegex, obj => {
        this.addColorDecorator(obj.match[1], obj.range);
      });
    }
    if (getShowHSL()) {
      this.editor.scan(hslRegex, obj => {
        this.addColorDecorator(obj.match[1], obj.range);
      });
    }
    if (getShowANSI()) {
      this.editor.scan(ansiRegex, obj => {
        this.addColorDecorator(
          convertAnsiToRGB(obj.match[3], obj.match[6], obj.match[8]),
          obj.range
        );
      });
    }
    if (getShowNames()) {
      ColorNames.forEach(color => {
        this.editor.scan(color.regex, obj => {
          const range = this.trimMatchRange(obj.match, obj.range);
          this.addColorDecorator(color.code, range);
        });
      });
    }
    if (getShowGradients()) {
      this.editor.scan(gradientRegex, obj => {
        this.addColorDecorator(obj.match[0], obj.range, undefined, true);
      });
    }
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
    if (this.gutter) {
      try {
        this.gutter.destroy();
      } catch (e) {}
    }
    if (this.markerLayer) this.markerLayer.destroy();
    if (this.changeEvent) this.changeEvent.dispose();
  }
}

export default PreviewGutter;
