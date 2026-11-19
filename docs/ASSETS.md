# 素材与替换说明

封面 `assets/cover.png` 来自用户提供的角色设定参考图。游戏角色和地面通过图像生成工具参考用户图片制作，并已随包保存；运行时不会调用生成服务，也不需要API密钥。

角色保持参考图的红金战士、橙红法师、绿衣精灵辅助。地面采用灰石、苔绿与金色星纹。图像生成与本地文件保存属于生成素材工作流；没有像素级承诺复刻参考图的每个细节。用户原参考素材的使用范围由其原有授权决定。

## 图集规格

`characters.png` 实际为1280×1280透明PNG，4行4列，每格320×320。第一至四行为镇星、荧惑、重华、野怪；第一至四列为朝下、左、右、上。替换时保持等分网格、透明背景、中心对齐与一致脚底位置。渲染器按实际图像尺寸计算单元，能够使用其他相同比例的分辨率。

`arena-floor.png` 是竖向俯视地面图，被映射到2400×3200世界范围。四个碰撞障碍由代码绘制，底图内部不应增加会被误认作实体的墙或大树。

`icon.svg` 为代码绘制的星形图标。阵型特效、护盾、血条、弹道、暗幕、地面星尘由Canvas程序绘制；音乐和音效由WebAudio合成，没有外部音频依赖。

当前三个手工编写的矢量游戏图标：`formation-wedge.svg` 为锋刃三角，`formation-circle.svg` 为环形星盾，`formation-sprout.svg` 为双叶新芽及治疗加号（V0.3.0替换横阵旧箭头）。均使用64×64画布、统一浅金配色及星尘细节（V0.3.1将新芽和治疗加号统一为金色），无外部字体。`config.js` 中的 `icon` 分别填 `wedge`、`circle`、`sprout`；`app.js` 的 `iconMarkup` 统一加载对应素材，按钮、阵型觉醒、帮助与战绩共用同一文件。替换SVG即可同步修改全部引用处。

## 生成提示词

角色图集，模式：使用参考图生成新素材，透明背景。

> Use case: stylized-concept. Asset type: transparent game sprite atlas for a real top-down 2D action game. The attached image is CHARACTER IDENTITY AND PALETTE REFERENCE ONLY, not an edit target. Generate a square 1024x1024 transparent PNG atlas, exactly 4 columns by 4 rows, equal 256px square cells, no lines no text no labels. Each cell contains one full body 16-bit pixel art chibi character, feet at y=220 within its cell, centered at x=128, plenty of transparent padding, sprite fits within 170px width and 205px height. Same overhead three-quarter RPG camera on all. Row 1: the red-haired male knight from reference, red gold armor, ivory cape and huge silver red sword. Row 2: the red-haired female fire mage from reference, orange-red robe, gold and black accents, flame staff. Row 3: the blonde female elf nature mage from reference, pointed ears, dark green beret with white flower, green cream dress, wooden leafy staff. Row 4: cute squat horned crystal forest beast, brown rock body, amber crystal horns. Columns 1,2,3,4 are facing south/front, west/left, east/right, north/back respectively for ALL rows. Keep identity outfit and scale consistent across directions. Crisp clean dark pixel outlines, readable 48px game sprites, intricate but clearly pixel art. No grounds, no shadows, no environment, no scenery, no typography, no UI, no watermark, actual transparent background.

地面图，模式：使用参考图生成新素材，不透明背景。

> Use case: stylized-concept. Asset type: complete usable flat top-down 2D pixel-art game arena FLOOR texture, no characters, no UI, no words. Input reference is STYLE AND MATERIAL reference only. Generate a portrait 3:4 orthographic overhead arena floor image that fills the entire image edge to edge, crop contains NO sky, NO labels, NO titles, NO border margins. This is a real game floor: all interior ground must be flat and walkable, NO interior walls, NO trees, NO rocks, NO towers, NO stairs, NO cliffs, NO objects that would need collision. The scene is a tranquil overgrown castle courtyard in fine detailed 16-bit pixel art, warm grey beige stone bricks, sage and olive grass, tiny flowers and soft moss, golden star-shaped inlaid patterns. Geometric layout: four grassy quadrants; wide pale stone paths form an X connecting points at 25%/25%,75%/25%,25%/75%,75%/75% of image to EXACT center 50%/50%. Central flat round stone plaza radius 15% image width, concentric inlaid pale stone rings, four-point golden star mosaic at exact center; central plaza completely flat and open, no crystal. Four flat small circular camp mosaics at the four quadrant points above. A faint walkable outer-ring stone route links the four camps. Only at very outermost 2% of image may there be low pale boundary masonry, burgundy gold banners and small flowers inspired by reference. Muted floor colors so red,green characters stand out, detailed readable stone tiles, restrained floor contrast. True orthographic top-down camera, no perspective, no isometric diamond shape. Must be a seamless single map with EXACT 3:4 ratio. No text, no signs, no arrows, no lights or baked fog, no dark curtain, no enemies or hero figures.
