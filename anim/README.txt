# 怪物动画素材

这组像素怪物按参考图重新设计：32px 原始像素、3 倍放大到 96px、透明背景、硬边像素轮廓。

- 小兔子：白色兔头、黑色硬描边、亮粉内耳和鼻子、极简黑色五官
- 史莱姆：亮蓝果冻体、深蓝描边、青色高光、小黑眼

- 角色：`slime`、`bunny`
- 动作：`breathe`、`move`、`death`
- 兼容旧命名：`idle` 文件和 `.monster-anim.*-idle` 类仍可使用，内容等同 `breathe`
- 每个 `*_sheet.png` 是横向精灵表；`*.gif` 用于快速预览
- `monster-animations.css` 提供可直接使用的类，例如 `.monster-anim.slime-breathe`、`.monster-anim.bunny-death`
- `monster-animations.json` 记录帧数、帧时长、精灵表、GIF 和逐帧 PNG 路径
- 生成脚本：`tools/generate-monster-animations.py`
