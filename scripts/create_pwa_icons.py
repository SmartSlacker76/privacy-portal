#!/usr/bin/env python3
"""Create the original HONDI shield/check PWA icons using Python stdlib only."""
from pathlib import Path
import struct
import zlib

BASE = Path(__file__).resolve().parents[1]
OUT = BASE / "assets" / "pwa"
OUT.mkdir(parents=True, exist_ok=True)

def inside_polygon(x, y, poly):
    hit = False
    j = len(poly)-1
    for i, (xi, yi) in enumerate(poly):
        xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj-xi)*(y-yi)/(yj-yi)+xi:
            hit = not hit
        j = i
    return hit

def distance_sq(px,py,x1,y1,x2,y2):
    dx=x2-x1; dy=y2-y1
    t=max(0,min(1,((px-x1)*dx+(py-y1)*dy)/(dx*dx+dy*dy)))
    return (px-(x1+t*dx))**2+(py-(y1+t*dy))**2

def png_chunk(kind,data):
    return struct.pack(">I",len(data))+kind+data+struct.pack(">I",zlib.crc32(kind+data)&0xffffffff)

def generate(size):
    dark=(11,12,11)
    olive=(151,173,134)
    rows=[]
    shield=[(.50,.145),(.805,.26),(.805,.50),(.79,.63),(.70,.77),(.60,.85),(.50,.90),(.40,.85),(.30,.77),(.21,.63),(.195,.50),(.195,.26)]
    for y in range(size):
        line=bytearray([0])
        py=(y+.5)/size
        for x in range(size):
            px=(x+.5)/size
            # Large rounded-square app background, with ample safe zone for Android masking.
            corner=min(px,1-px); cy=min(py,1-py)
            rounded=(corner>=.10 or cy>=.10 or (corner-.10)**2+(cy-.10)**2 <= .10**2)
            inside=inside_polygon(px,py,shield)
            check=min(distance_sq(px,py,.35,.52,.445,.615),distance_sq(px,py,.445,.615,.67,.39)) <= .022**2
            color=dark if not rounded or check else olive if inside else dark
            line.extend(color)
        rows.append(bytes(line))
    raw=b"".join(rows)
    ihdr=struct.pack(">IIBBBBB",size,size,8,2,0,0,0)
    png=b"\x89PNG\r\n\x1a\n"+png_chunk(b"IHDR",ihdr)+png_chunk(b"IDAT",zlib.compress(raw,9))+png_chunk(b"IEND",b"")
    path=OUT/f"icon-{size}.png"
    path.write_bytes(png)
    print(path.relative_to(BASE),len(png),"bytes")

for size in (192,512):
    generate(size)
