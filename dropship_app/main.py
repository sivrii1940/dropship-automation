"""
Dropship Otomasyon Sistemi - Masaüstü Uygulaması
Trendyol → Shopify Entegrasyonu
"""
import customtkinter as ctk
from tkinter import messagebox, ttk
import tkinter as tk
from PIL import Image
import threading
import os
import sys
import json
from datetime import datetime

# Modüller
from models import init_database, Seller, Product, Order, Settings, ActivityLog, get_db_connection
from trendyol_scraper import get_scraper, TrendyolScraper
from shopify_api import get_shopify_api, ShopifyAPI, ProductUploader
from stock_sync import get_stock_sync_manager, StockSyncManager
from config import PRICING_CONFIG

# Tema ayarları
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")


class DropshipApp(ctk.CTk):
    """Ana uygulama penceresi"""
    
    def __init__(self):
        super().__init__()
        
        # Pencere ayarları
        self.title("Dropship Otomasyon Sistemi")
        self.geometry("1400x800")
        self.minsize(1200, 700)
        
        # Veritabanını başlat
        init_database()
        
        # Scraper ve API
        self.scraper = get_scraper()
        
        # Ana layout
        self.setup_layout()
        
        # İlk sayfa
        self.show_dashboard()
        
        # Dolar kurunu güncelle
        self.update_currency_display()
    
    def setup_layout(self):
        """Ana layout'u oluştur"""
        # Grid yapılandırması
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)
        
        # Sol sidebar
        self.sidebar = ctk.CTkFrame(self, width=220, corner_radius=0)
        self.sidebar.grid(row=0, column=0, sticky="nsew")
        self.sidebar.grid_rowconfigure(10, weight=1)
        
        # Logo
        self.logo_label = ctk.CTkLabel(
            self.sidebar, 
            text="🛒 Dropship\nOtomasyon",
            font=ctk.CTkFont(size=24, weight="bold")
        )
        self.logo_label.grid(row=0, column=0, padx=20, pady=(30, 30))
        
        # Menü butonları
        self.menu_buttons = {}
        menu_items = [
            ("dashboard", "📊 Dashboard", self.show_dashboard),
            ("sellers", "🏪 Satıcılar", self.show_sellers),
            ("products", "📦 Ürünler", self.show_products),
            ("orders", "🛒 Siparişler", self.show_orders),
            ("settings", "⚙️ Ayarlar", self.show_settings),
        ]
        
        for i, (key, text, command) in enumerate(menu_items):
            btn = ctk.CTkButton(
                self.sidebar,
                text=text,
                font=ctk.CTkFont(size=14),
                height=45,
                anchor="w",
                command=command,
                fg_color="transparent",
                text_color=("gray10", "gray90"),
                hover_color=("gray70", "gray30")
            )
            btn.grid(row=i+1, column=0, padx=10, pady=5, sticky="ew")
            self.menu_buttons[key] = btn
        
        # Alt bilgi - Dolar kuru
        self.currency_label = ctk.CTkLabel(
            self.sidebar,
            text="$ Kur: Yükleniyor...",
            font=ctk.CTkFont(size=12),
            text_color="gray"
        )
        self.currency_label.grid(row=11, column=0, padx=20, pady=(10, 20), sticky="s")
        
        # Ana içerik alanı
        self.main_frame = ctk.CTkFrame(self, corner_radius=0, fg_color="transparent")
        self.main_frame.grid(row=0, column=1, sticky="nsew", padx=20, pady=20)
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(1, weight=1)
    
    def update_currency_display(self):
        """Dolar kurunu güncelle"""
        try:
            rate = self.scraper.get_currency_rate()
            self.currency_label.configure(text=f"$ Kur: {rate} ₺")
        except:
            self.currency_label.configure(text="$ Kur: --")
    
    def set_active_menu(self, active_key):
        """Aktif menü butonunu vurgula"""
        for key, btn in self.menu_buttons.items():
            if key == active_key:
                btn.configure(fg_color=("gray75", "gray25"))
            else:
                btn.configure(fg_color="transparent")
    
    def clear_main_frame(self):
        """Ana içerik alanını temizle"""
        for widget in self.main_frame.winfo_children():
            widget.destroy()
    
    # ============ DASHBOARD ============
    
    def show_dashboard(self):
        """Dashboard sayfasını göster"""
        self.clear_main_frame()
        self.set_active_menu("dashboard")
        
        # Başlık
        title = ctk.CTkLabel(
            self.main_frame,
            text="Dashboard",
            font=ctk.CTkFont(size=28, weight="bold")
        )
        title.grid(row=0, column=0, sticky="w", pady=(0, 20))
        
        # İstatistik kartları
        stats_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        stats_frame.grid(row=1, column=0, sticky="nsew")
        stats_frame.grid_columnconfigure((0, 1, 2, 3), weight=1)
        
        # İstatistikleri al
        stats = self.get_dashboard_stats()
        
        stat_cards = [
            ("📦 Toplam Ürün", str(stats['total_products']), f"{stats['synced_products']} Shopify'da", "#3b82f6"),
            ("⏳ Bekleyen Sipariş", str(stats['pending_orders']), f"{stats['total_orders']} toplam", "#f97316"),
            ("🏪 Aktif Satıcı", str(stats['total_sellers']), "Trendyol satıcıları", "#8b5cf6"),
            ("💵 Dolar Kuru", f"{self.scraper.get_currency_rate()} ₺", "Güncel kur", "#22c55e"),
        ]
        
        for i, (title_text, value, subtitle, color) in enumerate(stat_cards):
            card = ctk.CTkFrame(stats_frame)
            card.grid(row=0, column=i, padx=10, pady=10, sticky="nsew")
            
            ctk.CTkLabel(card, text=title_text, font=ctk.CTkFont(size=14), text_color="gray").pack(pady=(15, 5))
            ctk.CTkLabel(card, text=value, font=ctk.CTkFont(size=36, weight="bold")).pack()
            ctk.CTkLabel(card, text=subtitle, font=ctk.CTkFont(size=12), text_color="gray").pack(pady=(5, 15))
        
        # Alt bölüm - Hızlı işlemler ve son aktiviteler
        bottom_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        bottom_frame.grid(row=2, column=0, sticky="nsew", pady=(20, 0))
        bottom_frame.grid_columnconfigure((0, 1), weight=1)
        bottom_frame.grid_rowconfigure(0, weight=1)
        
        # Hızlı işlemler
        quick_frame = ctk.CTkFrame(bottom_frame)
        quick_frame.grid(row=0, column=0, padx=(0, 10), sticky="nsew")
        
        ctk.CTkLabel(quick_frame, text="⚡ Hızlı İşlemler", font=ctk.CTkFont(size=18, weight="bold")).pack(pady=15, padx=15, anchor="w")
        
        ctk.CTkButton(quick_frame, text="🔄 Siparişleri Kontrol Et", command=self.sync_orders_action, height=40).pack(fill="x", padx=15, pady=5)
        ctk.CTkButton(quick_frame, text="🏪 Yeni Satıcı Ekle", command=self.show_sellers, height=40).pack(fill="x", padx=15, pady=5)
        ctk.CTkButton(quick_frame, text="📦 Ürünleri Görüntüle", command=self.show_products, height=40).pack(fill="x", padx=15, pady=5)
        
        # Fiyat hesaplayıcı
        calc_frame = ctk.CTkFrame(quick_frame)
        calc_frame.pack(fill="x", padx=15, pady=15)
        
        ctk.CTkLabel(calc_frame, text="💰 Fiyat Hesaplayıcı", font=ctk.CTkFont(size=14, weight="bold")).pack(pady=10)
        
        input_frame = ctk.CTkFrame(calc_frame, fg_color="transparent")
        input_frame.pack(fill="x", padx=10)
        
        ctk.CTkLabel(input_frame, text="Trendyol (TL):").grid(row=0, column=0, padx=5, pady=5)
        self.calc_trendyol = ctk.CTkEntry(input_frame, width=100)
        self.calc_trendyol.grid(row=0, column=1, padx=5, pady=5)
        
        ctk.CTkLabel(input_frame, text="Marj (%):").grid(row=0, column=2, padx=5, pady=5)
        self.calc_margin = ctk.CTkEntry(input_frame, width=60)
        self.calc_margin.insert(0, "50")
        self.calc_margin.grid(row=0, column=3, padx=5, pady=5)
        
        ctk.CTkButton(input_frame, text="Hesapla", width=80, command=self.calculate_price).grid(row=0, column=4, padx=10, pady=5)
        
        self.calc_result = ctk.CTkLabel(calc_frame, text="Shopify: $0.00", font=ctk.CTkFont(size=18, weight="bold"), text_color="#22c55e")
        self.calc_result.pack(pady=10)
        
        # Son aktiviteler
        activity_frame = ctk.CTkFrame(bottom_frame)
        activity_frame.grid(row=0, column=1, padx=(10, 0), sticky="nsew")
        
        ctk.CTkLabel(activity_frame, text="📋 Son Aktiviteler", font=ctk.CTkFont(size=18, weight="bold")).pack(pady=15, padx=15, anchor="w")
        
        logs = ActivityLog.get_recent(10)
        
        logs_scroll = ctk.CTkScrollableFrame(activity_frame, height=250)
        logs_scroll.pack(fill="both", expand=True, padx=15, pady=(0, 15))
        
        if logs:
            for log in logs:
                log_item = ctk.CTkFrame(logs_scroll, fg_color=("gray85", "gray20"))
                log_item.pack(fill="x", pady=2)
                
                status_color = "#22c55e" if log['status'] == 'success' else "#ef4444"
                ctk.CTkLabel(log_item, text="●", text_color=status_color, width=20).pack(side="left", padx=5)
                ctk.CTkLabel(log_item, text=log['action'], font=ctk.CTkFont(size=12)).pack(side="left", padx=5)
                ctk.CTkLabel(log_item, text=log['created_at'][:16] if log['created_at'] else '', font=ctk.CTkFont(size=10), text_color="gray").pack(side="right", padx=5)
        else:
            ctk.CTkLabel(logs_scroll, text="Henüz aktivite yok", text_color="gray").pack(pady=20)
    
    def get_dashboard_stats(self):
        """Dashboard istatistiklerini al"""
        conn = get_db_connection()
        stats = {
            'total_products': conn.execute('SELECT COUNT(*) FROM products').fetchone()[0],
            'synced_products': conn.execute('SELECT COUNT(*) FROM products WHERE is_synced_to_shopify = 1').fetchone()[0],
            'total_orders': conn.execute('SELECT COUNT(*) FROM orders').fetchone()[0],
            'pending_orders': conn.execute("SELECT COUNT(*) FROM orders WHERE status = 'pending'").fetchone()[0],
            'total_sellers': conn.execute('SELECT COUNT(*) FROM sellers').fetchone()[0],
        }
        conn.close()
        return stats
    
    def calculate_price(self):
        """Fiyat hesapla"""
        try:
            trendyol_price = float(self.calc_trendyol.get())
            margin = float(self.calc_margin.get())
            rate = self.scraper.get_currency_rate()
            
            shopify_price = self.scraper.calculate_shopify_price(trendyol_price, margin)
            self.calc_result.configure(text=f"Shopify: ${shopify_price:.2f}")
        except:
            self.calc_result.configure(text="Geçersiz değer")
    
    def sync_orders_action(self):
        """Siparişleri senkronize et"""
        try:
            api = get_shopify_api()
            orders = api.get_new_orders()
            
            created = 0
            for order_data in orders:
                Order.create(order_data)
                created += 1
            
            if created > 0:
                ActivityLog.log('orders_synced', f'{created} yeni sipariş alındı')
                messagebox.showinfo("Başarılı", f"{created} yeni sipariş alındı!")
            else:
                messagebox.showinfo("Bilgi", "Yeni sipariş yok")
                
        except Exception as e:
            messagebox.showerror("Hata", f"Sipariş senkronizasyon hatası:\n{str(e)}")
    
    # ============ SATICILAR ============
    
    def show_sellers(self):
        """Satıcılar sayfasını göster"""
        self.clear_main_frame()
        self.set_active_menu("sellers")
        
        # Başlık
        header_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        header_frame.grid(row=0, column=0, sticky="ew", pady=(0, 20))
        header_frame.grid_columnconfigure(0, weight=1)
        
        ctk.CTkLabel(header_frame, text="Trendyol Satıcıları", font=ctk.CTkFont(size=28, weight="bold")).grid(row=0, column=0, sticky="w")
        
        ctk.CTkButton(header_frame, text="➕ Yeni Satıcı Ekle", command=self.add_seller_dialog).grid(row=0, column=1)
        
        # Satıcı listesi
        sellers_frame = ctk.CTkScrollableFrame(self.main_frame)
        sellers_frame.grid(row=1, column=0, sticky="nsew")
        sellers_frame.grid_columnconfigure((0, 1, 2), weight=1)
        
        sellers = Seller.get_all()
        
        if sellers:
            for i, seller in enumerate(sellers):
                card = ctk.CTkFrame(sellers_frame)
                card.grid(row=i//3, column=i%3, padx=10, pady=10, sticky="nsew")
                
                # Satıcı bilgileri
                ctk.CTkLabel(card, text="🏪", font=ctk.CTkFont(size=40)).pack(pady=(20, 10))
                ctk.CTkLabel(card, text=seller['name'] or f"Satıcı #{seller['trendyol_seller_id']}", font=ctk.CTkFont(size=16, weight="bold")).pack()
                ctk.CTkLabel(card, text=f"ID: {seller['trendyol_seller_id']}", text_color="gray").pack()
                
                if seller['last_sync']:
                    ctk.CTkLabel(card, text=f"Son sync: {seller['last_sync'][:16]}", text_color="gray", font=ctk.CTkFont(size=11)).pack(pady=5)
                else:
                    ctk.CTkLabel(card, text="⚠️ Henüz senkronize edilmedi", text_color="#f97316", font=ctk.CTkFont(size=11)).pack(pady=5)
                
                # Butonlar
                btn_frame = ctk.CTkFrame(card, fg_color="transparent")
                btn_frame.pack(pady=15, fill="x", padx=15)
                
                ctk.CTkButton(btn_frame, text="🔄 Sync", width=80, command=lambda s=seller: self.sync_seller(s['id'])).pack(side="left", padx=5)
                ctk.CTkButton(btn_frame, text="📦 Ürünler", width=80, fg_color="#22c55e", command=lambda s=seller: self.show_products_filtered(s['id'])).pack(side="left", padx=5)
        else:
            ctk.CTkLabel(sellers_frame, text="Henüz satıcı eklenmemiş\n\nYukarıdaki 'Yeni Satıcı Ekle' butonuna tıklayın", font=ctk.CTkFont(size=16), text_color="gray").pack(pady=50)
    
    def add_seller_dialog(self):
        """Satıcı ekleme dialogu"""
        dialog = ctk.CTkInputDialog(
            text="Trendyol Satıcı ID'sini girin:",
            title="Yeni Satıcı Ekle"
        )
        seller_id = dialog.get_input()
        
        if seller_id:
            try:
                seller_id = int(seller_id)
                result = Seller.create(seller_id)
                
                if result:
                    ActivityLog.log('seller_added', f'Satıcı eklendi: {seller_id}')
                    messagebox.showinfo("Başarılı", f"Satıcı {seller_id} eklendi!")
                    self.show_sellers()
                else:
                    messagebox.showwarning("Uyarı", "Bu satıcı zaten mevcut!")
            except ValueError:
                messagebox.showerror("Hata", "Geçersiz satıcı ID!")
    
    def sync_seller(self, seller_id):
        """Satıcı ürünlerini senkronize et"""
        seller = Seller.get_by_id(seller_id)
        if not seller:
            return
        
        # Progress dialog
        progress_window = ctk.CTkToplevel(self)
        progress_window.title("Senkronizasyon")
        progress_window.geometry("400x150")
        progress_window.transient(self)
        progress_window.grab_set()
        
        ctk.CTkLabel(progress_window, text=f"Satıcı {seller['trendyol_seller_id']} ürünleri çekiliyor...", font=ctk.CTkFont(size=14)).pack(pady=20)
        progress = ctk.CTkProgressBar(progress_window, width=300)
        progress.pack(pady=10)
        progress.set(0)
        status_label = ctk.CTkLabel(progress_window, text="Başlatılıyor...", text_color="gray")
        status_label.pack()
        
        def sync_thread():
            try:
                def progress_callback(current, total):
                    progress.set(current / total)
                    status_label.configure(text=f"{current}/{total} sayfa işlendi")
                
                products = self.scraper.scrape_seller_products(
                    seller['trendyol_seller_id'],
                    progress_callback=progress_callback
                )
                
                saved = 0
                for product in products:
                    product['seller_id'] = seller_id
                    Product.create_or_update(product)
                    saved += 1
                
                Seller.update_last_sync(seller_id)
                ActivityLog.log('products_synced', f'{saved} ürün senkronize edildi')
                
                progress_window.destroy()
                messagebox.showinfo("Başarılı", f"{saved} ürün senkronize edildi!")
                self.show_sellers()
                
            except Exception as e:
                progress_window.destroy()
                messagebox.showerror("Hata", f"Senkronizasyon hatası:\n{str(e)}")
        
        threading.Thread(target=sync_thread, daemon=True).start()
    
    def show_products_filtered(self, seller_id):
        """Belirli satıcının ürünlerini göster"""
        self.current_seller_filter = seller_id
        self.show_products()
    
    # ============ ÜRÜNLER ============
    
    def show_products(self):
        """Ürünler sayfasını göster"""
        self.clear_main_frame()
        self.set_active_menu("products")
        
        if not hasattr(self, 'current_seller_filter'):
            self.current_seller_filter = None
        
        # Başlık ve filtreler
        header_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        header_frame.grid(row=0, column=0, sticky="ew", pady=(0, 10))
        header_frame.grid_columnconfigure(1, weight=1)
        
        ctk.CTkLabel(header_frame, text="Ürün Yönetimi", font=ctk.CTkFont(size=28, weight="bold")).grid(row=0, column=0, sticky="w")
        
        # Filtreler
        filter_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        filter_frame.grid(row=0, column=1, sticky="e")
        
        sellers = Seller.get_all()
        seller_options = ["Tüm Satıcılar"] + [s['name'] or f"Satıcı #{s['trendyol_seller_id']}" for s in sellers]
        
        self.seller_filter = ctk.CTkComboBox(filter_frame, values=seller_options, width=200, command=self.filter_products)
        self.seller_filter.grid(row=0, column=0, padx=5)
        
        ctk.CTkButton(filter_frame, text="📤 Seçilileri Shopify'a Yükle", command=self.upload_selected_products, fg_color="#22c55e").grid(row=0, column=1, padx=5)
        
        # Ürün tablosu
        table_frame = ctk.CTkFrame(self.main_frame)
        table_frame.grid(row=1, column=0, sticky="nsew")
        table_frame.grid_columnconfigure(0, weight=1)
        table_frame.grid_rowconfigure(0, weight=1)
        
        # Treeview
        columns = ("select", "id", "name", "brand", "trendyol_price", "margin", "shopify_price", "status")
        
        style = ttk.Style()
        style.configure("Custom.Treeview", rowheight=35, font=('Helvetica', 11))
        style.configure("Custom.Treeview.Heading", font=('Helvetica', 12, 'bold'))
        
        self.product_tree = ttk.Treeview(table_frame, columns=columns, show="headings", style="Custom.Treeview")
        
        self.product_tree.heading("select", text="✓")
        self.product_tree.heading("id", text="ID")
        self.product_tree.heading("name", text="Ürün Adı")
        self.product_tree.heading("brand", text="Marka")
        self.product_tree.heading("trendyol_price", text="Trendyol (TL)")
        self.product_tree.heading("margin", text="Marj (%)")
        self.product_tree.heading("shopify_price", text="Shopify ($)")
        self.product_tree.heading("status", text="Durum")
        
        self.product_tree.column("select", width=40, anchor="center")
        self.product_tree.column("id", width=60, anchor="center")
        self.product_tree.column("name", width=350)
        self.product_tree.column("brand", width=120)
        self.product_tree.column("trendyol_price", width=100, anchor="center")
        self.product_tree.column("margin", width=80, anchor="center")
        self.product_tree.column("shopify_price", width=100, anchor="center")
        self.product_tree.column("status", width=100, anchor="center")
        
        scrollbar = ttk.Scrollbar(table_frame, orient="vertical", command=self.product_tree.yview)
        self.product_tree.configure(yscrollcommand=scrollbar.set)
        
        self.product_tree.grid(row=0, column=0, sticky="nsew")
        scrollbar.grid(row=0, column=1, sticky="ns")
        
        # Tıklama eventi
        self.product_tree.bind("<Double-1>", self.edit_product_margin)
        
        # Alt bilgi - load_products'tan ÖNCE oluştur
        self.product_info_label = ctk.CTkLabel(self.main_frame, text="", font=ctk.CTkFont(size=12), text_color="gray")
        self.product_info_label.grid(row=2, column=0, sticky="w", pady=10)
        
        # Toplu marj ayarlama
        margin_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        margin_frame.grid(row=3, column=0, sticky="w")
        
        ctk.CTkLabel(margin_frame, text="Toplu Marj:").pack(side="left", padx=5)
        self.bulk_margin_entry = ctk.CTkEntry(margin_frame, width=60)
        self.bulk_margin_entry.insert(0, "50")
        self.bulk_margin_entry.pack(side="left", padx=5)
        ctk.CTkButton(margin_frame, text="Uygula", width=80, command=self.apply_bulk_margin).pack(side="left", padx=5)
        
        # Ürünleri yükle - TÜM widget'lar oluşturulduktan SONRA
        self.load_products()
    
    def load_products(self):
        """Ürünleri tabloya yükle"""
        # Mevcut verileri temizle
        for item in self.product_tree.get_children():
            self.product_tree.delete(item)
        
        result = Product.get_all(page=1, per_page=500, seller_id=self.current_seller_filter)
        products = result['products']
        
        self.selected_products = set()
        
        for p in products:
            margin = p['profit_margin'] or 50
            shopify_price = self.scraper.calculate_shopify_price(p['trendyol_price'] or 0, margin)
            status = "✅ Shopify'da" if p['is_synced_to_shopify'] else "⏳ Bekliyor"
            
            self.product_tree.insert("", "end", iid=str(p['id']), values=(
                "☐",
                p['id'],
                p['name'][:50] + "..." if len(p['name']) > 50 else p['name'],
                p['brand_name'] or "-",
                f"{p['trendyol_price']:.2f}" if p['trendyol_price'] else "-",
                f"{margin}%",
                f"${shopify_price:.2f}",
                status
            ))
        
        self.product_info_label.configure(text=f"Toplam {result['total']} ürün")
    
    def filter_products(self, choice):
        """Ürünleri filtrele"""
        if choice == "Tüm Satıcılar":
            self.current_seller_filter = None
        else:
            sellers = Seller.get_all()
            for s in sellers:
                if choice == (s['name'] or f"Satıcı #{s['trendyol_seller_id']}"):
                    self.current_seller_filter = s['id']
                    break
        
        self.load_products()
    
    def edit_product_margin(self, event):
        """Ürün marjını düzenle"""
        item = self.product_tree.selection()
        if not item:
            return
        
        product_id = int(item[0])
        product = Product.get_by_id(product_id)
        
        if product:
            dialog = ctk.CTkInputDialog(
                text=f"'{product['name'][:50]}' için kar marjı (%):",
                title="Kar Marjı Düzenle"
            )
            new_margin = dialog.get_input()
            
            if new_margin:
                try:
                    margin = float(new_margin)
                    Product.update_profit_margin(product_id, margin)
                    self.load_products()
                except ValueError:
                    messagebox.showerror("Hata", "Geçersiz marj değeri!")
    
    def apply_bulk_margin(self):
        """Toplu marj uygula"""
        try:
            margin = float(self.bulk_margin_entry.get())
            
            # Tüm ürünlere uygula
            result = Product.get_all(page=1, per_page=10000, seller_id=self.current_seller_filter)
            product_ids = [p['id'] for p in result['products']]
            
            if product_ids:
                Product.bulk_update_margin(product_ids, margin)
                ActivityLog.log('bulk_margin_update', f'{len(product_ids)} ürün marjı güncellendi: %{margin}')
                messagebox.showinfo("Başarılı", f"{len(product_ids)} ürün marjı %{margin} olarak güncellendi!")
                self.load_products()
        except ValueError:
            messagebox.showerror("Hata", "Geçersiz marj değeri!")
    
    def upload_selected_products(self):
        """Seçili ürünleri Shopify'a yükle"""
        # Önce Shopify bağlantısını kontrol et
        shop_name = Settings.get('shopify_shop_name')
        access_token = Settings.get('shopify_access_token')
        
        if not shop_name or not access_token:
            messagebox.showwarning("Uyarı", "Önce Ayarlar'dan Shopify API bilgilerini girin!")
            self.show_settings()
            return
        
        # Tüm bekleyen ürünleri al
        result = Product.get_all(page=1, per_page=10000, seller_id=self.current_seller_filter, synced_only=False)
        products = [p for p in result['products'] if not p['is_synced_to_shopify']]
        
        if not products:
            messagebox.showinfo("Bilgi", "Yüklenecek ürün yok!")
            return
        
        if not messagebox.askyesno("Onay", f"{len(products)} ürün Shopify'a yüklenecek. Devam etmek istiyor musunuz?"):
            return
        
        # Progress dialog
        progress_window = ctk.CTkToplevel(self)
        progress_window.title("Shopify'a Yükleniyor")
        progress_window.geometry("450x180")
        progress_window.transient(self)
        progress_window.grab_set()
        
        ctk.CTkLabel(progress_window, text="Ürünler Shopify'a yükleniyor...", font=ctk.CTkFont(size=14)).pack(pady=20)
        progress = ctk.CTkProgressBar(progress_window, width=350)
        progress.pack(pady=10)
        progress.set(0)
        status_label = ctk.CTkLabel(progress_window, text="Başlatılıyor...", text_color="gray")
        status_label.pack()
        result_label = ctk.CTkLabel(progress_window, text="", font=ctk.CTkFont(size=12))
        result_label.pack(pady=10)
        
        def upload_thread():
            try:
                api = ShopifyAPI(shop_name, access_token)
                uploader = ProductUploader(api)
                
                margin = Settings.get('profit_margin', 50)
                rate = self.scraper.get_currency_rate()
                
                success = 0
                failed = 0
                
                for i, product in enumerate(products):
                    try:
                        result = uploader.upload_product(product, margin, rate)
                        if result:
                            Product.update_shopify_sync(product['id'], result['shopify_id'], result['shopify_price'])
                            success += 1
                        else:
                            failed += 1
                    except Exception as e:
                        failed += 1
                    
                    progress.set((i + 1) / len(products))
                    status_label.configure(text=f"{i+1}/{len(products)} işlendi")
                    result_label.configure(text=f"✅ {success} başarılı | ❌ {failed} başarısız")
                
                ActivityLog.log('bulk_upload', f'{success} ürün Shopify\'a yüklendi, {failed} başarısız')
                
                progress_window.after(2000, progress_window.destroy)
                self.after(2100, self.load_products)
                
            except Exception as e:
                progress_window.destroy()
                messagebox.showerror("Hata", f"Yükleme hatası:\n{str(e)}")
        
        threading.Thread(target=upload_thread, daemon=True).start()
    
    # ============ SİPARİŞLER ============
    
    def show_orders(self):
        """Siparişler sayfasını göster"""
        self.clear_main_frame()
        self.set_active_menu("orders")
        
        # Başlık
        header_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        header_frame.grid(row=0, column=0, sticky="ew", pady=(0, 20))
        header_frame.grid_columnconfigure(0, weight=1)
        
        ctk.CTkLabel(header_frame, text="Sipariş Yönetimi", font=ctk.CTkFont(size=28, weight="bold")).grid(row=0, column=0, sticky="w")
        ctk.CTkButton(header_frame, text="🔄 Siparişleri Senkronize Et", command=self.sync_orders_action).grid(row=0, column=1)
        
        # Durum filtreleri
        filter_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        filter_frame.grid(row=1, column=0, sticky="w", pady=(0, 10))
        
        self.order_status_filter = ctk.CTkSegmentedButton(
            filter_frame,
            values=["Tümü", "Bekliyor", "İşleniyor", "Satın Alındı", "Kargoda"],
            command=self.filter_orders
        )
        self.order_status_filter.set("Tümü")
        self.order_status_filter.pack()
        
        # Sipariş listesi
        self.orders_frame = ctk.CTkScrollableFrame(self.main_frame)
        self.orders_frame.grid(row=2, column=0, sticky="nsew")
        
        self.load_orders()
    
    def load_orders(self, status=None):
        """Siparişleri yükle"""
        # Mevcut içeriği temizle
        for widget in self.orders_frame.winfo_children():
            widget.destroy()
        
        orders = Order.get_all(status=status)
        
        if orders:
            for order in orders:
                order_card = ctk.CTkFrame(self.orders_frame)
                order_card.pack(fill="x", pady=5, padx=5)
                
                # Üst satır - sipariş no ve fiyat
                top_row = ctk.CTkFrame(order_card, fg_color="transparent")
                top_row.pack(fill="x", padx=15, pady=10)
                
                ctk.CTkLabel(top_row, text=f"#{order['shopify_order_number']}", font=ctk.CTkFont(size=16, weight="bold")).pack(side="left")
                
                status_colors = {
                    'pending': ("#f97316", "⏳ Bekliyor"),
                    'processing': ("#3b82f6", "🔄 İşleniyor"),
                    'purchased': ("#22c55e", "✅ Satın Alındı"),
                    'shipped': ("#8b5cf6", "📦 Kargoda"),
                }
                color, status_text = status_colors.get(order['status'], ("#6b7280", order['status']))
                
                ctk.CTkLabel(top_row, text=status_text, text_color=color, font=ctk.CTkFont(size=12, weight="bold")).pack(side="left", padx=20)
                ctk.CTkLabel(top_row, text=f"${order['total_price']:.2f}", font=ctk.CTkFont(size=18, weight="bold"), text_color="#22c55e").pack(side="right")
                
                # Müşteri bilgileri
                info_row = ctk.CTkFrame(order_card, fg_color="transparent")
                info_row.pack(fill="x", padx=15, pady=(0, 10))
                
                ctk.CTkLabel(info_row, text=f"👤 {order['customer_name']}", text_color="gray").pack(side="left", padx=(0, 20))
                ctk.CTkLabel(info_row, text=f"📧 {order['customer_email'] or '-'}", text_color="gray").pack(side="left")
                
                # Butonlar
                if order['status'] == 'pending':
                    ctk.CTkButton(
                        info_row, 
                        text="▶️ İşle", 
                        width=80,
                        command=lambda o=order: self.process_order(o['id'])
                    ).pack(side="right")
        else:
            ctk.CTkLabel(
                self.orders_frame, 
                text="Sipariş bulunamadı\n\nShopify siparişlerinizi senkronize etmek için\nyukarıdaki butona tıklayın",
                font=ctk.CTkFont(size=14),
                text_color="gray"
            ).pack(pady=50)
    
    def filter_orders(self, choice):
        """Siparişleri filtrele"""
        status_map = {
            "Tümü": None,
            "Bekliyor": "pending",
            "İşleniyor": "processing",
            "Satın Alındı": "purchased",
            "Kargoda": "shipped"
        }
        self.load_orders(status=status_map.get(choice))
    
    def process_order(self, order_id):
        """Siparişi işle"""
        if not messagebox.askyesno("Onay", "Bu siparişi Trendyol'dan satın almak istiyor musunuz?\n\nNot: Bu özellik tarayıcı otomasyonu gerektirir."):
            return
        
        Order.update_status(order_id, 'processing', 'Manuel işlem başlatıldı')
        ActivityLog.log('order_processing', f'Sipariş işleniyor: {order_id}')
        messagebox.showinfo("Bilgi", "Sipariş durumu 'İşleniyor' olarak güncellendi.\n\nTrendyol otomatik satın alma için sipariş detaylarını kontrol edin.")
        self.load_orders()
    
    # ============ AYARLAR ============
    
    def show_settings(self):
        """Ayarlar sayfasını göster"""
        self.clear_main_frame()
        self.set_active_menu("settings")
        
        # Başlık
        ctk.CTkLabel(self.main_frame, text="Sistem Ayarları", font=ctk.CTkFont(size=28, weight="bold")).grid(row=0, column=0, sticky="w", pady=(0, 20))
        
        # Ayarlar scroll frame
        settings_scroll = ctk.CTkScrollableFrame(self.main_frame)
        settings_scroll.grid(row=1, column=0, sticky="nsew")
        settings_scroll.grid_columnconfigure(0, weight=1)
        
        # Shopify API Ayarları
        shopify_frame = ctk.CTkFrame(settings_scroll)
        shopify_frame.pack(fill="x", pady=10, padx=5)
        
        ctk.CTkLabel(shopify_frame, text="🛒 Shopify API Ayarları", font=ctk.CTkFont(size=18, weight="bold")).pack(anchor="w", padx=20, pady=15)
        
        form_frame = ctk.CTkFrame(shopify_frame, fg_color="transparent")
        form_frame.pack(fill="x", padx=20, pady=(0, 15))
        
        ctk.CTkLabel(form_frame, text="Mağaza Adı:").grid(row=0, column=0, sticky="w", pady=5)
        self.shopify_shop_entry = ctk.CTkEntry(form_frame, width=400, placeholder_text="ornek.myshopify.com")
        self.shopify_shop_entry.grid(row=0, column=1, pady=5, padx=10)
        
        ctk.CTkLabel(form_frame, text="Access Token:").grid(row=1, column=0, sticky="w", pady=5)
        self.shopify_token_entry = ctk.CTkEntry(form_frame, width=400, placeholder_text="shpat_xxxxx", show="*")
        self.shopify_token_entry.grid(row=1, column=1, pady=5, padx=10)
        
        ctk.CTkButton(form_frame, text="🔌 Bağlantıyı Test Et", command=self.test_shopify_connection).grid(row=2, column=1, pady=10, sticky="w", padx=10)
        
        # Fiyatlandırma Ayarları
        pricing_frame = ctk.CTkFrame(settings_scroll)
        pricing_frame.pack(fill="x", pady=10, padx=5)
        
        ctk.CTkLabel(pricing_frame, text="💰 Fiyatlandırma Ayarları", font=ctk.CTkFont(size=18, weight="bold")).pack(anchor="w", padx=20, pady=15)
        
        price_form = ctk.CTkFrame(pricing_frame, fg_color="transparent")
        price_form.pack(fill="x", padx=20, pady=(0, 15))
        
        ctk.CTkLabel(price_form, text="Varsayılan Kar Marjı (%):").grid(row=0, column=0, sticky="w", pady=5)
        self.margin_entry = ctk.CTkEntry(price_form, width=100)
        self.margin_entry.grid(row=0, column=1, pady=5, padx=10, sticky="w")
        
        ctk.CTkLabel(price_form, text="Kur Tamponu (%):").grid(row=1, column=0, sticky="w", pady=5)
        self.buffer_entry = ctk.CTkEntry(price_form, width=100)
        self.buffer_entry.grid(row=1, column=1, pady=5, padx=10, sticky="w")
        
        # Trendyol Ayarları
        trendyol_frame = ctk.CTkFrame(settings_scroll)
        trendyol_frame.pack(fill="x", pady=10, padx=5)
        
        ctk.CTkLabel(trendyol_frame, text="🏪 Trendyol Hesap Ayarları (Opsiyonel)", font=ctk.CTkFont(size=18, weight="bold")).pack(anchor="w", padx=20, pady=15)
        
        ctk.CTkLabel(trendyol_frame, text="⚠️ Otomatik satın alma için gereklidir", text_color="#f97316", font=ctk.CTkFont(size=12)).pack(anchor="w", padx=20)
        
        trendyol_form = ctk.CTkFrame(trendyol_frame, fg_color="transparent")
        trendyol_form.pack(fill="x", padx=20, pady=(10, 15))
        
        ctk.CTkLabel(trendyol_form, text="E-posta:").grid(row=0, column=0, sticky="w", pady=5)
        self.trendyol_email_entry = ctk.CTkEntry(trendyol_form, width=300)
        self.trendyol_email_entry.grid(row=0, column=1, pady=5, padx=10)
        
        ctk.CTkLabel(trendyol_form, text="Şifre:").grid(row=1, column=0, sticky="w", pady=5)
        self.trendyol_pass_entry = ctk.CTkEntry(trendyol_form, width=300, show="*")
        self.trendyol_pass_entry.grid(row=1, column=1, pady=5, padx=10)
        
        # Stok Senkronizasyon Ayarları
        stock_frame = ctk.CTkFrame(settings_scroll)
        stock_frame.pack(fill="x", pady=10, padx=5)
        
        ctk.CTkLabel(stock_frame, text="📊 Canlı Stok Takibi", font=ctk.CTkFont(size=18, weight="bold")).pack(anchor="w", padx=20, pady=15)
        
        stock_form = ctk.CTkFrame(stock_frame, fg_color="transparent")
        stock_form.pack(fill="x", padx=20, pady=(0, 15))
        
        ctk.CTkLabel(stock_form, text="Senkronizasyon Aralığı (dakika):").grid(row=0, column=0, sticky="w", pady=5)
        self.sync_interval_entry = ctk.CTkEntry(stock_form, width=100)
        self.sync_interval_entry.grid(row=0, column=1, pady=5, padx=10, sticky="w")
        self.sync_interval_entry.insert(0, str(Settings.get('stock_sync_interval', 30)))
        
        # Otomatik senkronizasyon switch
        self.auto_sync_var = ctk.BooleanVar(value=Settings.get('auto_stock_sync', False))
        self.auto_sync_switch = ctk.CTkSwitch(
            stock_form, 
            text="Otomatik Stok Senkronizasyonu",
            variable=self.auto_sync_var,
            command=self.toggle_auto_sync
        )
        self.auto_sync_switch.grid(row=1, column=0, columnspan=2, pady=10, sticky="w")
        
        # Fiyat otomatik güncelleme switch
        self.auto_price_var = ctk.BooleanVar(value=Settings.get('auto_price_update', True))
        self.auto_price_switch = ctk.CTkSwitch(
            stock_form, 
            text="Fiyat Değişikliğinde Shopify'ı Güncelle",
            variable=self.auto_price_var,
            command=self.toggle_auto_price
        )
        self.auto_price_switch.grid(row=2, column=0, columnspan=2, pady=5, sticky="w")
        
        # Stokta yoksa gizle switch
        self.hide_out_of_stock_var = ctk.BooleanVar(value=Settings.get('hide_out_of_stock', True))
        self.hide_out_of_stock_switch = ctk.CTkSwitch(
            stock_form, 
            text="Stokta Yoksa Shopify'da Gizle",
            variable=self.hide_out_of_stock_var,
            command=self.toggle_hide_out_of_stock
        )
        self.hide_out_of_stock_switch.grid(row=3, column=0, columnspan=2, pady=5, sticky="w")
        
        # Stok senkronizasyon butonları
        sync_buttons = ctk.CTkFrame(stock_form, fg_color="transparent")
        sync_buttons.grid(row=4, column=0, columnspan=2, pady=10, sticky="w")
        
        ctk.CTkButton(
            sync_buttons, 
            text="🔄 Şimdi Senkronize Et", 
            command=self.manual_stock_sync,
            fg_color="#059669",
            hover_color="#047857"
        ).pack(side="left", padx=(0, 10))
        
        self.sync_status_label = ctk.CTkLabel(sync_buttons, text="", font=ctk.CTkFont(size=12))
        self.sync_status_label.pack(side="left")
        
        # Son senkronizasyon bilgisi
        last_sync = Settings.get('last_stock_sync', 'Hiç yapılmadı')
        ctk.CTkLabel(
            stock_form, 
            text=f"Son senkronizasyon: {last_sync}", 
            font=ctk.CTkFont(size=11),
            text_color="gray"
        ).grid(row=5, column=0, columnspan=2, pady=5, sticky="w")
        
        # Mevcut ayarları yükle
        self.load_settings()
        
        # Kaydet butonu
        ctk.CTkButton(
            settings_scroll, 
            text="💾 Ayarları Kaydet", 
            font=ctk.CTkFont(size=16),
            height=50,
            command=self.save_settings
        ).pack(pady=20)
    
    def load_settings(self):
        """Mevcut ayarları yükle"""
        self.shopify_shop_entry.delete(0, "end")
        self.shopify_shop_entry.insert(0, Settings.get('shopify_shop_name', ''))
        
        self.shopify_token_entry.delete(0, "end")
        self.shopify_token_entry.insert(0, Settings.get('shopify_access_token', ''))
        
        self.margin_entry.delete(0, "end")
        self.margin_entry.insert(0, str(Settings.get('profit_margin', 50)))
        
        self.buffer_entry.delete(0, "end")
        self.buffer_entry.insert(0, str(Settings.get('currency_buffer', 5)))
        
        self.trendyol_email_entry.delete(0, "end")
        self.trendyol_email_entry.insert(0, Settings.get('trendyol_email', ''))
    
    def save_settings(self):
        """Ayarları kaydet"""
        Settings.set('shopify_shop_name', self.shopify_shop_entry.get())
        Settings.set('shopify_access_token', self.shopify_token_entry.get())
        
        try:
            Settings.set('profit_margin', float(self.margin_entry.get()))
        except:
            pass
        
        try:
            Settings.set('currency_buffer', float(self.buffer_entry.get()))
        except:
            pass
        
        Settings.set('trendyol_email', self.trendyol_email_entry.get())
        
        if self.trendyol_pass_entry.get():
            Settings.set('trendyol_password', self.trendyol_pass_entry.get())
        
        ActivityLog.log('settings_updated', 'Ayarlar güncellendi')
        messagebox.showinfo("Başarılı", "Ayarlar kaydedildi!")
    
    def test_shopify_connection(self):
        """Shopify bağlantısını test et"""
        shop_name = self.shopify_shop_entry.get()
        token = self.shopify_token_entry.get()
        
        if not shop_name or not token:
            messagebox.showwarning("Uyarı", "Mağaza adı ve token gerekli!")
            return
        
        try:
            api = ShopifyAPI(shop_name, token)
            result = api.test_connection()
            
            if result['success']:
                shop_info = result.get('shop', {})
                messagebox.showinfo("Başarılı", f"Bağlantı başarılı!\n\nMağaza: {shop_info.get('name', 'Bilinmiyor')}")
            else:
                messagebox.showerror("Hata", f"Bağlantı başarısız:\n{result.get('error', 'Bilinmeyen hata')}")
        except Exception as e:
            messagebox.showerror("Hata", f"Bağlantı hatası:\n{str(e)}")
    
    def toggle_auto_sync(self):
        """Otomatik stok senkronizasyonunu aç/kapat"""
        sync_manager = get_stock_sync_manager()
        
        if self.auto_sync_var.get():
            # Aralığı kaydet
            try:
                interval = int(self.sync_interval_entry.get())
                sync_manager.set_sync_interval(interval)
            except:
                pass
            
            sync_manager.start_auto_sync()
            Settings.set('auto_stock_sync', True)
            self.sync_status_label.configure(text="✅ Otomatik senkronizasyon aktif", text_color="#10b981")
        else:
            sync_manager.stop_auto_sync()
            Settings.set('auto_stock_sync', False)
            self.sync_status_label.configure(text="⏹️ Otomatik senkronizasyon durduruldu", text_color="gray")
    
    def toggle_auto_price(self):
        """Fiyat otomatik güncelleme ayarını değiştir"""
        Settings.set('auto_price_update', self.auto_price_var.get())
        if self.auto_price_var.get():
            messagebox.showinfo("Bilgi", "Fiyat değişikliklerinde Shopify otomatik güncellenecek.")
        else:
            messagebox.showinfo("Bilgi", "Fiyat değişiklikleri sadece veritabanına kaydedilecek, Shopify güncellenmeyecek.")
    
    def toggle_hide_out_of_stock(self):
        """Stokta yoksa gizle ayarını değiştir"""
        Settings.set('hide_out_of_stock', self.hide_out_of_stock_var.get())
        if self.hide_out_of_stock_var.get():
            messagebox.showinfo("Bilgi", "Stokta olmayan ürünler Shopify'da otomatik gizlenecek.")
        else:
            messagebox.showinfo("Bilgi", "Stokta olmayan ürünler Shopify'da gizlenmeyecek.")
    
    def manual_stock_sync(self):
        """Manuel stok senkronizasyonu başlat"""
        self.sync_status_label.configure(text="🔄 Senkronizasyon başlatılıyor...", text_color="#f59e0b")
        
        def run_sync():
            sync_manager = get_stock_sync_manager()
            
            def update_progress(current, total, product_name):
                self.after(0, lambda: self.sync_status_label.configure(
                    text=f"🔄 [{current}/{total}] {product_name[:30]}..."
                ))
            
            results = sync_manager.sync_all_products(progress_callback=update_progress)
            
            # Sonucu göster
            self.after(0, lambda: self._show_sync_results(results))
        
        threading.Thread(target=run_sync, daemon=True).start()
    
    def _show_sync_results(self, results):
        """Senkronizasyon sonuçlarını göster"""
        Settings.set('last_stock_sync', datetime.now().strftime("%Y-%m-%d %H:%M"))
        
        if results.get('total_checked', 0) == 0:
            self.sync_status_label.configure(text="⚠️ Senkronize edilmiş ürün yok", text_color="#f59e0b")
            return
        
        out_of_stock = results.get('out_of_stock', 0)
        price_changes = results.get('price_changes', 0)
        
        if out_of_stock > 0 or price_changes > 0:
            self.sync_status_label.configure(
                text=f"✅ Tamamlandı: {out_of_stock} stokta yok, {price_changes} fiyat değişimi", 
                text_color="#10b981"
            )
        else:
            self.sync_status_label.configure(
                text=f"✅ Tamamlandı: {results.get('total_checked', 0)} ürün kontrol edildi", 
                text_color="#10b981"
            )
        
        # Detaylı bilgi için log
        if results.get('details'):
            details = "\n".join([f"• {d['product']}: {d['action']}" for d in results['details'][:10]])
            if len(results['details']) > 10:
                details += f"\n... ve {len(results['details']) - 10} değişiklik daha"
            messagebox.showinfo("Stok Senkronizasyonu", f"Senkronizasyon tamamlandı!\n\n{details}")


def main():
    """Uygulamayı başlat"""
    app = DropshipApp()
    app.mainloop()


if __name__ == "__main__":
    main()
