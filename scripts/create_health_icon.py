#!/usr/bin/env python3

from PIL import Image
import sys

# Create 16x16 image with transparency
img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
pixels = img.load()

# Color palette
OUTLINE = (122, 26, 26, 255)    # #7A1A1A - darkest red for outline
HIGHLIGHT = (255, 107, 107, 255) # #FF6B6B - brightest red for highlights
BASE = (239, 68, 68, 255)        # #EF4444 - main body color
SHADOW = (204, 34, 34, 255)      # #CC2222 - shadow color

# Helper function to set pixel
def set_pixel(x, y, color):
    if 0 <= x < 16 and 0 <= y < 16:
        pixels[x, y] = color

# Draw the heart pixel by pixel
# Row 0 (nothing visible)

# Row 1 - top curves outline
set_pixel(4, 1, OUTLINE)
set_pixel(5, 1, OUTLINE)
set_pixel(10, 1, OUTLINE)
set_pixel(11, 1, OUTLINE)

# Row 2 - top curves with highlights
set_pixel(3, 2, OUTLINE)
set_pixel(4, 2, HIGHLIGHT)
set_pixel(5, 2, HIGHLIGHT)
set_pixel(6, 2, OUTLINE)
set_pixel(9, 2, OUTLINE)
set_pixel(10, 2, HIGHLIGHT)
set_pixel(11, 2, HIGHLIGHT)
set_pixel(12, 2, OUTLINE)

# Row 3 - fill in top
set_pixel(2, 3, OUTLINE)
set_pixel(3, 3, HIGHLIGHT)
set_pixel(4, 3, HIGHLIGHT)
set_pixel(5, 3, HIGHLIGHT)
set_pixel(6, 3, BASE)
set_pixel(7, 3, BASE)
set_pixel(8, 3, BASE)
set_pixel(9, 3, BASE)
set_pixel(10, 3, HIGHLIGHT)
set_pixel(11, 3, HIGHLIGHT)
set_pixel(12, 3, HIGHLIGHT)
set_pixel(13, 3, OUTLINE)

# Row 4 - widen
set_pixel(2, 4, OUTLINE)
set_pixel(3, 4, HIGHLIGHT)
set_pixel(4, 4, HIGHLIGHT)
set_pixel(5, 4, BASE)
set_pixel(6, 4, BASE)
set_pixel(7, 4, BASE)
set_pixel(8, 4, BASE)
set_pixel(9, 4, BASE)
set_pixel(10, 4, BASE)
set_pixel(11, 4, BASE)
set_pixel(12, 4, HIGHLIGHT)
set_pixel(13, 4, OUTLINE)

# Row 5 - full width
set_pixel(1, 5, OUTLINE)
set_pixel(2, 5, BASE)
set_pixel(3, 5, BASE)
set_pixel(4, 5, BASE)
set_pixel(5, 5, BASE)
set_pixel(6, 5, BASE)
set_pixel(7, 5, BASE)
set_pixel(8, 5, BASE)
set_pixel(9, 5, BASE)
set_pixel(10, 5, BASE)
set_pixel(11, 5, BASE)
set_pixel(12, 5, BASE)
set_pixel(13, 5, BASE)
set_pixel(14, 5, OUTLINE)

# Row 6 - full width
set_pixel(1, 6, OUTLINE)
set_pixel(2, 6, BASE)
set_pixel(3, 6, BASE)
set_pixel(4, 6, BASE)
set_pixel(5, 6, BASE)
set_pixel(6, 6, BASE)
set_pixel(7, 6, BASE)
set_pixel(8, 6, BASE)
set_pixel(9, 6, BASE)
set_pixel(10, 6, BASE)
set_pixel(11, 6, BASE)
set_pixel(12, 6, BASE)
set_pixel(13, 6, BASE)
set_pixel(14, 6, OUTLINE)

# Row 7 - start narrowing, add shadow
set_pixel(1, 7, OUTLINE)
set_pixel(2, 7, BASE)
set_pixel(3, 7, BASE)
set_pixel(4, 7, BASE)
set_pixel(5, 7, BASE)
set_pixel(6, 7, BASE)
set_pixel(7, 7, BASE)
set_pixel(8, 7, BASE)
set_pixel(9, 7, BASE)
set_pixel(10, 7, BASE)
set_pixel(11, 7, BASE)
set_pixel(12, 7, BASE)
set_pixel(13, 7, SHADOW)
set_pixel(14, 7, OUTLINE)

# Row 8 - narrow more
set_pixel(2, 8, OUTLINE)
set_pixel(3, 8, BASE)
set_pixel(4, 8, BASE)
set_pixel(5, 8, BASE)
set_pixel(6, 8, BASE)
set_pixel(7, 8, BASE)
set_pixel(8, 8, BASE)
set_pixel(9, 8, BASE)
set_pixel(10, 8, BASE)
set_pixel(11, 8, BASE)
set_pixel(12, 8, SHADOW)
set_pixel(13, 8, OUTLINE)

# Row 9 - continue narrowing
set_pixel(3, 9, OUTLINE)
set_pixel(4, 9, BASE)
set_pixel(5, 9, BASE)
set_pixel(6, 9, BASE)
set_pixel(7, 9, BASE)
set_pixel(8, 9, BASE)
set_pixel(9, 9, BASE)
set_pixel(10, 9, BASE)
set_pixel(11, 9, SHADOW)
set_pixel(12, 9, OUTLINE)

# Row 10 - more narrow
set_pixel(4, 10, OUTLINE)
set_pixel(5, 10, BASE)
set_pixel(6, 10, BASE)
set_pixel(7, 10, BASE)
set_pixel(8, 10, BASE)
set_pixel(9, 10, BASE)
set_pixel(10, 10, SHADOW)
set_pixel(11, 10, SHADOW)
set_pixel(12, 10, OUTLINE)

# Row 11 - getting narrow
set_pixel(5, 11, OUTLINE)
set_pixel(6, 11, BASE)
set_pixel(7, 11, BASE)
set_pixel(8, 11, BASE)
set_pixel(9, 11, SHADOW)
set_pixel(10, 11, SHADOW)
set_pixel(11, 11, OUTLINE)

# Row 12 - very narrow
set_pixel(4, 12, OUTLINE)
set_pixel(5, 12, OUTLINE)
set_pixel(6, 12, OUTLINE)
set_pixel(7, 12, SHADOW)
set_pixel(8, 12, SHADOW)
set_pixel(9, 12, SHADOW)
set_pixel(10, 12, SHADOW)
set_pixel(11, 12, OUTLINE)

# Row 13 - near point
set_pixel(5, 13, OUTLINE)
set_pixel(6, 13, SHADOW)
set_pixel(7, 13, SHADOW)
set_pixel(8, 13, SHADOW)
set_pixel(9, 13, SHADOW)
set_pixel(10, 13, OUTLINE)

# Row 14 - almost point
set_pixel(6, 14, OUTLINE)
set_pixel(7, 14, SHADOW)
set_pixel(8, 14, SHADOW)
set_pixel(9, 14, OUTLINE)

# Row 15 - point
set_pixel(7, 15, OUTLINE)
set_pixel(8, 15, OUTLINE)

# Save the image
output_path = sys.argv[1] if len(sys.argv) > 1 else '/Users/gilbrowdy/rogue/public/assets/icons/stats/health.png'
img.save(output_path, 'PNG')
print(f'Created health icon at {output_path}')
