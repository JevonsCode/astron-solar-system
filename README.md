# Solaris Atlas

一个使用 `Three.js` 构建的静态 3D 太阳系演示，支持：

- 自由飞行与自定义飞行速度
- 输入时间并驱动太阳系布局变化
- 行星、月球、木星多颗卫星、土星粒子环
- 选中目标、观察目标、降落到表面

## 运行

直接用现代浏览器打开 [index.html](./index.html) 即可。

说明：

- 当前实现通过 CDN 加载 `Three.js`
- 已接入部分官方纹理源：NASA SVS Earth Blue Marble、USGS Clementine Moon、USGS Mars Viking、NASA/JPL Jupiter
- 轨道采用开普勒椭圆近似
- 月球与多数卫星采用精简轨道模型，优先保证可视化和交互体验
