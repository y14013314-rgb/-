export function workspaceNavigation(html){
 return html.replace('</title>','</title><link rel="stylesheet" href="/team/layout-editor.css">')
  .replace(/<p>支持首页[^<]*<\/p>/,'<h2>选择要编辑的位置</h2><p><a class="layout-entry" href="/team/private-tours.html"><strong>Private Tours · 卡片位置与详情 →</strong><small>目的地、旅行主题、精选系列 · 调整卡片数量、分组与顺序</small></a></p>')
  .replace('<div class="catalog-toolbar">','<details class="workspace-tool"><summary>官网页面与产品内容</summary><div class="catalog-toolbar">')
  .replace('<details class="workspace-tool">','<p><a class="layout-entry" href="/team/card-products.html"><strong>全站卡片 · 添加或移出关联产品 →</strong></a></p><details class="workspace-tool">')
  .replace('<section id="inquiry-notifications" hidden>','</details><section id="inquiry-notifications" hidden>')
  .replace('<h2>待通知询盘</h2>','<details class="workspace-tool"><summary>待通知询盘</summary>')
  .replace('<div id="notification-status" role="status"></div></section>','<div id="notification-status" role="status"></div></details></section>')
  .replace('<h2>同事账号</h2>','<details class="workspace-tool"><summary>同事账号管理</summary>')
  .replace('<div id="member-list"></div></section>','<div id="member-list"></div></details></section>');
}
