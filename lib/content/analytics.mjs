export function withAnalytics(html){
 if(html.includes('src="/analytics.js"'))return html;
 return html.replace('</head>','<link rel="stylesheet" href="/analytics.css"><script src="/analytics.js" defer></script></head>');
}
