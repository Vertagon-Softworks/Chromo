"use babel";
import { CompositeDisposable, DisplayMarkerLayer } from "atom";
import PreviewGutter from "./preview-gutter";
import { assignRegexToColorNames } from "./color-utils";
import { colorPreviewView } from "./color-preview-view";

const getIsActive = () =>
  atom.config.get("Chromo-Color-Previews.displayPreviews");
const setIsActive = active =>
  atom.config.set("Chromo-Color-Previews.displayPreviews", active);

export default {
  config: {
    displayPreviews: {
      title: "Display Color Previews",
      type: "boolean",
      default: true,
      order: 1
    },
    hoverHighlight: {
      title: "Preview Hover Highlighting",
      description: "the highlight behavior to adopt on a snippet of color definition text when its preview pill is hovered over",
      type: "string",
      default: "color",
      enum: ["color", "neutral", "none"],
      order: 2
    },
    supportedTypes: {
      title: "Supported Color Types",
      type: "object",
      order: 3,
      properties: {
        hex: {
          title: "Hexidecimal",
          type: "boolean",
          default: true,
          order: 1
        },
        rgba: {
          title: "RGB(A)",
          type: "boolean",
          default: true,
          order: 2
        },
        colorName: {
          title: "Color Names",
          type: "boolean",
          default: true,
          order: 3
        },
        hsl: {
          title: "HSL(A)",
          type: "boolean",
          default: true,
          order: 4
        },
        ansi: {
          title: "ANSI",
          type: "boolean",
          default: true
        },
        gradients: {
          title: "Gradients",
          type: "boolean",
          default: true
        }
      }
    },
    maxPreviews: {
      title: "Max Previews Per Line",
      description: "the maximum number of preview pills to allow per line. Any previews beyong the maximum will not be displayed",
      type: "integer",
      minimum: 1,
      maximum: 50,
      default: 10,
      order: 4
    },
    compositeColors: {
      title: "Show Composite Colors",
      description: "determines whether or not colors that are used in the definitions of other colors or gradients should generate previews",
      type: "boolean",
      default: false,
      order: 5
    }
  },
  colorPreviewView: null,
  subscriptions: null,
  previewGutters: [],

  doesEditorHaveColorPreviews(editor) {
    return this.previewGutters.find(gutter => gutter.isAttachedTo(editor));
  },

  constructPreviewGutter(editor) {
    const existing = this.doesEditorHaveColorPreviews(editor);
    if (existing) return existing;
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
    assignRegexToColorNames();

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(
      atom.commands.add("atom-workspace", {
        "color-preview:toggle": () => this.toggle()
      })
    );

    this.subscriptions.add(
      atom.config.onDidChange(
        "Chromo-Color-Previews.displayPreviews",
        {},
        e => {
          this.updateActive();
        }
      )
    );

    atom.workspace.getTextEditors().forEach(editor => {
      try {
        let gutter = this.constructPreviewGutter(editor);
        if (!getIsActive()) gutter.hide();
        else gutter.show();
      } catch (e) {
        console.warn("Unable to construct a new color-preview gutter!\n", e);
      }
    });

    // When we switch editor panes, make sure if its a new one to add
    // color previews to it
    this.subscriptions.add(
      atom.workspace.observeActivePaneItem(pane => {
        if (pane && pane.constructor.name === "TextEditor") {
          try {
            let editor = atom.workspace.getActiveTextEditor();
            let gutter = this.constructPreviewGutter(editor);
            if (!getIsActive) gutter.hide();
            else gutter.show();
          } catch (e) {
            console.warn(
              "Unable to construct a new color-preview gutter!\n",
              e
            );
          }
        }
      })
    );
  },

  deactivate() {
    this.destructAllPreviewGutters();
    if (this.subscriptions) this.subscriptions.dispose();
    if (this.colorPreviewView) this.colorPreviewView.destroy();
  },

  serialize() {
    return {};
  },

  updateActive() {
    if (getIsActive()) {
      this.previewGutters.forEach(gutter => gutter.show());
    } else {
      this.previewGutters.forEach(gutter => gutter.hide());
    }
  },

  toggle() {
    setIsActive(!getIsActive());
    this.updateActive();
  }
};
