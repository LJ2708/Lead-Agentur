#!/bin/bash
# Requires: brew install librsvg
SIZES="72 96 128 144 152 192 384 512"
for size in $SIZES; do
  rsvg-convert -w $size -h $size public/icons/icon.svg > public/icons/icon-$size.png
done
echo "Icons generated!"
