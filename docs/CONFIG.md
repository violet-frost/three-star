# 配置说明

编辑 `src/config.js` 后刷新网页即可生效，不需要重新编译。字段单位：时间为秒、距离为世界像素，地图为2400×3200。修改时保留JavaScript语法。

## 散落星尘

```js
scatter: {
  enabled: true,
  initial: 80,
  interval: 20,
  batch: 12,
  value: 1,
  maxGround: 100,
  safeMargin: 70,
  minSpacing: 65
},
```

| 字段 | 含义 |
|---|---|
| enabled | 是否启用地面随机散落星尘 |
| initial | 开局数量，分到四个象限后在象限内随机落位 |
| interval | 补充周期，须大于0 |
| batch | 每周期尝试增加的数量 |
| value | 单枚星尘的资源价值，建议正整数 |
| maxGround | 场上尚未拾取的随机散落星尘数量上限，不包含死亡掉落 |
| safeMargin | 新生成位置相对当前安全区边缘的内缩距离 |
| minSpacing | 新星尘与已有星尘之间的最小距离 |

数量不足时可先把 `initial` 调为120、`batch` 调为20、`maxGround` 调为160；保持 `interval:20`。生成会避开障碍和地图边缘；空间不足时允许实际生成数少于请求数。暗幕外的旧星尘不会传送回安全区。`enabled:false` 恢复无此新增资源的规则。

## 对局与成长

| 字段 | 默认 | 含义 |
|---|---:|---|
| duration | 180 | 单局最长时长 |
| tick | 1/30 | 固定逻辑步长；不建议随意更改 |
| speed | 180 | 小队中心基础移动速度 |
| pickupRadius | 28 | 玩家和AI一致的拾取距离 |
| awakeningStep | 25 | 每累计获得多少星尘增加一次觉醒 |
| awakeningCap | 6 | 每局最多觉醒次数 |
| choiceTimeout | 10 | 觉醒自动选择等待时间 |
| formationCooldown | 1 | 换阵冷却 |
| protection | 3 | 开局保护时间 |

`core` 设置首次刷新、被取走后的刷新间隔、占领时长、占领半径、星尘奖励与受击中断时间。`storm` 设置暗幕开始与终态时间、半径及分阶段每秒伤害。`monsters` 设置普通与精英野怪属性、奖励和刷新波次。

## 英雄、阵型与觉醒

`heroes` 数组按镇星、荧惑、重华排列，包含生命、攻击、防御、攻击间隔、范围、前后摇、弹速与技能参数。攻击间隔越小攻击越快。范围和技能距离均为世界距离。

`formations` 按楔形、圆阵、横阵排列。`attack`、`defense`、`move` 为倍率，`coverage` 为远程覆盖倍率；`slots` 是三人生存时的相对编队位置，`duo` 是两人生存时的位置。`synergy` 控制破阵集火的冷却、标记持续时间、伤害倍率和额外穿透。

`awakenings` 的 `max` 是叠加上限，`value` 是每层增量；`requires` 为需要存活的英雄编号。新增觉醒不仅要增加此表，还需在模拟模块实现对应效果。

## 地图、AI与视听

`map` 包含尺寸、出生点、普通与精英营地、四个障碍矩形。障碍参与碰撞、导航、弹道阻挡与绘制。大幅修改地图后应同步修改地面底图，避免石路与玩法坐标不符。

`ai` 包含决策间隔、撤退生命比、脱战生命比、优势判断、追击距离和时间。所有队伍采用同一战斗和拾取规则。

角色与地面素材在 `assets`，图集行列约定见 `ASSETS.md`。界面颜色与尺寸在 `style.css`；音量和振动由游戏设置界面修改并保存在浏览器本地。

V0.2.2的淡黄星尘界面配置集中在 `style.css` 末尾的 `Stardust glass` 段：`--dust-surface` 控制底色及透明程度（颜色末两位为alpha，越小越透明），`--dust-ink` 控制文字，`--dust-edge` 控制浅金边缘；`.notification-stack` 的 `top` 控制提示区高度。阵型图标在 `assets/formation-*.svg`，配置图标名称为 `wedge`、`circle`、`line`。修改配置名称时，阵型与相应觉醒的引用应保持一致。

V0.2.3的浮动摇杆尺寸在 `.hud .joystick` 的 `width:48.72%`，即战场宽度的48.72%。指针归一化自动按新半径计算，无需同步改移动逻辑。队伍名称与存活人数的字号在末尾 `.leader-entry small`、`.leader-entry em` 中调整。攻击范围圈在 `render.js` 的 `drawAttackRange` 中控制黄色描边和虚线节距；半径读取实时战斗属性，无需另配一个可能失真的固定射程。
