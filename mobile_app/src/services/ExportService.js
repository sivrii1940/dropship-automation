import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

class ExportService {
  // CSV formatına çevir
  convertToCSV(data, headers) {
    if (!data || data.length === 0) {
      return '';
    }

    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  // Ürünleri CSV olarak export et
  async exportProductsToCSV(products) {
    try {
      if (!products || products.length === 0) {
        Alert.alert('Uyarı', 'Export edilecek ürün bulunamadı');
        return false;
      }

      const headers = [
        'id',
        'name',
        'brand_name',
        'category_name',
        'trendyol_price',
        'shopify_price',
        'stock_status',
        'quantity',
        'is_synced_to_shopify',
        'trendyol_url',
      ];

      const csv = this.convertToCSV(products, headers);
      const fileName = `urunler_${Date.now()}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Ürünleri Paylaş',
        });
        return true;
      } else {
        Alert.alert('Başarılı', `Dosya kaydedildi: ${fileName}`);
        return true;
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Hata', 'Export işlemi başarısız oldu');
      return false;
    }
  }

  // Siparişleri CSV olarak export et
  async exportOrdersToCSV(orders) {
    try {
      if (!orders || orders.length === 0) {
        Alert.alert('Uyarı', 'Export edilecek sipariş bulunamadı');
        return false;
      }

      const headers = [
        'id',
        'shopify_order_number',
        'status',
        'customer_name',
        'customer_email',
        'total_price',
        'created_at',
        'tracking_number',
        'carrier_name',
      ];

      const csv = this.convertToCSV(orders, headers);
      const fileName = `siparisler_${Date.now()}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Siparişleri Paylaş',
        });
        return true;
      } else {
        Alert.alert('Başarılı', `Dosya kaydedildi: ${fileName}`);
        return true;
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Hata', 'Export işlemi başarısız oldu');
      return false;
    }
  }

  // Raporları JSON olarak export et
  async exportReportToJSON(reportData, reportName = 'rapor') {
    try {
      if (!reportData) {
        Alert.alert('Uyarı', 'Export edilecek rapor verisi bulunamadı');
        return false;
      }

      const json = JSON.stringify(reportData, null, 2);
      const fileName = `${reportName}_${Date.now()}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Raporu Paylaş',
        });
        return true;
      } else {
        Alert.alert('Başarılı', `Dosya kaydedildi: ${fileName}`);
        return true;
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Hata', 'Export işlemi başarısız oldu');
      return false;
    }
  }

  // HTML rapor oluştur
  generateHTMLReport(title, data) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #3b82f6;
      color: white;
      font-weight: bold;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .stat-card {
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #3b82f6;
    }
    .stat-label {
      color: #64748b;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <p>Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}</p>
    ${JSON.stringify(data, null, 2)}
  </div>
</body>
</html>
    `;
  }

  // HTML raporu export et
  async exportHTMLReport(title, data) {
    try {
      const html = this.generateHTMLReport(title, data);
      const fileName = `${title.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.html`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, html, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/html',
          dialogTitle: 'Raporu Paylaş',
        });
        return true;
      } else {
        Alert.alert('Başarılı', `Dosya kaydedildi: ${fileName}`);
        return true;
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Hata', 'Export işlemi başarısız oldu');
      return false;
    }
  }
}

export default new ExportService();
