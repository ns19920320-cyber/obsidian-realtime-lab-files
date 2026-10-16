# Realtime Lab Files 0.5.0-alpha.13

修复 BRAT 热更新后的同步状态残留：卸载后异步回调不得重新绘制 UI；新版清理旧实例遗留状态，并监测延迟插入的旧行。保留 alpha.12 当前笔记限定及工具栏下方位置。

26 项相关测试、类型检查和构建通过。回归在修复前分别复现旧行并存（2条）及卸载后重新生成（1条），修复后通过；覆盖延迟旧行、标签切换、读取与编辑和冲突处理。iPhone 真机外观仍待更新后确认。

只用于已初始化 Realtime-Lab-V3-Files- 独立测试库。BRAT 原地更新，不重置内容、快照、历史、队列、令牌、地址或自动连接。Mac 正在使用的插件本轮未替换。

源码位于 source.zip。npm install; npm run typecheck; node --test --test-concurrency=2 test/*.test.mjs; npm run build:v3-files。既有容量及协议限制不变。
