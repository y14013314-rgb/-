export function withAnalytics(html){
 html=html.replace(/src="\/(home-v1|pages-inquiry|analytics)\.js(?:\?[^"\s]*)?"/g,(_,name)=>'src="/'+name+'.js?v=ga4-20261113"');
 if(/src="\/analytics\.js(?:\?[^"\s]*)?"/.test(html))return html;
 return html.replace('</head>','<link rel="stylesheet" href="/analytics.css"><script src="/analytics.js?v=ga4-20261113" defer></script></head>');
}
