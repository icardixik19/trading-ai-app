// src/utils/newsGenerator.js

async function fetchAANews() {
  try {
    const response = await fetch('https://www.aa.com.tr/tr/ekonomi/rss');
    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');
    
    const items = xmlDoc.getElementsByTagName('item');
    const news = [];
    
    for (let i = 0; i < Math.min(items.length, 10); i++) {
      const title = items[i].getElementsByTagName('title')[0]?.textContent || '';
      const description = items[i].getElementsByTagName('description')[0]?.textContent || '';
      const pubDate = items[i].getElementsByTagName('pubDate')[0]?.textContent || '';
      
      news.push({
        title,
        description: description.substring(0, 150) + '...',
        source: 'Anadolu Agency',
        date: new Date(pubDate).toLocaleString('tr-TR'),
        url: items[i].getElementsByTagName('link')[0]?.textContent || '#'
      });
    }
    
    return news;
  } catch (error) {
    console.error('AA haberler yüklenemedi:', error);
    return [];
  }
}

// Platform'da çağır
async function loadNews() {
  const aaNews = await fetchAANews();
  displayNews(aaNews);  // UI'ya gönder
}
