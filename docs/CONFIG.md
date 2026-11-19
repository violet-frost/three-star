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
| awakeningStep | 20 | 每累计获得多少星尘增加一次觉醒 |
| awakeningCap | 6 | 每局最多觉醒次数 |
| choiceTimeout | 10 | 觉醒自动选择等待时间 |
| formationCooldown | 1 | 换阵冷却 |
| protection | 3 | 开局保护时间 |

`core` 设置首次刷新、被取走后的刷新间隔、占领时长、占领半径、星尘奖励；英雄伤害不打断占领，不再提供受击锁定配置。`storm` 设置暗幕开始与终态时间、半径及分阶段每秒伤害。`monsters` 设置普通与精英野怪属性、奖励和刷新波次。

## 英雄、阵型与觉醒

`heroes` 数组按镇星、荧惑、重华排列，包含生命、攻击、防御、攻击间隔、范围、前后摇、弹速与阵型效果参数。攻击间隔越小攻击越快。范围为世界距离。

V0.3.0阵型默认值：

| 名称（按钮位置／快捷键） | 攻击attack | 防御defense | 移动move |
|---|---:|---:|---:|
| 圆阵（1） | 1.0 | 1.2 | 1.0 |
| 楔形（2，默认） | 1.5 | 0.8 | 1.0 |
| 横阵（3） | 0.8 | 1.0 | 1.0 |

`formations` 内部按楔形、圆阵、横阵排列，ID为0、1、2。`formationOrder:[1,0,2]` 决定按钮、帮助和快捷键顺序；`initialFormation:0` 决定默认楔形，不应为调整按钮顺序直接重排内部数组。`attack`、`defense`、`move` 为倍率，`coverage` 为远程覆盖倍率；`slots` 是三人生存时的相对编队位置，`duo` 是两人生存时的位置。旧 `synergy` 及主动技能、控制参数已删除。

圆阵承伤逻辑在 `Simulation.resolveDamage`，包含暗幕；镇星阵亡停止转移。`heroes[1].chargeEvery:3` 设置楔形强化发射间隔，`chargeDamage:2` 设置强化伤害倍率。`heroes[2].healInterval:1`、`healAmount:2` 设置横阵治疗间隔与回血量；选择当前生命值最低的受伤存活友军，包含重华自身。只在对应阵型且英雄存活时生效。详细边界见技术说明。

`awakenings` 的 `enabled:false` 表示停用；A07共鸣与A08缠绕保留ID、max为0，不参与候选或选择。当前有7种可选觉醒，数组仍有9个固定ID槽位。`max` 是叠加上限，`value` 是每层增量；`requires` 为需要存活的英雄编号。新增觉醒不仅要增加此表，还需在模拟模块实现对应效果。

## 地图、AI与视听

`map` 包含尺寸、出生点、普通与精英营地、四个障碍矩形。障碍参与碰撞、导航、弹道阻挡与绘制。大幅修改地图后应同步修改地面底图，避免石路与玩法坐标不符。

`ai` 包含决策间隔、撤退生命比、脱战生命比、优势判断、追击距离和时间。所有队伍采用同一战斗和拾取规则。

角色与地面素材在 `assets`，图集行列约定见 `ASSETS.md`。界面颜色与尺寸在 `style.css`；音量和振动由游戏设置界面修改并保存在浏览器本地。

V0.2.2的淡黄星尘界面配置集中在 `style.css` 末尾的 `Stardust glass` 段：`--dust-surface` 控制底色及透明程度（颜色末两位为alpha，越小越透明），`--dust-ink` 控制文字，`--dust-edge` 控制浅金边缘；`.notification-stack` 的 `top` 控制提示区高度。阵型图标在 `assets/formation-*.svg`，配置图标名称为 `wedge`、`circle`、`sprout`。修改配置名称时，阵型与相应觉醒的引用应保持一致。

V0.3.2的HUD字号与人数左移配置集中在CSS末尾 `HUD readability` 段；详情使用 `white-space:nowrap` 保持破阵同一行，英雄面板宽度38%、上限180px。

V0.2.3的浮动摇杆尺寸在 `.hud .joystick` 的 `width:48.72%`，即战场宽度的48.72%。指针归一化自动按新半径计算，无需同步改移动逻辑。队伍名称与存活人数的字号在末尾 `.leader-entry small`、`.leader-entry em` 中调整。攻击范围圈在 `render.js` 的 `drawAttackRange` 中控制黄色描边和虚线节距；半径读取实时战斗属性，无需另配一个可能失真的固定射程。

V0.3.3觉醒进度条读取 `awakeningStep` 和 `awakeningCap`，目标依次为20/40/60/80/100/120；达到6次上限后进度条填满并继续显示累计数量/120。

V0.3.4结算页字号统一在CSS末尾 `Results typography` 段配置：标题30px（小屏25px）、说明12px、排名25px、队名14px、队伍详情11px、星尘20px/标签10px、战绩12px、觉醒标签11px、再次挑战20px、返回13px，均比原字号增加2px。

V0.3.5非阵型觉醒的 `icon` 键为 `attack`、`speed`、`vitality`、`resonance`、`bind`、`guard`，由 `iconMarkup` 加载 `assets/awakening-*.svg`。阵型仍使用 `wedge`、`circle`、`sprout`。选择卡片、结算已选觉醒共享这些素材。卡片排版在CSS末尾 `Awakening cards` 段：标题固定为同高度横排，正文采用伸展行，层数位于底部，避免不同描述长度造成错位。
