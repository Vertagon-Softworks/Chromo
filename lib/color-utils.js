//
// __      __          _
// \ \    / /         | |
//  \ \  / /___  _ __ | |_  __ _   __ _   ___   _ __
//   \ \/ // _ \| '__|| __|/ _` | / _` | / _ \ | '_ \
//    \  /|  __/| |   | |_| (_| || (_| || (_) || | | |
//     \/  \___||_|    \__|\__,_| \__, | \___/ |_| |_|
//                                 __/ |
//                                |___/
//*******************************************************
//
// This file is property of Vertagon and shall not be redistributed, sold,
// or copied in any way unless granted permission by Vertagon. This source code
// was developed by the Vertagon team and does not carry any warranty whatsoever for
// any individual.
//
//
// Copyright (c) 2020, Vertagon
//
//
//

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
    const regex = new RegExp(
      `(^|(\s)|\'|\"|[: ]|\[|[(])(${color.name})($|\"|\'|[, ;]|\]|[)])`,
      "gi"
    );
    color.regex = regex;
  });
}

export const rgbRegex = /(rgb[a]?[(] *[0-9]{1,3} *, *[0-9]{1,3} *, *[0-9]{1,3} *(, *[0-1]?(\.[0-9]{1,3})?)? *[)])/gi

export const hslRegex = /(hsl[a]?[(] ?[0-9]{1,3} ?, *[0-9]{1,3} *[%] *, *[0-9]{1,3} *[%] *(, ?[0-1]?(\.[0-9]{1,3})?)? *[)])/gi;

export const ansiRegex = /\\(u001b|e|033|x1B)\[(0?1;)?[3-4]([0-8])((m)|([;]1m)|([;]5[;]([0-2]?[0-9]?[0-9])m))/gi;

export const hexRegex = /([#][0-9a-fA-F]{3,6})/gi;

export const gradientRegex = /(repeating-)?((linear-gradient)|(radial-gradient))[(] *[a-z0-9#,% \-]* *[)]/gi;


export function invert(color){
  if(color.includes(rgb) && color.split(",").length >= 3){
    //TODO Finish
  }
}
