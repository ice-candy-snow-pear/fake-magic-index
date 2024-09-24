# ice-candy-snow-pear
转存到网盘时根据上个页面的信息自动补充转存路径，当前支持仓库和度盘

# 使用方法
使用tampermonkey等脚本管理器安装即可，

浏览页面时点击网盘链接并转存，脚本会在选择的转存位置后自动添加额外的转存路径

额外转存路径的默认格式为：

/{host}_{id}_{title}/{date}_{time}
- 字段解释:
  - {host}: 上个页面的域名
  - {id}: 上个页面的url id, 一般是一串数字
  - {title}: 上个页面的标题
  - {date}: 打开网盘链接的日期
  - {time}: 打开网盘链接的时间
 
需要自定义格式在这行修改即可
```javascript
const pathPattern = "/{host}_{id}_{title}/{date}_{time}";
```
