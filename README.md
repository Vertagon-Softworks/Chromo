# The Chromo Package

Chromo makes working with colors easier by adding color previews to the gutter.
This gutter can be toggled on or off. Chromo will pick up color names and codes from
all types of files and text (for this reason it may sometimes pick up colors in places you didn't expect).

Currently Supported color types
   1. Hex color codes (Ex: #000fff)
   2. Rgb color codes (Ex: rgb(0,0,255))
   3. Rgba color codes (Ex: rgba(0,0,255,0.5))
   4. CSS color names (Ex: blue, Blue, etc.)

The current build is early and thus is limited in features and may contain bugs.
Look for future updates that will add more features and flatten out those bugs
and performance issues.

## Known issues
   - Files with large numbers of colors can experience typing lag
   - Colors at the start of lines will trigger a preview on the line above them

## Future Features

In the future we hope to support the following features:
   - ANSI escape code colors
   - color constants and variables
   - color values with expressions
   - Color previews on code suggestions
   - foreground vs background vs text differentiation
   - Multiple colors per gutter
   - Option to style text with color preview
   - Previews for color gradients
   - Previews for "currentcolor" css option
   - Color pickers!
   - Custom color definitions
   - Much, Much more
