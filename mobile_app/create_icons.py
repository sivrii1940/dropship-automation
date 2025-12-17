from PIL import Image
import os

# Assets klasörü
assets_dir = 'assets'
os.makedirs(assets_dir, exist_ok=True)

# Renk
bg_color = (26, 26, 46)  # #1a1a2e
accent_color = (59, 130, 246)  # #3b82f6

# icon.png (1024x1024)
img = Image.new('RGB', (1024, 1024), bg_color)
for x in range(300, 724):
    for y in range(300, 724):
        img.putpixel((x, y), accent_color)
img.save(f'{assets_dir}/icon.png')
print('icon.png oluşturuldu')

# splash.png (1284x2778)
splash = Image.new('RGB', (1284, 2778), bg_color)
for x in range(442, 842):
    for y in range(1189, 1589):
        splash.putpixel((x, y), accent_color)
splash.save(f'{assets_dir}/splash.png')
print('splash.png oluşturuldu')

# adaptive-icon.png (1024x1024)
adaptive = Image.new('RGB', (1024, 1024), bg_color)
for x in range(300, 724):
    for y in range(300, 724):
        adaptive.putpixel((x, y), accent_color)
adaptive.save(f'{assets_dir}/adaptive-icon.png')
print('adaptive-icon.png oluşturuldu')

# favicon.png (48x48)
favicon = Image.new('RGB', (48, 48), bg_color)
for x in range(14, 34):
    for y in range(14, 34):
        favicon.putpixel((x, y), accent_color)
favicon.save(f'{assets_dir}/favicon.png')
print('favicon.png oluşturuldu')

print('Tüm ikonlar başarıyla oluşturuldu!')
