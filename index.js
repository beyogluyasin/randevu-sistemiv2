const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const morgan = require('morgan');
const app = express();
const port = 3000;

// stdout buffering'i devre dışı bırakmak
process.stdout.write = (function (write) {
  return function (string, encoding, fd) {
    if (Buffer.isBuffer(string)) {
      string = string.toString();
    }
    return write.call(process.stdout, string, encoding, fd);
  };
})(process.stdout.write);

// CORS'u aktif etmek için middleware
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions)); // CORS'u aktif ediyoruz

// JSON verisini parse etmek
app.use(express.json());

// morgan loglarını başta aktif et
app.use(morgan('dev', { 
  stream: process.stdout, // Anında logları stdout'a yazdır
  immediate: true // Bu seçenek logların hemen yazılmasını sağlamak için
}));

// MySQL bağlantısı
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'appointment_system',
  port: 3306
});

db.connect((err) => {
  if (err) {
    console.error('MySQL bağlantı hatası: ' + err.stack);
    return;
  }
  console.log('MySQL bağlantısı başarılı!');
});

// Test endpointi
app.get('/', (req, res) => {
  res.send('Sunucu çalışıyor!');
});

// Randevuları listeleme
app.get('/appointments', (req, res) => {
  const sql = 'SELECT * FROM appointment ORDER BY start_time'; // appointment tablosu
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Veritabanı hatası:', err.message);
      return res.status(500).send('Veritabanı hatası: ' + err.message);
    }
    res.json(results);
  });
});

// Randevu ekleme
app.post('/add-appointment', (req, res) => {
  console.log('Gelen Veri:', req.body); // Gelen veriyi logla
  const { title, start_time, end_time, description } = req.body;

  if (!title || !start_time || !end_time) {
    return res.status(400).json({ message: 'Randevu eklemek için "title", "start_time" ve "end_time" gereklidir.' });
  }

  // Çakışma kontrolü: Mevcut randevularla zaman çakışmasını kontrol et
  const checkConflictSql = `
    SELECT * FROM appointment 
    WHERE (start_time < ? AND end_time > ?) 
    OR (start_time < ? AND end_time > ?)
  `;
  
  db.query(checkConflictSql, [end_time, start_time, start_time, end_time], (err, results) => {
    if (err) {
      console.error('Çakışma kontrol hatası:', err);
      return res.status(500).json({ message: 'Randevu eklenemedi, hata oluştu.' });
    }

    // Eğer çakışma varsa, hata mesajı gönder
    if (results.length > 0) {
      return res.status(400).json({ message: 'Bu tarihe ve saate başka bir randevu mevcut.' });
    }

    // Çakışma yoksa, yeni randevuyu ekle
    const sql = 'INSERT INTO appointment (title, start_time, end_time, description) VALUES (?, ?, ?, ?)';
    db.query(sql, [title, start_time, end_time, description], (err, result) => {
      if (err) {
        console.error('Veritabanı hatası:', err);
        return res.status(500).json({ message: 'Randevu eklenemedi!' });
      }
      res.status(200).json({ message: 'Randevu başarıyla eklendi!' });
    });
  });
});

// Sunucuyu başlat
app.listen(port, () => {
  console.log(`Sunucu http://localhost:${port} adresinde çalışıyor.`);
});
