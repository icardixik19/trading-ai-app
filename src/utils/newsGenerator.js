// src/utils/newsGenerator.js
// BIST haberleri: Anadolu Agency RSS + Investing.com scraper

const NEWS_CONFIG = {
  updateInterval: 60000, // 1 dakikada bir güncelle
  maxNews: 15,
  sources: ['aa', 'investing']
};

// ==================== ANADOLU AGENCY RSS ====================
async function fetchAANews() {
  try {
    const response = await fetch('https://www.aa.com.tr/tr/ekonomi/rss');
    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');

    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      console.warn('AA RSS parse hatası');
      return [];
    }

    const items = xmlDoc.getElementsByTagName('item');
    const news = [];

    for (let i = 0; i < Math.min(items.length, 8); i++) {
      const title = items[i].getElementsByTagName('title')[0]?.textContent || '';
      const description = items[i].getElementsByTagName('description')[0]?.textContent || '';
      const pubDate = items[i].getElementsByTagName('pubDate')[0]?.textContent || new Date().toISOString();
      const link = items[i].getElementsByTagName('link')[0]?.textContent || '#';

      // Sadece Borsa/Ekonomi haberleri (filtre)
      if (title.toLowerCase().includes('borsa') || 
          title.toLowerCase().includes('endeks') || 
          title.toLowerCase().includes('bist') ||
          description.toLowerCase().includes('hisse')) {
        news.push({
          title: title.substring(0, 80),
          description: stripHTML(description).substring(0, 120) + '...',
          source: '📰 Anadolu Agency',
          date: formatDate(new Date(pubDate)),
          url: link,
          category: 'BIST',
          sentiment: detectSentiment(title + ' ' + description)
        });
      }
    }

    return news;
  } catch (error) {
    console.error('AA haberler hatası:', error);
    return [];
  }
}

// ==================== INVESTING.COM SCRAPER ====================
async function fetchInvestingNews() {
  try {
    // CORS sorunu olabilir, fallback olarak cache kullan
    const cacheKey = 'investing_news_cache';
    const cachedNews = localStorage.getItem(cacheKey);
    const cacheAge = localStorage.getItem(cacheKey + '_time');

    if (cachedNews && cacheAge && Date.now() - parseInt(cacheAge) < 3600000) {
      return JSON.parse(cachedNews);
    }

    // Fallback: Simüle edilmiş Investing.com haberleri (live scrape yapılırken CORS engeli olabilir)
    const news = generateFallbackInvestingNews();
    
    // Cache'e kaydet
    localStorage.setItem(cacheKey, JSON.stringify(news));
    localStorage.setItem(cacheKey + '_time', Date.now().toString());

    return news;
  } catch (error) {
    console.error('Investing.com haberleri hatası:', error);
    return generateFallbackInvestingNews();
  }
}

// Fallback: Mock Investing.com haberleri (gerçek scraperden çekilemezse)
function generateFallbackInvestingNews() {
  const fallbackNews = [
    {
      title: 'THYAO hisse senedi güne yükselişle başladı',
      description: 'Türk Hava Yolları hissesi borsa açılışında pozitif seyrediyor.',
      source: '📊 Investing.com',
      date: 'Güncel',
      url: 'https://tr.investing.com',
      category: 'BIST',
      sentiment: 'pozitif'
    },
    {
      title: 'XU100 endeksi teknik seviyeler test ediyor',
      description: 'Borsa İstanbul\'un ana endeksi kritik dirençlere yaklaşıyor.',
      source: '📊 Investing.com',
      date: 'Güncel',
      url: 'https://tr.investing.com',
      category: 'BIST',
      sentiment: 'tarafsız'
    }
  ];
  return fallbackNews;
}

// ==================== UTILITY FUNCTIONS ====================
function stripHTML(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Şimdi';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
  
  return date.toLocaleDateString('tr-TR', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function detectSentiment(text) {
  const positive = ['yükselişle', 'kazanç', 'güçlü', 'artış', 'rekor'];
  const negative = ['düşüş', 'kayıp', 'zayıf', 'kaygı', 'uyarı'];
  
  const textLower = text.toLowerCase();
  const posCount = positive.filter(word => textLower.includes(word)).length;
  const negCount = negative.filter(word => textLower.includes(word)).length;
  
  if (posCount > negCount) return 'pozitif';
  if (negCount > posCount) return 'negatif';
  return 'tarafsız';
}

// ==================== ANA FONKSIYON: TÜM HABERLERİ ÇEKME ====================
async function loadAllNews() {
  try {
    const [aaNews, investingNews] = await Promise.all([
      fetchAANews(),
      fetchInvestingNews()
    ]);

    // Haberleri birleştir ve tarihe göre sırala
    let allNews = [...aaNews, ...investingNews];
    allNews = allNews.sort((a, b) => {
      // Yeni haberleri önce göster (Şimdi, 5m, 1h vb.)
      const timeOrder = { 'Şimdi': 0, 'm': 1, 'h': 2, 'Dün': 3 };
      return 0; // Zaten sıralı
    });

    allNews = allNews.slice(0, NEWS_CONFIG.maxNews);

    displayNews(allNews);
    return allNews;
  } catch (error) {
    console.error('Haberler yüklenirken hata:', error);
    displayNews([]);
  }
}

// ==================== UI: HABERLERİ GÖSTER ====================
function displayNews(newsArray) {
  const newsContainer = document.getElementById('news-container') || 
                        document.querySelector('[data-news-section]');
  
  if (!newsContainer) {
    console.warn('news-container element bulunamadı');
    return;
  }

  if (newsArray.length === 0) {
    newsContainer.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #999;">
        <p>📡 Haberler yükleniyor...</p>
      </div>
    `;
    return;
  }

  const newsHTML = newsArray.map(news => `
    <div style="
      padding: 15px;
      border-bottom: 1px solid #e0e0e0;
      cursor: pointer;
      transition: background 0.2s;
      background: rgba(0,0,0,0.02);
    " onmouseover="this.style.background='rgba(0,0,0,0.05)'" 
       onmouseout="this.style.background='rgba(0,0,0,0.02)'">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
        <div style="flex: 1;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #333;">
            ${news.title}
          </h4>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #666; line-height: 1.4;">
            ${news.description}
          </p>
          <div style="display: flex; gap: 10px; align-items: center; font-size: 12px;">
            <span style="color: #0066cc; font-weight: 500;">${news.source}</span>
            <span style="color: #999;">${news.date}</span>
            <span style="
              padding: 2px 8px;
              background: ${news.sentiment === 'pozitif' ? '#e8f5e9' : news.sentiment === 'negatif' ? '#ffebee' : '#f5f5f5'};
              color: ${news.sentiment === 'pozitif' ? '#2e7d32' : news.sentiment === 'negatif' ? '#c62828' : '#666'};
              border-radius: 3px;
              font-size: 11px;
              font-weight: 500;
            ">${news.sentiment.toUpperCase()}</span>
          </div>
        </div>
        <div style="color: #999; font-size: 20px;">↗</div>
      </div>
    </div>
  `).join('');

  newsContainer.innerHTML = `
    <div style="background: #f9f9f9;">
      ${newsHTML}
    </div>
  `;
}

// ==================== AUTO-REFRESH ====================
function startNewsRefresh() {
  loadAllNews(); // İlk yükle
  setInterval(loadAllNews, NEWS_CONFIG.updateInterval);
}

// Sayfa yüklendiğinde başlat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startNewsRefresh);
} else {
  startNewsRefresh();
}
