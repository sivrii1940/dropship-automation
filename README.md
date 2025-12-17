# DropFlow - E-Commerce Automation Platform

<div align="center">
  <img src="assets/logo.svg" alt="DropFlow Logo" width="200"/>
  
  **Professional Dropshipping Automation System**
  
  Shopify ↔ Trendyol Integration Platform
  
  [![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com)
  [![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
  [![Status](https://img.shields.io/badge/status-production-success.svg)](https://github.com)
</div>

---

## Overview

**DropFlow** is a comprehensive automation platform designed for e-commerce businesses operating between Shopify and Trendyol marketplaces. It streamlines the entire dropshipping workflow from product sourcing to order fulfillment.

### Key Features

#### Core Automation
- **Real-time Order Sync** - Webhook-based instant order notifications
- **Automated Product Import** - Selenium-powered Trendyol scraping
- **Order Processing** - Automated order placement on Trendyol
- **Multi-store Management** - Handle multiple Shopify stores
- **Stock Synchronization** - Real-time inventory updates

#### Platform Components
- **REST API Backend** - FastAPI-powered microservices architecture
- **Mobile Application** - React Native/Expo cross-platform app
- **Web Dashboard** - Desktop management interface
- **Database** - SQLite with optimized queries

#### Advanced Features
- **Webhook System** - HMAC-SHA256 secured webhooks
- **Authentication** - JWT token-based security
- **Offline Mode** - AsyncStorage caching
- **Push Notifications** - Expo Notifications integration
- **Report Generation** - Excel/PDF export capabilities

---

## Architecture

### Technology Stack

**Backend (Python 3.11+)**
```
FastAPI 0.104.1       → Web framework
Selenium 4.15.2       → Web automation
SQLite3               → Database
PyJWT 2.8.0           → Authentication
ShopifyAPI 12.7.0     → Shopify integration
```

**Frontend (React Native)**
```
Expo SDK 54           → Mobile framework
React Navigation 7    → Navigation
AsyncStorage          → Offline storage
Axios                 → HTTP client
React Native Paper    → UI components
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or yarn
- Chrome/Firefox browser (for Selenium)

### Backend Setup

```bash
# Navigate to backend directory
cd dropship_app

# Install dependencies
pip install -r requirements.txt

# Start API server
python api.py
```

**API will be available at:** `http://localhost:8000`
**API Documentation:** `http://localhost:8000/docs`

### Mobile App Setup

```bash
# Navigate to mobile directory
cd mobile_app

# Install dependencies
npm install

# Start Expo server
npx expo start
```

---

## Configuration

### Environment Variables

```bash
# API Configuration
API_HOST=localhost
API_PORT=8000

# Shopify Webhook Secret
SHOPIFY_WEBHOOK_SECRET=your_secret_key_here

# Database
DATABASE_PATH=database/dropship.db
```

### Webhook Setup

1. **Generate Public URL**
   ```bash
   ngrok http 8000
   ```

2. **Configure Shopify Webhook**
   - URL: `https://your-domain/api/webhooks/shopify/orders/create`
   - Event: Order creation
   - Format: JSON

3. **Set Webhook Secret**
   ```bash
   export SHOPIFY_WEBHOOK_SECRET=your_secret
   ```

---

## API Endpoints

### Authentication
```
POST /api/auth/login          - User login
POST /api/auth/register       - User registration
POST /api/auth/logout         - User logout
```

### Sellers
```
GET    /api/sellers           - List all sellers
POST   /api/sellers           - Add new seller
DELETE /api/sellers/{id}      - Remove seller
POST   /api/sellers/{id}/sync - Sync seller products
```

### Products
```
GET    /api/products          - List products
GET    /api/products/{id}     - Get product details
POST   /api/products          - Create product
PUT    /api/products/{id}     - Update product
DELETE /api/products/{id}     - Delete product
```

### Orders
```
GET    /api/orders            - List orders
GET    /api/orders/{id}       - Get order details
POST   /api/orders/{id}/process - Process order to Trendyol
PUT    /api/orders/{id}       - Update order status
```

### Webhooks
```
POST   /api/webhooks/shopify/orders/create - Shopify order webhook
GET    /api/webhooks/shopify/test          - Test webhook connection
GET    /api/webhooks/logs                  - View webhook logs
DELETE /api/webhooks/logs/{id}             - Delete webhook log
POST   /api/webhooks/logs/clear            - Clear all logs
```

---

## Mobile Application

### Features

#### Dashboard
- Real-time statistics
- Order overview
- Sales charts
- Quick actions

#### Product Management
- Product listing with search
- Product details view
- Image management
- Stock tracking

#### Seller Management
- Add Trendyol sellers
- Automatic product import
- Seller synchronization
- Product count tracking

#### Order Processing
- Order list with filters
- Order detail view
- Status management
- Trendyol automation

#### Reports
- Sales reports (daily/weekly/monthly)
- Profit analysis
- Top products
- Export to Excel/PDF

#### Settings
- Shopify store configuration
- Trendyol credentials
- Notification preferences
- Account management

---

## Security

### Authentication
- JWT token-based authentication
- Token expiration (24 hours)
- Secure password hashing (bcrypt)
- Rate limiting on login attempts

### Webhooks
- HMAC-SHA256 signature verification
- Timing attack protection
- Shop domain validation
- Request payload integrity check

### API Security
- CORS configuration
- SQL injection prevention
- Input validation
- Error handling without data exposure

---

## Database Schema

### Tables

**users** - User accounts
```sql
id, email, password_hash, full_name, created_at
```

**sellers** - Trendyol sellers
```sql
id, user_id, trendyol_seller_id, name, url, product_count, note
```

**products** - Product catalog
```sql
id, user_id, seller_id, trendyol_id, shopify_product_id, 
title, description, price, stock_quantity, images, status
```

**orders** - Order records
```sql
id, user_id, shopify_order_id, order_number, customer_name,
customer_email, total_price, status, trendyol_order_placed
```

**webhook_logs** - Webhook audit trail
```sql
id, topic, shop_domain, payload, status, response, created_at
```

**settings** - User preferences
```sql
id, user_id, key, value
```

---

## Performance Optimization

### Backend
- Database query optimization
- Connection pooling
- Async request handling
- Background task processing
- Response caching

### Mobile App
- React.memo for components
- useMemo and useCallback hooks
- FlatList optimization
- Image lazy loading
- Offline caching with AsyncStorage

---

## Deployment

### Production Checklist

**Backend**
- [ ] Set production database
- [ ] Configure environment variables
- [ ] Set up HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set webhook secrets
- [ ] Enable logging
- [ ] Set up monitoring

**Mobile App**
- [ ] Build production APK/IPA
- [ ] Configure API endpoints
- [ ] Test offline mode
- [ ] Enable push notifications
- [ ] Submit to app stores

**Infrastructure**
- [ ] Deploy to cloud (AWS/Azure/GCP)
- [ ] Set up load balancing
- [ ] Configure auto-scaling
- [ ] Set up database backups
- [ ] Configure monitoring/alerting

---

## Documentation

| Document | Description |
|----------|-------------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | Quick start guide |
| [SELLER_MANAGEMENT.md](SELLER_MANAGEMENT.md) | Adding Trendyol sellers |
| [WEBHOOK_SETUP.md](WEBHOOK_SETUP.md) | Webhook configuration |
| [TRENDYOL_CREDENTIALS.md](TRENDYOL_CREDENTIALS.md) | Trendyol account setup |
| [API_REFERENCE.md](API_REFERENCE.md) | Complete API documentation |

---

## Support

### Getting Help
- **Documentation:** Check the docs folder
- **API Docs:** http://localhost:8000/docs
- **Issues:** GitHub Issues
- **Email:** support@dropflow.com

### Common Issues

**API not starting?**
```bash
pip install -r requirements.txt --upgrade
python api.py
```

**Mobile app crashes?**
```bash
cd mobile_app
rm -rf node_modules
npm install
npx expo start --clear
```

**Webhook not working?**
1. Check HTTPS is enabled
2. Verify webhook secret matches
3. Check firewall/port settings
4. Review webhook logs

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Project Status

**Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** December 2025

### Completed Features (17/17)
- [x] Shopify Integration
- [x] Trendyol Scraping
- [x] Order Automation
- [x] Webhook System
- [x] Multi-store Support
- [x] Push Notifications
- [x] Offline Mode
- [x] Report Generation
- [x] Mobile Application
- [x] REST API
- [x] Authentication
- [x] Seller Management
- [x] Product Management
- [x] Order Processing
- [x] Error Handling
- [x] Performance Optimization
- [x] Security Implementation

---

## Acknowledgments

Built with:
- FastAPI
- React Native
- Expo
- Selenium
- SQLite

---

<div align="center">
  <strong>DropFlow</strong> - Professional E-Commerce Automation
  
  Made with precision and care
  
  © 2025 DropFlow. All rights reserved.
</div>
