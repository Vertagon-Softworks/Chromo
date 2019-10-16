"use babel";
import { ColorNames } from "./color-names";
import { TerminalColors } from "./xterm-colors";

export function convertAnsiToRGB(colorCode, bold, extension) {
  let code = parseInt(colorCode);
  if (bold === ";1m") code += 8;
  if (extension && colorCode == 8) code = extension;
  if (extension && colorCode != 8) return null;
  return TerminalColors[code];
}

export function assignRegexToColorNames() {
  ColorNames.forEach(color => {
    let regex = new RegExp(
      "(^|(\s+)|\'|\"|\A|[: ])(" + color.name + ")($|(\s+)|\"|\'|\z|[, ;])",
      "gi"
    );
    color.regex = regex;
  });
}
